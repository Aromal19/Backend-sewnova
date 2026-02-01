"""
Simple test for core calibration functions (no model loading)
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

# Mock the heavy imports before importing measurement_utils
import unittest.mock as mock

# Create mock objects for the heavy dependencies
mock_pose = mock.MagicMock()
mock_midas_model = mock.MagicMock()
mock_midas_transform = mock.MagicMock()
mock_segmentation_processor = mock.MagicMock()
mock_segmentation_model = mock.MagicMock()

# Patch the module-level variables
sys.modules['mediapipe'] = mock.MagicMock()
sys.modules['mediapipe.solutions'] = mock.MagicMock()
sys.modules['mediapipe.solutions.pose'] = mock.MagicMock()

# Now import the functions we want to test
from measurement_utils import (
    estimate_scale_with_constraints,
    estimate_body_depth_from_constraints,
    config
)

def test_scale_estimation():
    """Test multi-constraint scale estimation"""
    print("\n=== Testing Scale Estimation ===")
    
    # Create synthetic landmarks with known proportions
    # Simulating a 170cm person in a 1000px tall image
    landmarks = {
        0: {'x': 500, 'y': 100, 'z': 0, 'visibility': 0.9},  # Nose
        11: {'x': 450, 'y': 300, 'z': 0, 'visibility': 0.9},  # Left shoulder
        12: {'x': 550, 'y': 300, 'z': 0, 'visibility': 0.9},  # Right shoulder
        23: {'x': 470, 'y': 600, 'z': 0, 'visibility': 0.9},  # Left hip
        24: {'x': 530, 'y': 600, 'z': 0, 'visibility': 0.9},  # Right hip
        27: {'x': 470, 'y': 950, 'z': 0, 'visibility': 0.9},  # Left ankle
        28: {'x': 530, 'y': 950, 'z': 0, 'visibility': 0.9},  # Right ankle
    }
    
    # Test without user height
    result = estimate_scale_with_constraints(landmarks, (1000, 1000), user_height_cm=None, gender=None)
    print(f"Without height: cmpp={result['cmpp']:.4f}, confidence={result['confidence']:.2f}, method={result['method']}")
    print(f"  Candidates: {len(result['candidates'])} constraints used")
    print(f"  Residuals: {result['residuals']}")
    
    # Test with user height
    result_with_height = estimate_scale_with_constraints(landmarks, (1000, 1000), user_height_cm=170.0, gender='M')
    print(f"\nWith height (170cm, Male): cmpp={result_with_height['cmpp']:.4f}, confidence={result_with_height['confidence']:.2f}")
    print(f"  Candidates: {len(result_with_height['candidates'])} constraints used")
    print(f"  Residuals: {result_with_height['residuals']}")
    
    # Test gender differences
    result_female = estimate_scale_with_constraints(landmarks, (1000, 1000), user_height_cm=165.0, gender='F')
    print(f"\nWith height (165cm, Female): cmpp={result_female['cmpp']:.4f}, confidence={result_female['confidence']:.2f}")
    
    # Assertions
    assert result['confidence'] > 0.3, f"Confidence should be at least fallback level, got {result['confidence']}"
    print(f"  ✓ Without height confidence: {result['confidence']:.2f}")
    
    assert result_with_height['confidence'] > 0.5, f"Confidence should be reasonable with height, got {result_with_height['confidence']}"
    print(f"  ✓ With height confidence: {result_with_height['confidence']:.2f}")
    
    assert len(result_with_height['candidates']) >= 2, "Should have multiple constraints"
    print(f"  ✓ Multiple constraints used: {len(result_with_height['candidates'])}")
    
    # Check that providing height improves confidence
    if result_with_height['confidence'] > result['confidence']:
        print(f"  ✓ Height improved confidence by {(result_with_height['confidence'] - result['confidence']):.2f}")
    
    print("\n✓ Scale estimation tests passed")

def test_depth_estimation():
    """Test anthropometric depth estimation"""
    print("\n=== Testing Depth Estimation ===")
    
    # Test chest depth for different genders
    width_cm = 40.0  # 40cm chest width
    
    # Male
    depth_male = estimate_body_depth_from_constraints(
        width_cm=width_cm,
        body_part='chest',
        depth_map_normalized=None,
        depth_raw=None,
        center_x=500,
        center_y=300,
        cmpp=0.2,
        side_depth_cm=None,
        gender='M'
    )
    print(f"Male chest depth (40cm width): {depth_male:.2f}cm (ratio: {depth_male/width_cm:.2f})")
    
    # Female
    depth_female = estimate_body_depth_from_constraints(
        width_cm=width_cm,
        body_part='chest',
        depth_map_normalized=None,
        depth_raw=None,
        center_x=500,
        center_y=300,
        cmpp=0.2,
        side_depth_cm=None,
        gender='F'
    )
    print(f"Female chest depth (40cm width): {depth_female:.2f}cm (ratio: {depth_female/width_cm:.2f})")
    
    # Unisex
    depth_unisex = estimate_body_depth_from_constraints(
        width_cm=width_cm,
        body_part='chest',
        depth_map_normalized=None,
        depth_raw=None,
        center_x=500,
        center_y=300,
        cmpp=0.2,
        side_depth_cm=None,
        gender=None
    )
    print(f"Unisex chest depth (40cm width): {depth_unisex:.2f}cm (ratio: {depth_unisex/width_cm:.2f})")
    
    # Test with side-view override
    depth_with_side = estimate_body_depth_from_constraints(
        width_cm=width_cm,
        body_part='chest',
        depth_map_normalized=None,
        depth_raw=None,
        center_x=500,
        center_y=300,
        cmpp=0.2,
        side_depth_cm=25.0,  # Override with side measurement
        gender='M'
    )
    print(f"\nWith side-view override (25cm): {depth_with_side:.2f}cm")
    
    # Assertions
    assert depth_male > depth_female, f"Male chest depth ({depth_male}) should be larger than female ({depth_female})"
    assert depth_with_side == 25.0, "Side-view should override anthropometric estimate"
    assert 20 < depth_male < 30, f"Male chest depth should be realistic, got {depth_male}cm"
    assert abs(depth_male - width_cm * config.anthro_male['chest_depth_ratio']) < 1.0, "Should match configured ratio"
    print("\n✓ Depth estimation tests passed")

def test_anthropometric_constants():
    """Test that anthropometric constants are loaded correctly"""
    print("\n=== Testing Anthropometric Constants ===")
    
    print(f"Male constants: {config.anthro_male}")
    print(f"Female constants: {config.anthro_female}")
    print(f"Unisex constants: {config.anthro_unisex}")
    
    # Verify all required keys exist
    required_keys = ['shoulder_to_height', 'torso_to_height', 'chest_depth_ratio', 'waist_depth_ratio', 'hip_depth_ratio']
    for key in required_keys:
        assert key in config.anthro_male, f"Missing {key} in male constants"
        assert key in config.anthro_female, f"Missing {key} in female constants"
        assert key in config.anthro_unisex, f"Missing {key} in unisex constants"
    
    # Verify ratios are reasonable
    assert 0.2 < config.anthro_male['shoulder_to_height'] < 0.3, "Shoulder ratio should be ~25%"
    assert 0.4 < config.anthro_male['torso_to_height'] < 0.6, "Torso ratio should be ~50%"
    assert 0.5 < config.anthro_male['chest_depth_ratio'] < 0.8, "Chest depth ratio should be 50-80%"
    
    print("\n✓ Anthropometric constants tests passed")

if __name__ == "__main__":
    print("=" * 60)
    print("DEPTH CALIBRATION - CORE FUNCTION TESTS")
    print("=" * 60)
    
    try:
        test_anthropometric_constants()
        test_scale_estimation()
        test_depth_estimation()
        
        print("\n" + "=" * 60)
        print("✅ ALL CORE TESTS PASSED")
        print("=" * 60)
        print("\nThe new calibration functions are working correctly!")
        print("Next steps:")
        print("  1. Test with real images")
        print("  2. Compare measurements before/after")
        print("  3. Validate confidence scores")
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    except Exception as e:
        print(f"\n⚠ TEST ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
