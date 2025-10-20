# Measurement Service - SewNova

AI-powered body measurement service using computer vision and machine learning to automatically extract body measurements from photos.

## 🚀 Features

### AI-Powered Measurements
- ✅ Automatic body measurement extraction from photos
- ✅ MediaPipe pose detection for accurate landmark identification
- ✅ MiDaS depth estimation for 3D body understanding
- ✅ Dynamic focal length calibration using known objects
- ✅ Height-based scale factor calculation
- ✅ Comprehensive measurement validation

### Supported Measurements
- ✅ Chest/Bust circumference
- ✅ Waist circumference  
- ✅ Hip circumference
- ✅ Shoulder width
- ✅ Sleeve length
- ✅ Neck circumference
- ✅ Thigh circumference
- ✅ Trouser length
- ✅ Shirt length

### Integration
- ✅ Customer service integration for saving measurements
- ✅ RESTful API endpoints
- ✅ Image validation and error handling
- ✅ Debug information for troubleshooting

## 🏗️ Architecture

```
measurement-service/
├── app.py              # Main Flask application
├── requirements.txt    # Python dependencies
├── env.example         # Environment configuration
└── README.md          # This file
```

## 📋 Prerequisites

- Python 3.8 or higher
- Customer Service running (port 3002)
- Sufficient RAM for AI models (recommended 4GB+)

## 🛠️ Installation

1. **Navigate to the service:**
   ```bash
   cd backend/measurement-service
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment setup:**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

5. **Start the service:**
   ```bash
   python app.py
   ```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Service port | `8001` |
| `CUSTOMER_SERVICE_URL` | Customer service URL | `http://localhost:3002` |
| `FLASK_ENV` | Flask environment | `development` |

## 🔌 API Endpoints

### Health Check
- **GET** `/health` - Service health check

### Image Processing
- **POST** `/upload_images` - Process images and return measurements
- **POST** `/process_and_save` - Process images and save to customer service

### Request Format

#### Upload Images
```bash
curl -X POST http://localhost:8001/upload_images \
  -F "front=@front_photo.jpg" \
  -F "left_side=@side_photo.jpg" \
  -F "height_cm=170"
```

#### Process and Save
```bash
curl -X POST http://localhost:8001/process_and_save \
  -F "front=@front_photo.jpg" \
  -F "left_side=@side_photo.jpg" \
  -F "height_cm=170" \
  -F "customer_id=123" \
  -F "measurement_name=AI Generated"
```

### Response Format

```json
{
  "success": true,
  "measurements": {
    "chest": 42.5,
    "waist": 36.2,
    "hip": 38.7,
    "shoulder": 18.3,
    "sleeveLength": 24.1,
    "neck": 15.2,
    "thigh": 24.8,
    "trouserLength": 42.0,
    "shirtLength": 28.5
  },
  "debug_info": {
    "scale_factor": 0.85,
    "focal_length": 600.0,
    "user_height_cm": 170.0
  }
}
```

## 🔧 Technical Details

### AI Models Used
- **MediaPipe Pose**: Real-time pose detection and landmark identification
- **MiDaS**: Monocular depth estimation for 3D body understanding
- **OpenCV**: Image processing and computer vision operations

### Measurement Algorithm
1. **Image Validation**: Ensures full body is visible and properly positioned
2. **Pose Detection**: Identifies key body landmarks using MediaPipe
3. **Depth Estimation**: Uses MiDaS to understand 3D body structure
4. **Scale Calibration**: Calculates real-world scale using user height
5. **Measurement Extraction**: Applies geometric algorithms to calculate circumferences
6. **Validation**: Ensures measurements are within reasonable ranges

### Accuracy Factors
- **Image Quality**: Higher resolution images provide better accuracy
- **User Height**: Providing accurate height significantly improves measurements
- **Pose Position**: Standing straight with arms slightly away from body
- **Lighting**: Good lighting helps with landmark detection
- **Background**: Plain backgrounds work best

## 🚨 Error Handling

### Common Error Codes
- `INVALID_POSE`: Person not detected or pose not suitable
- `MISSING_IMAGE`: Required images not provided
- `PROCESSING_ERROR`: AI model processing failed

### Troubleshooting
1. **No person detected**: Ensure full body is visible in frame
2. **Poor measurements**: Check image quality and lighting
3. **Service unavailable**: Verify customer service is running

## 🔐 Security Considerations

- Images are processed in memory and not stored
- No persistent storage of uploaded images
- Authentication handled by customer service
- CORS configured for frontend integration

## 📊 Performance

- **Processing Time**: 2-5 seconds per image set
- **Memory Usage**: ~2-4GB RAM for AI models
- **Concurrent Requests**: Limited by available RAM
- **Model Loading**: ~10-15 seconds on first startup

## 🔄 Integration with SewNova

This service integrates with the existing SewNova microservices:

1. **Customer Service**: Saves measurements to customer profiles
2. **Frontend**: Provides measurement data for booking flow
3. **Admin Service**: Can be used for measurement analytics

## 📝 Usage in Frontend

```javascript
// Example frontend integration
const formData = new FormData();
formData.append('front', frontImageFile);
formData.append('height_cm', userHeight);
formData.append('customer_id', customerId);

const response = await fetch('http://localhost:8001/process_and_save', {
  method: 'POST',
  body: formData
});

const result = await response.json();
if (result.success) {
  // Measurements saved to customer service
  console.log('Measurements:', result.measurements);
}
```
