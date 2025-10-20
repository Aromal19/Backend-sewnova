#!/usr/bin/env python3
"""
Startup script for the full AI measurement service
Handles model loading with proper error handling
"""
import sys
import os
import time

def main():
    print("🤖 Starting AI Measurement Service...")
    print("📦 Loading AI models (this may take a few minutes)...")
    
    try:
        # Import and load models
        print("   • Loading MediaPipe...")
        import mediapipe as mp
        print("   ✓ MediaPipe loaded")
        
        print("   • Loading MiDaS depth model...")
        import torch
        from measurement_utils import load_midas
        midas_model, midas_transform = load_midas()
        print("   ✓ MiDaS model loaded")
        
        print("   • Loading SegFormer...")
        from measurement_utils import load_segformer
        seg_processor, seg_model = load_segformer("mattmdjaga/segformer_b2_clothes")
        print("   ✓ SegFormer loaded")
        
        print("🚀 All models loaded successfully!")
        print("🌐 Starting FastAPI server...")
        
        # Start the FastAPI app
        import uvicorn
        from app import app
        
        uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")
        
    except Exception as e:
        print(f"❌ Error starting AI service: {e}")
        print("💡 Try running: pip install -r requirements.txt")
        sys.exit(1)

if __name__ == "__main__":
    main()
