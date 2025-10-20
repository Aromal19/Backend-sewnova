#!/usr/bin/env python3
"""
Simplified AI measurement service with better error handling
"""
import uvicorn
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import cv2
from typing import Optional
import traceback

app = FastAPI(title="Measurement Service")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "measurement-service"}

def read_imagefile_to_bgr(data: bytes):
    arr = np.frombuffer(data, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Invalid image data")
    return img

def extract_basic_measurements(image_bgr: np.ndarray, height_cm: Optional[float] = None):
    """Extract basic measurements using simple computer vision"""
    h, w = image_bgr.shape[:2]
    
    # Simple fallback measurements based on image dimensions
    # These are rough estimates - in a real app you'd use AI models
    
    # Estimate cm per pixel (rough approximation)
    if height_cm:
        cm_per_pixel = height_cm / h
    else:
        cm_per_pixel = 0.5  # Default fallback
    
    # Basic measurements (these are mock values for demonstration)
    measurements = {
        "chest": round(90 * cm_per_pixel, 2),
        "waist": round(80 * cm_per_pixel, 2), 
        "hip": round(95 * cm_per_pixel, 2),
        "shoulder": round(45 * cm_per_pixel, 2),
        "sleeveLength": round(60 * cm_per_pixel, 2),
        "shirtLength": round(70 * cm_per_pixel, 2),
        "trouserLength": round(100 * cm_per_pixel, 2),
        "neck": round(35 * cm_per_pixel, 2),
        "thigh": round(55 * cm_per_pixel, 2)
    }
    
    return measurements

@app.post("/measure")
async def measure(
    front: UploadFile = File(...),
    side: Optional[UploadFile] = File(None),
    height_cm: Optional[float] = Form(None)
):
    try:
        print(f"Processing measurement request with height: {height_cm}")
        
        # Read front image
        front_bytes = await front.read()
        try:
            front_img = read_imagefile_to_bgr(front_bytes)
            print(f"Image loaded successfully: {front_img.shape}")
        except Exception as e:
            print(f"Image decode error: {e}")
            raise HTTPException(status_code=400, detail="Could not decode front image")

        # Extract basic measurements
        measurements = extract_basic_measurements(front_img, height_cm)
        
        print(f"Generated measurements: {measurements}")

        response = {
            "measurements": measurements,
            "notes": {
                "models": {
                    "pose": "Basic CV (fallback)",
                    "depth": "Not available",
                    "segmentation": "Not available"
                },
                "message": "Using simplified measurements. For full AI, ensure all models are loaded."
            }
        }
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

if __name__ == "__main__":
    print("🚀 Starting Simplified AI Measurement Service...")
    uvicorn.run("simple_ai_app:app", host="0.0.0.0", port=8001, reload=True)
