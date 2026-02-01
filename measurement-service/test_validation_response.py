"""
Quick test to see what validation error is being returned
"""
import requests

# Test with a simple request
try:
    # Create a minimal test image (1x1 pixel)
    from PIL import Image
    import io
    
    # Create a small test image
    img = Image.new('RGB', (100, 100), color='red')
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='JPEG')
    img_bytes.seek(0)
    
    response = requests.post(
        'http://localhost:8001/measure',
        files={'front': ('test.jpg', img_bytes, 'image/jpeg')},
        timeout=10
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    
except Exception as e:
    print(f"Error: {e}")
    if hasattr(e, 'response') and e.response is not None:
        print(f"Response content: {e.response.text}")
