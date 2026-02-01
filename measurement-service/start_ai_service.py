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
    
    try:
        # Import and load models (suppress verbose output)
        import warnings
        warnings.filterwarnings('ignore')
        
        import mediapipe as mp
        import torch
        from measurement_utils import load_midas, load_segformer
        
        print("📦 Loading AI models...")
        midas_model, midas_transform = load_midas()
        seg_processor, seg_model = load_segformer("mattmdjaga/segformer_b2_clothes")
        
        print("✅ Models loaded successfully!")
        print("🌐 Server running on http://localhost:8001")
        print("   (Press Ctrl+C to stop)\n")
        
        # Start the FastAPI app with minimal logging
        import uvicorn
        from app import app
        
        uvicorn.run(app, host="0.0.0.0", port=8001, log_level="warning")
        
    except Exception as e:
        print(f"❌ Error starting AI service: {e}")
        print("💡 Try running: pip install -r requirements.txt")
        sys.exit(1)

if __name__ == "__main__":
    main()
