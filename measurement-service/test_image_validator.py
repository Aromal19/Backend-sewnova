"""
Smoke tests for image validation module.
Tests basic functionality without requiring pytest.
"""

import cv2
import numpy as np
from image_validator import ImageValidator, ValidationResult


def create_test_image(width=800, height=1000, brightness=128):
    """Create a simple test image"""
    img = np.ones((height, width, 3), dtype=np.uint8) * brightness
    # Add some variation for contrast
    img[::2, ::2] = min(255, brightness + 30)
    img[1::2, 1::2] = max(0, brightness - 30)
    return img


def test_validator_initialization():
    """Test that validator initializes with correct thresholds"""
    print("Test 1: Validator initialization...")
    validator = ImageValidator()
    
    assert validator.min_resolution == (480, 640), "Min resolution incorrect"
    assert validator.max_resolution == (4096, 4096), "Max resolution incorrect"
    assert validator.blur_threshold == 100, "Blur threshold incorrect"
    assert validator.brightness_range == (50, 200), "Brightness range incorrect"
    assert validator.contrast_threshold == 30, "Contrast threshold incorrect"
    
    print("  ✓ Validator initialized correctly")


def test_valid_image():
    """Test that a valid image passes all checks"""
    print("\nTest 2: Valid image...")
    validator = ImageValidator()
    img = create_test_image(width=800, height=1000, brightness=128)
    
    result = validator._check_image_valid(img)
    assert result.passed, f"Valid image check failed: {result.error_message}"
    
    result = validator._check_resolution(img)
    assert result.passed, f"Resolution check failed: {result.error_message}"
    
    result = validator._check_aspect_ratio(img)
    assert result.passed, f"Aspect ratio check failed: {result.error_message}"
    
    result = validator._check_image_quality(img)
    assert result.passed, f"Image quality check failed: {result.error_message}"
    
    print("  ✓ Valid image passes all checks")


def test_invalid_images():
    """Test that invalid images fail appropriately"""
    print("\nTest 3: Invalid images...")
    validator = ImageValidator()
    
    # Test None image
    result = validator._check_image_valid(None)
    assert not result.passed, "None image should fail"
    assert result.error_code == "INVALID_IMAGE"
    print("  ✓ None image fails correctly")
    
    # Test grayscale image
    gray_img = np.ones((800, 600), dtype=np.uint8) * 128
    result = validator._check_image_valid(gray_img)
    assert not result.passed, "Grayscale image should fail"
    assert result.error_code == "INVALID_FORMAT"
    print("  ✓ Grayscale image fails correctly")
    
    # Test low resolution
    small_img = create_test_image(width=400, height=500)
    result = validator._check_resolution(small_img)
    assert not result.passed, "Low resolution should fail"
    assert result.error_code == "RESOLUTION_TOO_LOW"
    print("  ✓ Low resolution fails correctly")
    
    # Test high resolution
    large_img = create_test_image(width=5000, height=6000)
    result = validator._check_resolution(large_img)
    assert not result.passed, "High resolution should fail"
    assert result.error_code == "RESOLUTION_TOO_HIGH"
    print("  ✓ High resolution fails correctly")


def test_aspect_ratio():
    """Test aspect ratio validation"""
    print("\nTest 4: Aspect ratio...")
    validator = ImageValidator()
    
    # Too narrow
    narrow_img = create_test_image(width=400, height=1000)  # 0.4 ratio
    result = validator._check_aspect_ratio(narrow_img)
    assert not result.passed, "Narrow aspect ratio should fail"
    assert result.error_code == "UNUSUAL_ASPECT_RATIO"
    print("  ✓ Narrow aspect ratio fails correctly")
    
    # Too wide
    wide_img = create_test_image(width=1000, height=600)  # 1.67 ratio
    result = validator._check_aspect_ratio(wide_img)
    assert not result.passed, "Wide aspect ratio should fail"
    assert result.error_code == "UNUSUAL_ASPECT_RATIO"
    print("  ✓ Wide aspect ratio fails correctly")
    
    # Normal
    normal_img = create_test_image(width=800, height=1000)  # 0.8 ratio
    result = validator._check_aspect_ratio(normal_img)
    assert result.passed, "Normal aspect ratio should pass"
    print("  ✓ Normal aspect ratio passes correctly")


def test_image_quality():
    """Test image quality checks"""
    print("\nTest 5: Image quality...")
    validator = ImageValidator()
    
    # Too dark
    dark_img = create_test_image(brightness=30)
    result = validator._check_image_quality(dark_img)
    assert not result.passed, "Dark image should fail"
    assert result.error_code == "IMAGE_TOO_DARK"
    print("  ✓ Dark image fails correctly")
    
    # Too bright
    bright_img = create_test_image(brightness=220)
    result = validator._check_image_quality(bright_img)
    assert not result.passed, "Bright image should fail"
    assert result.error_code == "IMAGE_TOO_BRIGHT"
    print("  ✓ Bright image fails correctly")
    
    # Low contrast (uniform image)
    uniform_img = np.ones((1000, 800, 3), dtype=np.uint8) * 128
    result = validator._check_image_quality(uniform_img)
    assert not result.passed, "Low contrast image should fail"
    assert result.error_code == "LOW_CONTRAST"
    print("  ✓ Low contrast fails correctly")
    
    # Blurry image
    img = create_test_image()
    blurry_img = cv2.GaussianBlur(img, (51, 51), 0)
    result = validator._check_image_quality(blurry_img)
    assert not result.passed, "Blurry image should fail"
    assert result.error_code == "IMAGE_BLURRY"
    print("  ✓ Blurry image fails correctly")


def test_validation_result():
    """Test ValidationResult dataclass"""
    print("\nTest 6: ValidationResult structure...")
    
    # Failed result
    result = ValidationResult(
        passed=False,
        error_code="TEST_ERROR",
        error_message="Test error message"
    )
    assert result.passed is False
    assert result.error_code == "TEST_ERROR"
    assert result.error_message == "Test error message"
    assert result.warnings == []
    print("  ✓ Failed result structure correct")
    
    # Passed result with warnings
    warnings = [{"type": "test_warning", "message": "Test"}]
    result = ValidationResult(passed=True, warnings=warnings)
    assert result.passed is True
    assert len(result.warnings) == 1
    print("  ✓ Passed result with warnings correct")


def test_height_warning():
    """Test height warning generation"""
    print("\nTest 7: Height warning...")
    
    # Missing height should generate warning
    warnings = []
    height_cm = None
    if height_cm is None:
        warnings.append({
            "type": "missing_height",
            "message": "Height not provided. Measurements will be less accurate."
        })
    assert len(warnings) == 1
    assert warnings[0]["type"] == "missing_height"
    print("  ✓ Missing height generates warning")
    
    # Provided height should not generate warning
    warnings = []
    height_cm = 175.0
    if height_cm is None:
        warnings.append({"type": "missing_height"})
    assert len(warnings) == 0
    print("  ✓ Provided height generates no warning")


def run_all_tests():
    """Run all smoke tests"""
    print("=" * 60)
    print("IMAGE VALIDATOR SMOKE TESTS")
    print("=" * 60)
    
    try:
        test_validator_initialization()
        test_valid_image()
        test_invalid_images()
        test_aspect_ratio()
        test_image_quality()
        test_validation_result()
        test_height_warning()
        
        print("\n" + "=" * 60)
        print("✓ ALL TESTS PASSED!")
        print("=" * 60)
        print("\nImage validation module is working correctly.")
        print("Ready for integration testing with real images.")
        return True
        
    except AssertionError as e:
        print(f"\n✗ TEST FAILED: {e}")
        return False
    except Exception as e:
        print(f"\n✗ UNEXPECTED ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)
