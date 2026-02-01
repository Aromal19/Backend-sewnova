"""
Simple smoke test - just verify functions don't crash
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

print("=" * 60)
print("DEPTH CALIBRATION - SMOKE TEST")
print("=" * 60)

try:
    # Import the functions
    print("\n1. Importing functions...")
    from measurement_utils import (
        estimate_scale_with_constraints,
        estimate_body_depth_from_constraints,
        config
    )
    print("   ✓ Imports successful")
    
    # Test anthropometric constants exist
    print("\n2. Checking anthropometric constants...")
    assert hasattr(config, 'anthro_male')
    assert hasattr(config, 'anthro_female')
    assert hasattr(config, 'anthro_unisex')
    print(f"   ✓ Male chest depth ratio: {config.anthro_male['chest_depth_ratio']}")
    print(f"   ✓ Female chest depth ratio: {config.anthro_female['chest_depth_ratio']}")
    print(f"   ✓ Unisex chest depth ratio: {config.anthro_unisex['chest_depth_ratio']}")
    
    # Test depth estimation with side override
    print("\n3. Testing depth estimation...")
    depth = estimate_body_depth_from_constraints(
        width_cm=40.0,
        body_part='chest',
        depth_map_normalized=None,
        depth_raw=None,
        center_x=500,
        center_y=300,
        cmpp=0.2,
        side_depth_cm=25.0,  # Should return this
        gender='M'
    )
    assert depth == 25.0, f"Side depth override failed, got {depth}"
    print(f"   ✓ Side depth override works: {depth}cm")
    
    # Test depth estimation without side
    depth_male = estimate_body_depth_from_constraints(
        width_cm=40.0,
        body_part='chest',
        depth_map_normalized=None,
        depth_raw=None,
        center_x=500,
        center_y=300,
        cmpp=0.2,
        side_depth_cm=None,
        gender='M'
    )
    expected_male = 40.0 * config.anthro_male['chest_depth_ratio']
    assert abs(depth_male - expected_male) < 0.1, f"Male depth calculation wrong: {depth_male} vs {expected_male}"
    print(f"   ✓ Male anthropometric depth: {depth_male:.2f}cm (ratio: {depth_male/40.0:.2f})")
    
    depth_female = estimate_body_depth_from_constraints(
        width_cm=40.0,
        body_part='chest',
        depth_map_normalized=None,
        depth_raw=None,
        center_x=500,
        center_y=300,
        cmpp=0.2,
        side_depth_cm=None,
        gender='F'
    )
    assert depth_female < depth_male, "Female depth should be less than male"
    print(f"   ✓ Female anthropometric depth: {depth_female:.2f}cm (ratio: {depth_female/40.0:.2f})")
    
    # Test scale estimation (minimal test)
    print("\n4. Testing scale estimation...")
    result = estimate_scale_with_constraints(
        landmarks={},  # Empty landmarks
        image_shape=(1000, 1000),
        user_height_cm=None,
        gender=None
    )
    assert 'cmpp' in result
    assert 'confidence' in result
    assert 'method' in result
    assert result['method'] == 'fallback', "Should use fallback with no landmarks"
    assert result['confidence'] == 0.3, "Fallback confidence should be 0.3"
    print(f"   ✓ Fallback case works: confidence={result['confidence']}")
    
    print("\n" + "=" * 60)
    print("✅ ALL SMOKE TESTS PASSED")
    print("=" * 60)
    print("\nCore calibration functions are working correctly!")
    print("\nKey improvements implemented:")
    print("  • Multi-constraint scale estimation")
    print("  • Gender-specific anthropometric ratios")
    print("  • Side-view depth override")
    print("  • Confidence scoring")
    
except Exception as e:
    print(f"\n❌ TEST FAILED: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
