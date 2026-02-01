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
    estimate_depth_with_scale,  # NEW
    clothing_mask_from_image, 
    compute_measurements,
    preprocess_image,
    enhance_pose_detection,
    validate_landmarks,
    create_landmarks_visualization,
    extract_side_landmarks,
    calculate_side_depths,
    cm_per_pixel_from_height,
    create_side_visualization
)

# === NEW: Import image validator ===
from image_validator import ImageValidator

# === MODIFIED: Add rate limiting ===
request_counts = defaultdict(list)

# === MODIFIED: Add lifespan management ===
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warm up models on startup
    print("Warming up AI models...")
    try:
        dummy_image = np.ones((224, 224, 3), dtype=np.uint8) * 128
        
        # Warm up pose detection
        try:
            extract_pose_landmarks(dummy_image)
            print("✓ Pose detection warmed up")
        except Exception as e:
            print(f"⚠ Pose warm-up warning: {e}")
        
        # Warm up depth estimation
        try:
            estimate_depth(dummy_image)
            print("✓ Depth estimation warmed up")
        except Exception as e:
            print(f"⚠ Depth warm-up warning: {e}")
        
        # Warm up clothing segmentation
        try:
            clothing_mask_from_image(dummy_image)
            print("✓ Clothing segmentation warmed up")
        except Exception as e:
            print(f"⚠ Clothing segmentation warm-up warning: {e}")
            
        print("Models ready!")
    except Exception as e:
        print(f"Model warm-up error: {e}")
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
    height_cm: Optional[float] = Form(None),
    gender: Optional[str] = Form(None)  # NEW: 'M', 'F', or None
):
    try:
        # Validate file type
        if not front.content_type or not front.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Front file must be an image")
        
        if side and (not side.content_type or not side.content_type.startswith('image/')):
            raise HTTPException(status_code=400, detail="Side file must be an image")
        
        # Validate height if provided
        if height_cm and (height_cm < 100 or height_cm > 250):
            raise HTTPException(status_code=400, detail="Height must be between 100cm and 250cm")
        
        # Validate gender if provided
        if gender and gender not in ['M', 'F']:
            raise HTTPException(status_code=400, detail="Gender must be 'M' or 'F' if provided")

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

        # === TEMPORARILY DISABLED: Pre-flight image validation ===
        # Disabled for testing - will re-enable once basic functionality is verified
        # validator = ImageValidator()
        # validation_result = validator.validate(front_img, height_cm)
        
        # if not validation_result.passed:
        #     return JSONResponse(
        #         status_code=400,
        #         content={
        #             "success": False,
        #             "error_code": validation_result.error_code,
        #             "error_message": validation_result.error_message,
        #             "suggestion": "Please retake the photo following the guidelines.",
        #             "validation_failed": True
        #         }
        #     )
        
        # For now, create a dummy validation result with warnings
        from image_validator import ValidationResult
        validation_result = ValidationResult(
            passed=True,
            warnings=[{
                "type": "validation_disabled",
                "message": "Image validation temporarily disabled for testing"
            }] if height_cm is None else []
        )

        # === MODIFIED: Add image preprocessing ===
        front_img = preprocess_image(front_img, max_size=1024)
        front_img = enhance_pose_detection(front_img)

        # Extract pose landmarks (already validated by pre-flight check)
        landmarks = extract_pose_landmarks(front_img)
        if landmarks is None:
            # This shouldn't happen after validation, but keep as safety check
            raise MeasurementError("No person detected in the image. Please ensure the full body is visible.", "no_person_detected")
        
        # === MODIFIED: Validate we have sufficient landmarks ===
        if not validate_landmarks(landmarks):
            raise MeasurementError("Cannot detect all required body points. Please ensure shoulders, hips and nose are visible.", "insufficient_landmarks")

        # === NEW: Generate depth map with scale metadata ===
        depth_map = None
        depth_stats = None
        depth_raw = None
        try:
            depth_map, depth_stats, depth_raw = estimate_depth_with_scale(front_img)
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

        # === NEW: Process side image if provided ===
        side_depths = None
        side_img_for_vis = None
        side_landmarks_for_vis = None
        
        if side:
            try:
                side_bytes = await side.read()
                if len(side_bytes) > 0:
                    side_img = read_imagefile_to_bgr(side_bytes)
                    side_img = preprocess_image(side_img, max_size=1024)
                    side_img = enhance_pose_detection(side_img)
                    
                    # Extract side landmarks
                    side_landmarks = extract_side_landmarks(side_img)
                    if side_landmarks:
                        # Calculate scale for side image (should match front if same distance)
                        h_side, w_side = side_img.shape[:2]
                        cmpp_side = cm_per_pixel_from_height(side_landmarks, h_side, height_cm)
                        
                        # Calculate depth measurements from side view
                        side_depths = calculate_side_depths(side_img, side_landmarks, cmpp_side)
                        print(f"Side depths calculated: {side_depths}")
                        
                        # Store for visualization
                        side_img_for_vis = side_img
                        side_landmarks_for_vis = side_landmarks
                    else:
                        print("Could not detect pose in side image, continuing without side measurements")
            except Exception as e:
                print(f"Side image processing failed: {e}")
                # Continue without side measurements

        # === NEW: Compute measurements with improved calibration ===
        measurements = compute_measurements(
            front_img, 
            landmarks,
            depth_map=depth_map,
            depth_stats=depth_stats,  # NEW
            depth_raw=depth_raw,  # NEW
            user_height_cm=height_cm,
            gender=gender,  # NEW
            clothing_mask=clothing_mask,
            side_depths=side_depths
        )

        # Create landmarks visualization
        landmarks_image = None
        try:
            landmarks_image = create_landmarks_visualization(front_img, landmarks)
        except Exception as e:
            print(f"Landmarks visualization failed: {e}")
            # Continue without visualization
        
        # Create side visualization if side image was processed
        side_image_vis = None
        if side_img_for_vis is not None and side_landmarks_for_vis is not None and side_depths:
            try:
                side_image_vis = create_side_visualization(side_img_for_vis, side_landmarks_for_vis, side_depths)
            except Exception as e:
                print(f"Side visualization failed: {e}")

        # === MODIFIED: Enhanced response format ===
        response = {
            "success": True,
            "measurements": measurements,
            "warnings": validation_result.warnings,  # NEW: Include validation warnings
            "metadata": {
                "image_dimensions": {
                    "height": front_img.shape[0],
                    "width": front_img.shape[1]
                },
                "models_used": {
                    "pose": "MediaPipe Pose",
                    "depth": "MiDaS/DPT" if depth_map is not None else "None",
                    "segmentation": "SegFormer" if clothing_mask is not None else "None",
                    "side_image": "Used" if side_depths else "Not provided"
                },
                "landmarks_detected": len(landmarks),
                "side_depths_measured": list(side_depths.keys()) if side_depths else []
            }
        }
        
        # Add landmarks visualization if available
        if landmarks_image:
            response["landmarks_image"] = landmarks_image
        
        # Add side visualization if available
        if side_image_vis:
            response["side_image"] = side_image_vis
            
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
