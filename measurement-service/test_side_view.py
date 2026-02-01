"""
Test script to verify side-view image processing implementation
This script tests the measurement API with and without side images
"""
import requests
import json

# API endpoint
API_URL = "http://localhost:8001/measure"

def test_front_only():
    """Test with front image only"""
    print("\n=== Test 1: Front Image Only ===")
    print("To test: Upload a front-view image")
    print("Expected: Measurements using heuristic depth estimation")
    print("Command: Use your frontend or Postman to POST to /measure with 'front' image")
    print()

def test_front_and_side():
    """Test with both front and side images"""
    print("\n=== Test 2: Front + Side Images ===")
    print("To test: Upload both front and side-view images")
    print("Expected: Measurements using actual side-view depth measurements")
    print("Command: POST to /measure with both 'front' and 'side' images")
    print()
    print("The response metadata should show:")
    print('  "side_image": "Used"')
    print('  "side_depths_measured": ["chest", "waist", "hip"]')
    print()

def test_with_height():
    """Test with height parameter"""
    print("\n=== Test 3: With Height Parameter ===")
    print("To test: Include height_cm parameter (e.g., 170)")
    print("Expected: More accurate scale calibration")
    print("Command: POST to /measure with 'front', 'side', and 'height_cm=170'")
    print()

if __name__ == "__main__":
    print("=" * 60)
    print("AI Measurement Service - Side View Implementation Test")
    print("=" * 60)
    
    print("\nIMPORTANT: Make sure the measurement service is running:")
    print("  cd backend/measurement-service")
    print("  python start_ai_service.py")
    print()
    
    test_front_only()
    test_front_and_side()
    test_with_height()
    
    print("=" * 60)
    print("\nHow to verify accuracy improvement:")
    print("1. Take measurements with front-only image")
    print("2. Take same measurements with front + side images")
    print("3. Compare the circumference values (chest, waist, hip)")
    print("4. Side-view results should be more accurate!")
    print("=" * 60)
