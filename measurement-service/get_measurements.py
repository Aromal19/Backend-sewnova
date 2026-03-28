"""
get_measurements.py — Thin wrapper for evaluation.

Exposes a single function that runs the measurement pipeline with
selectable modes (baseline_2d, segmentation_only, full_corrected).

This file is ADDITIVE — no production code is modified.
Delete this file to revert.
"""

import cv2
import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image
from typing import Optional, Dict

# Re-use everything already loaded by measurement_utils
from measurement_utils import (
    config,
    MIDAS_MODEL,
    MIDAS_TRANSFORM,
    extract_pose_landmarks,
    validate_landmarks,
    clothing_mask_from_image,
    compute_measurements,
    preprocess_image,
    enhance_pose_detection,
    ml_correction_model,
)

# Valid evaluation modes
VALID_MODES = {"baseline_2d", "segmentation_only", "full_corrected"}

# ---------------------------------------------------------------------------
# Explicit correction factors for full_corrected mode
# ---------------------------------------------------------------------------
CORRECTION_FACTORS = {
    "chest":  0.85,
    "waist":  0.92,
    "hip":    1.02,
    "default": 1.0,
}


# ---------------------------------------------------------------------------
# Safe depth estimation (handles MiDaS transform type error)
# ---------------------------------------------------------------------------
def _estimate_depth_safe(image_bgr: np.ndarray):
    """
    MiDaS depth estimation with fallback for PIL Image type errors.
    Returns (depth_normalized, depth_stats, depth_raw).
    """
    img_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)

    try:
        pil_img = Image.fromarray(img_rgb)
        with torch.no_grad():
            inp = MIDAS_TRANSFORM(pil_img).to(config.device)
            if inp.dim() == 3:
                inp = inp.unsqueeze(0)
            prediction = MIDAS_MODEL(inp)
            prediction = F.interpolate(
                prediction.unsqueeze(1),
                size=img_rgb.shape[:2],
                mode="bilinear",
                align_corners=False,
            ).squeeze()
            depth_raw = prediction.cpu().numpy()
    except TypeError:
        # Fallback: manual preprocessing (bypass broken transform)
        h, w = image_bgr.shape[:2]
        img_input = cv2.resize(img_rgb, (384, 384))
        img_input = img_input.astype(np.float32) / 255.0
        mean = np.array([0.485, 0.456, 0.406])
        std = np.array([0.229, 0.224, 0.225])
        img_input = (img_input - mean) / std
        img_input = img_input.transpose(2, 0, 1)
        inp = torch.from_numpy(img_input).float().unsqueeze(0).to(config.device)

        with torch.no_grad():
            prediction = MIDAS_MODEL(inp)
            prediction = F.interpolate(
                prediction.unsqueeze(1),
                size=(h, w),
                mode="bilinear",
                align_corners=False,
            ).squeeze()
            depth_raw = prediction.cpu().numpy()

    depth_stats = {
        "min": float(depth_raw.min()),
        "max": float(depth_raw.max()),
        "median": float(np.median(depth_raw)),
        "std": float(np.std(depth_raw)),
    }
    drange = depth_stats["max"] - depth_stats["min"] + 1e-8
    depth_normalized = ((depth_raw - depth_stats["min"]) / drange).astype(np.float32)

    return depth_normalized, depth_stats, depth_raw.astype(np.float32)


# ---------------------------------------------------------------------------
# Smart blend helpers
# ---------------------------------------------------------------------------
def _smart_blend_seg(baseline: dict, seg_result: dict) -> dict:
    """
    Smart segmentation blending.
    Only use mask value when it's TIGHTER than landmarks (tight clothing).
    When mask is wider (loose clothing), keep landmark baseline.
    """
    result = baseline.copy()
    for key in ("chest", "waist"):
        base_val = baseline.get(key, 0)
        seg_val = seg_result.get(key, 0)
        if base_val <= 0 or seg_val <= 0:
            continue
        if seg_val <= base_val:
            result[key] = seg_val
            print(f"    [SEG] {key}: mask ({seg_val:.1f}) <= landmarks ({base_val:.1f}) -> USING mask (tight clothing)")
        else:
            result[key] = base_val
            print(f"    [SEG] {key}: mask ({seg_val:.1f}) > landmarks ({base_val:.1f}) -> KEEPING landmarks (loose clothing)")
    return result


def _smart_blend_depth(current: dict, depth_result: dict) -> dict:
    """
    Smart depth blending.
    Only use depth-enhanced value when it's TIGHTER than the current estimate.
    When depth inflates the circumference, keep the current value.
    """
    result = current.copy()
    for key in ("chest", "waist", "hip"):
        cur_val = current.get(key, 0)
        dep_val = depth_result.get(key, 0)
        if cur_val <= 0 or dep_val <= 0:
            continue
        if dep_val <= cur_val:
            result[key] = dep_val
            print(f"    [DEPTH] {key}: depth ({dep_val:.1f}) <= current ({cur_val:.1f}) -> USING depth (refined)")
        else:
            result[key] = cur_val
            print(f"    [DEPTH] {key}: depth ({dep_val:.1f}) > current ({cur_val:.1f}) -> KEEPING current (depth inflates)")
    return result


def _apply_correction(measurements: dict) -> dict:
    """Apply explicit correction factors to circumference measurements."""
    result = measurements.copy()
    for key in ("chest", "waist", "hip"):
        raw_val = measurements.get(key, 0)
        if raw_val <= 0:
            continue
        multiplier = CORRECTION_FACTORS.get(key, CORRECTION_FACTORS["default"])
        corrected = round(raw_val * multiplier, 2)
        result[key] = corrected
        print(f"    [CORRECTION] {key}: {raw_val:.2f} x {multiplier} = {corrected:.2f}")
        if multiplier < 0.8 or multiplier > 1.2:
            print(f"    WARNING: Multiplier {multiplier} out of expected range [0.8, 1.2]")
    return result


def _compute_raw(img, landmarks, clothing_mask, height_cm, gender,
                 depth_map=None, depth_stats=None, depth_raw=None) -> dict:
    """Run compute_measurements and strip metadata."""
    raw = compute_measurements(
        img,
        landmarks,
        depth_map=depth_map,
        depth_stats=depth_stats,
        depth_raw=depth_raw,
        user_height_cm=height_cm,
        gender=gender,
        clothing_mask=clothing_mask,
        side_depths=None,
    )
    return {k: v for k, v in raw.items() if not k.startswith("_")}


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------
def get_measurements(
    image_path: str,
    mode: str = "baseline_2d",
    height_cm: Optional[float] = None,
    gender: Optional[str] = None,
) -> Dict[str, float]:
    """
    Run the measurement pipeline on a single image.

    Modes
    -----
    baseline_2d        : MediaPipe only
    segmentation_only  : MediaPipe + smart SegFormer
    full_corrected     : MediaPipe + smart SegFormer + smart MiDaS depth + correction

    Smart blend = only use seg/depth when it produces tighter measurements.
    """
    if mode not in VALID_MODES:
        raise ValueError(f"Unknown mode '{mode}'. Choose from {VALID_MODES}")

    # ---- Read & preprocess ----
    img = cv2.imread(image_path)
    if img is None:
        raise RuntimeError(f"Cannot read image: {image_path}")

    img = preprocess_image(img, max_size=1024)
    img = enhance_pose_detection(img)

    # ---- Pose (always on) ----
    landmarks = extract_pose_landmarks(img)
    if landmarks is None:
        raise RuntimeError(f"No pose detected in {image_path}")
    if not validate_landmarks(landmarks):
        raise RuntimeError(f"Insufficient landmarks in {image_path}")

    # ---- Always disable the broken pkl model inside compute_measurements ----
    original_available = ml_correction_model.available
    ml_correction_model.available = False

    try:
        # ---- BASELINE (always computed first as the anchor) ----
        baseline = _compute_raw(img, landmarks, clothing_mask=None,
                                height_cm=height_cm, gender=gender)

        if mode == "baseline_2d":
            return baseline

        # ---- SEGMENTATION (smart blend) ----
        clothing_mask = None
        try:
            clothing_mask = clothing_mask_from_image(img)
        except Exception as e:
            print(f"    [{mode}] Segmentation failed: {e}")

        if clothing_mask is not None:
            seg_raw = _compute_raw(img, landmarks, clothing_mask=clothing_mask,
                                   height_cm=height_cm, gender=gender)
            result = _smart_blend_seg(baseline, seg_raw)
        else:
            result = baseline.copy()

        if mode == "segmentation_only":
            return result

        # ---- DEPTH (smart blend — full_corrected only) ----
        depth_map = None
        depth_stats = None
        depth_raw = None
        try:
            depth_map, depth_stats, depth_raw = _estimate_depth_safe(img)
        except Exception as e:
            print(f"    [full_corrected] Depth estimation failed: {e}")

        if depth_map is not None:
            # Compute with depth enabled (use seg mask too if available)
            depth_result = _compute_raw(
                img, landmarks,
                clothing_mask=clothing_mask,
                height_cm=height_cm, gender=gender,
                depth_map=depth_map, depth_stats=depth_stats, depth_raw=depth_raw,
            )
            # Smart blend: only use depth when it tightens the estimate
            result = _smart_blend_depth(result, depth_result)

        # ---- CORRECTION FACTORS ----
        result = _apply_correction(result)
        return result

    finally:
        ml_correction_model.available = original_available
