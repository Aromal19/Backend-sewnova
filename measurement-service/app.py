#!/usr/bin/env python3
"""
Full AI-powered FastAPI measurement service
Uses MediaPipe, MiDaS, and SegFormer for accurate body measurements
"""
import uvicorn
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import numpy as np
import cv2
from typing import Optional
import time
from collections import defaultdict
from contextlib import asynccontextmanager

from measurement_utils import (
    extract_pose_landmarks, 
    estimate_depth, 
    clothing_mask_from_image, 
    compute_measurements,
    preprocess_image,
    enhance_pose_detection,
    validate_landmarks,
    create_landmarks_visualization
)

# === MODIFIED: Add rate limiting ===
request_counts = defaultdict(list)

# === MODIFIED: Add lifespan management ===
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warm up models on startup
    print("Warming up AI models...")
    try:
        dummy_image = np.ones((224, 224, 3), dtype=np.uint8) * 128
        extract_pose_landmarks(dummy_image)
        estimate_depth(dummy_image)
        clothing_mask_from_image(dummy_image)
        print("Models warmed up successfully!")
    except Exception as e:
        print(f"Model warm-up warning: {e}")
    yield
    # Cleanup would go here if needed

app = FastAPI(title="Measurement Service", lifespan=lifespan)

# === MODIFIED: Enhanced CORS settings ===
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === MODIFIED: Add rate limiting middleware ===
@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host
    current_time = time.time()
    
    # Clear old requests (last minute)
    request_counts[client_ip] = [t for t in request_counts[client_ip] 
                               if current_time - t < 60]
    
    # Check rate limit (20 requests per minute)
    if len(request_counts[client_ip]) >= 20:
        return JSONResponse(
            status_code=429,
            content={"detail": "Rate limit exceeded: max 20 requests per minute"}
        )
    
    request_counts[client_ip].append(current_time)
    response = await call_next(request)
    return response

class MeasurementError(Exception):
    def __init__(self, message: str, error_type: str = "processing_error"):
        self.message = message
        self.error_type = error_type
        super().__init__(self.message)

# === MODIFIED: Add custom exception handler ===
@app.exception_handler(MeasurementError)
async def measurement_error_handler(request, exc: MeasurementError):
    return JSONResponse(
        status_code=400,
        content={
            "error": exc.error_type,
            "message": exc.message,
            "success": False
        }
    )

@app.get("/")
async def root():
    return {"message": "AI Measurement Service", "status": "active"}

@app.get("/health")
async def health():
    return {"status": "ok", "service": "measurement-service"}

def read_imagefile_to_bgr(data: bytes) -> np.ndarray:
    """Read image file and convert to BGR format with validation"""
    try:
        arr = np.frombuffer(data, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Invalid image data")
        return img
    except Exception as e:
        raise ValueError(f"Could not decode image: {str(e)}")

# === MODIFIED: Enhanced measure endpoint with better validation ===
@app.post("/measure")
async def measure(
    front: UploadFile = File(...),
    side: Optional[UploadFile] = File(None),
    height_cm: Optional[float] = Form(None)
):
    try:
        # Validate file type
        if not front.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Front file must be an image")
        
        if side and not side.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Side file must be an image")
        
        # Validate height if provided
        if height_cm and (height_cm < 100 or height_cm > 250):
            raise HTTPException(status_code=400, detail="Height must be between 100cm and 250cm")

        # Read and validate front image
        front_bytes = await front.read()
        if len(front_bytes) == 0:
            raise HTTPException(status_code=400, detail="Front image is empty")
        
        if len(front_bytes) > 10 * 1024 * 1024:  # 10MB limit
            raise HTTPException(status_code=400, detail="Front image too large (max 10MB)")

        try:
            front_img = read_imagefile_to_bgr(front_bytes)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not decode front image: {str(e)}")

        # === MODIFIED: Add image preprocessing ===
        front_img = preprocess_image(front_img, max_size=1024)
        front_img = enhance_pose_detection(front_img)

        # Extract pose landmarks
        landmarks = extract_pose_landmarks(front_img)
        if landmarks is None:
            raise MeasurementError("No person detected in the image. Please ensure the full body is visible.", "no_person_detected")
        
        # === MODIFIED: Validate we have sufficient landmarks ===
        if not validate_landmarks(landmarks):
            raise MeasurementError("Cannot detect all required body points. Please ensure shoulders, hips and nose are visible.", "insufficient_landmarks")

        # Generate depth map with error handling
        depth_map = None
        try:
            depth_map = estimate_depth(front_img)
        except Exception as e:
            print(f"Depth estimation failed: {e}")
            # Continue without depth map

        # Generate clothing mask (optional) with error handling
        clothing_mask = None
        try:
            clothing_mask = clothing_mask_from_image(front_img)
        except Exception as e:
            print(f"Clothing segmentation failed: {e}")
            # Continue without clothing mask

        # Compute real AI measurements
        measurements = compute_measurements(
            front_img, 
            landmarks, 
            depth_map=depth_map, 
            user_height_cm=height_cm, 
            clothing_mask=clothing_mask
        )

        # Create landmarks visualization
        landmarks_image = None
        try:
            landmarks_image = create_landmarks_visualization(front_img, landmarks)
        except Exception as e:
            print(f"Landmarks visualization failed: {e}")
            # Continue without visualization

        # === MODIFIED: Enhanced response format ===
        response = {
            "success": True,
            "measurements": measurements,
            "metadata": {
                "image_dimensions": {
                    "height": front_img.shape[0],
                    "width": front_img.shape[1]
                },
                "models_used": {
                    "pose": "MediaPipe Pose",
                    "depth": "MiDaS/DPT" if depth_map is not None else "None",
                    "segmentation": "SegFormer" if clothing_mask is not None else "None"
                },
                "landmarks_detected": len(landmarks)
            }
        }
        
        # Add landmarks visualization if available
        if landmarks_image:
            response["landmarks_image"] = landmarks_image
        return response
        
    except HTTPException:
        raise
    except MeasurementError as e:
        raise e
    except Exception as e:
        print(f"Unexpected error in measure endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# === MODIFIED: Add additional endpoints ===
@app.post("/validate-pose")
async def validate_pose(image: UploadFile = File(...)):
    """Endpoint to check if pose can be detected without full measurement"""
    try:
        image_bytes = await image.read()
        img = read_imagefile_to_bgr(image_bytes)
        img = preprocess_image(img)
        
        landmarks = extract_pose_landmarks(img)
        if landmarks is None:
            return {"valid": False, "message": "No pose detected"}
        
        is_valid = validate_landmarks(landmarks)
        return {
            "valid": is_valid,
            "landmarks_count": len(landmarks),
            "message": "Pose detected successfully" if is_valid else "Insufficient landmarks"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8001, reload=True)
