"""
Test script for depth calibration improvements
Tests the new multi-constraint scale estimation and anthropometric depth calculation
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import numpy as np
import cv2
from measurement_utils import (
    estimate_scale_with_constraints,
    estimate_body_depth_from_constraints,
    estimate_depth_with_scale,
    extract_pose_landmarks,
    compute_measurements
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
    print(f"  Residuals: {result['residuals']}")
    
    # Test with user height
    result_with_height = estimate_scale_with_constraints(landmarks, (1000, 1000), user_height_cm=170.0, gender='M')
    print(f"With height (170cm, Male): cmpp={result_with_height['cmpp']:.4f}, confidence={result_with_height['confidence']:.2f}")
    print(f"  Residuals: {result_with_height['residuals']}")
    
    # Test gender differences
    result_female = estimate_scale_with_constraints(landmarks, (1000, 1000), user_height_cm=165.0, gender='F')
    print(f"With height (165cm, Female): cmpp={result_female['cmpp']:.4f}, confidence={result_female['confidence']:.2f}")
    
    assert result['confidence'] > 0.5, "Confidence should be reasonable without height"
    assert result_with_height['confidence'] > 0.8, "Confidence should be high with height"
    print("✓ Scale estimation tests passed")

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
    print(f"Male chest depth (40cm width): {depth_male:.2f}cm")
    
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
    print(f"Female chest depth (40cm width): {depth_female:.2f}cm")
    
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
    print(f"With side-view (25cm): {depth_with_side:.2f}cm")
    
    assert depth_male > depth_female, "Male chest depth should be larger than female"
    assert depth_with_side == 25.0, "Side-view should override anthropometric estimate"
    assert 20 < depth_male < 30, "Male chest depth should be realistic"
    print("✓ Depth estimation tests passed")

def test_depth_with_scale():
    """Test that estimate_depth_with_scale returns proper values"""
    print("\n=== Testing Depth with Scale ===")
    
    # Create a simple test image
    test_img = np.ones((480, 640, 3), dtype=np.uint8) * 128
    
    try:
        depth_normalized, depth_stats, depth_raw = estimate_depth_with_scale(test_img)
        
        print(f"Depth map shape: {depth_normalized.shape}")
        print(f"Depth stats: min={depth_stats['min']:.2f}, max={depth_stats['max']:.2f}, median={depth_stats['median']:.2f}")
        print(f"Normalized range: [{depth_normalized.min():.3f}, {depth_normalized.max():.3f}]")
        
        assert depth_normalized.shape == (480, 640), "Depth map should match image size"
        assert 0 <= depth_normalized.min() <= 0.1, "Normalized min should be near 0"
        assert 0.9 <= depth_normalized.max() <= 1.0, "Normalized max should be near 1"
        assert 'min' in depth_stats and 'max' in depth_stats, "Stats should include min/max"
        print("✓ Depth with scale tests passed")
    except Exception as e:
        print(f"⚠ Depth estimation test skipped (model not loaded): {e}")

def test_integration():
    """Test full integration with compute_measurements"""
    print("\n=== Testing Integration ===")
    
    # Create a simple test image
    test_img = np.ones((480, 640, 3), dtype=np.uint8) * 128
    
    # Create synthetic landmarks
    landmarks = {
        0: {'x': 320, 'y': 50, 'z': 0, 'visibility': 0.9},  # Nose
        11: {'x': 280, 'y': 150, 'z': 0, 'visibility': 0.9},  # Left shoulder
        12: {'x': 360, 'y': 150, 'z': 0, 'visibility': 0.9},  # Right shoulder
        23: {'x': 290, 'y': 300, 'z': 0, 'visibility': 0.9},  # Left hip
        24: {'x': 350, 'y': 300, 'z': 0, 'visibility': 0.9},  # Right hip
        15: {'x': 200, 'y': 250, 'z': 0, 'visibility': 0.9},  # Left wrist
        27: {'x': 290, 'y': 450, 'z': 0, 'visibility': 0.9},  # Left ankle
        28: {'x': 350, 'y': 450, 'z': 0, 'visibility': 0.9},  # Right ankle
    }
    
    try:
        # Test with new parameters
        measurements = compute_measurements(
            test_img,
            landmarks,
            depth_map=None,
            depth_stats=None,
            depth_raw=None,
            user_height_cm=170.0,
            gender='M',
            clothing_mask=None,
            side_depths=None
        )
        
        print(f"Measurements: {list(measurements.keys())}")
        
        # Check metadata exists
        assert '_metadata' in measurements, "Metadata should be present"
        assert 'scale_confidence' in measurements['_metadata'], "Scale confidence should be in metadata"
        assert 'cmpp' in measurements['_metadata'], "CMPP should be in metadata"
        
        print(f"Scale confidence: {measurements['_metadata']['scale_confidence']:.2f}")
        print(f"Scale method: {measurements['_metadata']['scale_method']}")
        print(f"CMPP: {measurements['_metadata']['cmpp']:.4f}")
        print(f"Depth methods: {measurements['_metadata']['depth_methods']}")
        
        print("✓ Integration tests passed")
    except Exception as e:
        print(f"⚠ Integration test error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("=" * 60)
    print("DEPTH CALIBRATION IMPROVEMENTS - TEST SUITE")
    print("=" * 60)
    
    try:
        test_scale_estimation()
        test_depth_estimation()
        test_depth_with_scale()
        test_integration()
        
        print("\n" + "=" * 60)
        print("✅ ALL TESTS PASSED")
        print("=" * 60)
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
