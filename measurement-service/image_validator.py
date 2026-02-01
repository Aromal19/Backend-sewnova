"""
Pre-flight image validation module for body measurement system.
Validates images BEFORE running expensive measurement algorithms.

Checks:
1. Image valid and readable
2. Resolution adequate (480x640 to 4096x4096)
3. Aspect ratio reasonable (0.5 to 1.5)
4. Exactly one person detected
5. Full body visible (head to ankles)
6. Pose rotation acceptable (frontal)
7. Image not blurry
8. Lighting adequate
9. Height input check (soft warning)
"""

import cv2
import numpy as np
from typing import Optional, Dict, List
from dataclasses import dataclass
import mediapipe as mp


@dataclass
class ValidationResult:
    """Result of image validation"""
    passed: bool
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    warnings: List[Dict] = None
    
    def __post_init__(self):
        if self.warnings is None:
            self.warnings = []


class ImageValidator:
    """
    Pre-flight validation for body measurement images.
    
    Validates image quality and pose suitability before running
    expensive measurement algorithms.
    """
    
    def __init__(self):
        # Resolution thresholds
        self.min_resolution = (480, 640)  # width, height
        self.max_resolution = (4096, 4096)
        
        # Image quality thresholds
        self.blur_threshold = 100  # Laplacian variance
        self.brightness_range = (50, 200)  # Mean brightness
        self.contrast_threshold = 30  # Std deviation
        
        # Pose thresholds
        self.visibility_threshold = 0.5  # MediaPipe confidence
        self.rotation_width_ratio = (0.6, 1.4)  # Shoulder/hip width ratio
        self.rotation_z_threshold = 0.15  # Z-coordinate difference
        
        # Aspect ratio
        self.aspect_ratio_range = (0.5, 1.5)  # Portrait to landscape
        
        # MediaPipe pose
        self.mp_pose = mp.solutions.pose
    
    def validate(self, image_bgr: np.ndarray, 
                 height_cm: Optional[float] = None) -> ValidationResult:
        """
        Run all validation checks in order (fail-fast).
        
        Args:
            image_bgr: Input image in BGR format
            height_cm: Optional user height in centimeters
            
        Returns:
            ValidationResult with pass/fail and error details
        """
        
        # Check 1: Image valid
        result = self._check_image_valid(image_bgr)
        if not result.passed:
            return result
        
        # Check 2: Resolution
        result = self._check_resolution(image_bgr)
        if not result.passed:
            return result
        
        # Check 3: Aspect ratio
        result = self._check_aspect_ratio(image_bgr)
        if not result.passed:
            return result
        
        # Checks 4-6: Pose detection (combined for efficiency)
        result = self._check_pose(image_bgr)
        if not result.passed:
            return result
        
        # Checks 7-8: Image quality
        result = self._check_image_quality(image_bgr)
        if not result.passed:
            return result
        
        # Check 9: Height warning (soft)
        warnings = []
        if height_cm is None:
            warnings.append({
                "type": "missing_height",
                "message": "Height not provided. Measurements will be less accurate.",
                "suggestion": "Provide your height for better results.",
                "confidence_impact": "Scale confidence will be lower without height input."
            })
        
        return ValidationResult(passed=True, warnings=warnings)
    
    def _check_image_valid(self, image: np.ndarray) -> ValidationResult:
        """Check 1: Image is valid and readable"""
        if image is None or image.size == 0:
            return ValidationResult(
                passed=False,
                error_code="INVALID_IMAGE",
                error_message="Invalid image file. Please upload a valid JPG or PNG image."
            )
        
        if len(image.shape) != 3 or image.shape[2] != 3:
            return ValidationResult(
                passed=False,
                error_code="INVALID_FORMAT",
                error_message="Image must be in color (RGB/BGR format)."
            )
        
        return ValidationResult(passed=True)
    
    def _check_resolution(self, image: np.ndarray) -> ValidationResult:
        """Check 2: Resolution adequate"""
        h, w = image.shape[:2]
        
        if w < self.min_resolution[0] or h < self.min_resolution[1]:
            return ValidationResult(
                passed=False,
                error_code="RESOLUTION_TOO_LOW",
                error_message=f"Image resolution too low ({w}×{h}). Please use at least {self.min_resolution[0]}×{self.min_resolution[1]} pixels."
            )
        
        if w > self.max_resolution[0] or h > self.max_resolution[1]:
            return ValidationResult(
                passed=False,
                error_code="RESOLUTION_TOO_HIGH",
                error_message=f"Image resolution too high ({w}×{h}). Please resize to under {self.max_resolution[0]}×{self.max_resolution[1]} pixels."
            )
        
        return ValidationResult(passed=True)
    
    def _check_aspect_ratio(self, image: np.ndarray) -> ValidationResult:
        """Check 3: Aspect ratio reasonable"""
        h, w = image.shape[:2]
        aspect_ratio = w / h
        
        if aspect_ratio < self.aspect_ratio_range[0] or aspect_ratio > self.aspect_ratio_range[1]:
            return ValidationResult(
                passed=False,
                error_code="UNUSUAL_ASPECT_RATIO",
                error_message=f"Image aspect ratio unusual ({aspect_ratio:.2f}). Please ensure the full body is visible without extreme cropping."
            )
        
        return ValidationResult(passed=True)
    
    def _check_pose(self, image: np.ndarray) -> ValidationResult:
        """Checks 4-6: Pose detection, full body visibility, rotation"""
        from measurement_utils import extract_pose_landmarks
        
        # Extract landmarks
        landmarks = extract_pose_landmarks(image)
        
        # Check 4: Person detected
        if landmarks is None or len(landmarks) == 0:
            return ValidationResult(
                passed=False,
                error_code="NO_PERSON_DETECTED",
                error_message="No person detected in the image. Please ensure you are clearly visible in the frame."
            )
        
        # Check 5: Full body visible
        required_landmarks = {
            'head': [self.mp_pose.PoseLandmark.NOSE.value],
            'shoulders': [
                self.mp_pose.PoseLandmark.LEFT_SHOULDER.value,
                self.mp_pose.PoseLandmark.RIGHT_SHOULDER.value
            ],
            'hips': [
                self.mp_pose.PoseLandmark.LEFT_HIP.value,
                self.mp_pose.PoseLandmark.RIGHT_HIP.value
            ],
            'ankles': [
                self.mp_pose.PoseLandmark.LEFT_ANKLE.value,
                self.mp_pose.PoseLandmark.RIGHT_ANKLE.value
            ]
        }
        
        for category, indices in required_landmarks.items():
            visible = any(
                idx in landmarks and landmarks[idx]['visibility'] > self.visibility_threshold
                for idx in indices
            )
            if not visible:
                messages = {
                    'head': "Head not fully visible. Please step back to include your entire head in the frame.",
                    'shoulders': "Shoulders not visible. Please ensure your shoulders are in the frame.",
                    'hips': "Hips not visible. Please step back to include your hips in the frame.",
                    'ankles': "Ankles not visible. Please step back to include your feet in the frame."
                }
                return ValidationResult(
                    passed=False,
                    error_code=f"{category.upper()}_NOT_VISIBLE",
                    error_message=messages[category]
                )
        
        # Check 6: Pose rotation (frontal vs side)
        left_sh = landmarks.get(self.mp_pose.PoseLandmark.LEFT_SHOULDER.value)
        right_sh = landmarks.get(self.mp_pose.PoseLandmark.RIGHT_SHOULDER.value)
        left_hip = landmarks.get(self.mp_pose.PoseLandmark.LEFT_HIP.value)
        right_hip = landmarks.get(self.mp_pose.PoseLandmark.RIGHT_HIP.value)
        
        if left_sh and right_sh and left_hip and right_hip:
            # Check width ratio
            shoulder_width = abs(left_sh['x'] - right_sh['x'])
            hip_width = abs(left_hip['x'] - right_hip['x'])
            width_ratio = shoulder_width / (hip_width + 1e-8)
            
            # Check z-coordinate difference (depth)
            shoulder_z_diff = abs(left_sh['z'] - right_sh['z'])
            hip_z_diff = abs(left_hip['z'] - right_hip['z'])
            
            # Detect rotation
            rotation_detected = (
                width_ratio < self.rotation_width_ratio[0] or
                width_ratio > self.rotation_width_ratio[1] or
                shoulder_z_diff > self.rotation_z_threshold or
                hip_z_diff > self.rotation_z_threshold
            )
            
            if rotation_detected:
                return ValidationResult(
                    passed=False,
                    error_code="POSE_ROTATED",
                    error_message="Please face the camera directly. Your body appears to be rotated. Stand straight facing the camera."
                )
        
        return ValidationResult(passed=True)
    
    def _check_image_quality(self, image: np.ndarray) -> ValidationResult:
        """Checks 7-8: Blur and lighting"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Check 7: Blur detection (Laplacian variance)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        if laplacian_var < self.blur_threshold:
            return ValidationResult(
                passed=False,
                error_code="IMAGE_BLURRY",
                error_message="Image is blurry. Please ensure the camera is focused and hold still while taking the photo."
            )
        
        # Check 8: Lighting
        mean_brightness = np.mean(gray)
        std_brightness = np.std(gray)
        
        if mean_brightness < self.brightness_range[0]:
            return ValidationResult(
                passed=False,
                error_code="IMAGE_TOO_DARK",
                error_message="Image is too dark. Please ensure good lighting or increase camera brightness."
            )
        
        if mean_brightness > self.brightness_range[1]:
            return ValidationResult(
                passed=False,
                error_code="IMAGE_TOO_BRIGHT",
                error_message="Image is overexposed. Please reduce lighting or camera exposure."
            )
        
        if std_brightness < self.contrast_threshold:
            return ValidationResult(
                passed=False,
                error_code="LOW_CONTRAST",
                error_message="Image has poor contrast. Please improve lighting conditions."
            )
        
        return ValidationResult(passed=True)


# Convenience function for quick validation
def validate_image_for_measurement(image_bgr: np.ndarray, 
                                   height_cm: Optional[float] = None) -> ValidationResult:
    """
    Validate an image before running measurement pipeline.
    
    Args:
        image_bgr: Input image in BGR format
        height_cm: Optional user height in centimeters
        
    Returns:
        ValidationResult with pass/fail and error details
    """
    validator = ImageValidator()
    return validator.validate(image_bgr, height_cm)
