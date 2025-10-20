# 🤖 Full AI Measurement Service Setup

This guide will help you set up the complete AI-powered measurement service that can analyze images and calculate real body measurements.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend/measurement-service
pip install -r requirements.txt
```

### 2. Start the AI Service
```bash
python start_ai_service.py
```

The service will:
- Load MediaPipe for pose detection
- Load MiDaS for depth estimation  
- Load SegFormer for clothing segmentation
- Start FastAPI server on port 8001

## 🧠 AI Models Used

### 1. **MediaPipe Pose** 
- Detects 33 body landmarks
- Provides pose estimation for measurement calculations
- Works with front-view images

### 2. **MiDaS Depth Estimation**
- Intel's MiDaS model for monocular depth estimation
- Helps calculate 3D measurements from 2D images
- Improves circumference calculations

### 3. **SegFormer Clothing Segmentation**
- Identifies clothing regions in images
- Helps with more accurate body edge detection
- Improves measurement precision

## 📏 Measurements Generated

The AI service calculates these measurements:

- **Chest** - Circumference at chest level
- **Waist** - Circumference at waist level  
- **Hip** - Circumference at hip level
- **Shoulder** - Width between shoulders
- **Sleeve Length** - From shoulder to wrist
- **Shirt Length** - From shoulder to hip
- **Trouser Length** - From hip to ankle
- **Neck** - Neck circumference
- **Thigh** - Thigh circumference

## 🔧 API Endpoints

### Health Check
```bash
GET http://localhost:8001/health
```

### Process Measurements
```bash
POST http://localhost:8001/measure
Content-Type: multipart/form-data

Parameters:
- front: image file (required)
- side: image file (optional) 
- height_cm: float (optional, for calibration)
```

## 🎯 How It Works

1. **Image Upload** - User uploads front-view photo
2. **Pose Detection** - MediaPipe detects body landmarks
3. **Depth Estimation** - MiDaS creates depth map
4. **Clothing Segmentation** - SegFormer identifies clothing regions
5. **Measurement Calculation** - AI calculates measurements using:
   - Pose landmarks for body structure
   - Depth map for 3D perspective
   - User height for scale calibration
   - Clothing mask for edge detection

## ⚡ Performance Notes

- **First startup**: 2-3 minutes (model loading)
- **Subsequent requests**: 5-10 seconds per image
- **Memory usage**: ~2-4GB RAM
- **GPU acceleration**: Automatic if CUDA available

## 🐛 Troubleshooting

### Service Won't Start
```bash
# Check if port 8001 is free
netstat -ano | findstr :8001

# Kill any existing processes
taskkill /F /IM python.exe
```

### Model Loading Errors
```bash
# Reinstall dependencies
pip install --upgrade -r requirements.txt

# Clear model cache
rm -rf ~/.cache/torch/hub/
```

### Memory Issues
- Close other applications
- Use smaller models by setting environment variables:
```bash
export MIDAS_MODEL_TYPE="MiDaS_small"
export SEGFORMER_MODEL_NAME="nvidia/segformer-b0-finetuned-ade-512-512"
```

## 🔄 Frontend Integration

The service works with your existing frontend:

1. **Frontend calls**: `POST /measure` endpoint
2. **Parameters**: `front` (image), `height_cm` (optional)
3. **Response**: Real AI measurements in cm
4. **Display**: Measurements show in the UI

## 📊 Example Response

```json
{
  "measurements": {
    "chest": 95.2,
    "waist": 82.1,
    "hip": 98.5,
    "shoulder": 45.8,
    "sleeveLength": 62.3,
    "shirtLength": 68.7,
    "trouserLength": 102.1,
    "neck": 38.9,
    "thigh": 58.2
  },
  "notes": {
    "models": {
      "pose": "MediaPipe Pose",
      "depth": "MiDaS/DPT (torch.hub)",
      "segmentation": "SegFormer (optional)"
    }
  }
}
```

## 🎉 Success!

Your AI measurement service is now ready to provide real, accurate body measurements from photos! 🚀
