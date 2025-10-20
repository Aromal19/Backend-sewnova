import os
import cv2
import numpy as np
import torch
import torch.nn.functional as F
from typing import Optional, Tuple, Dict
from dotenv import load_dotenv
from PIL import Image
from transformers import AutoImageProcessor, SegformerForSemanticSegmentation
import mediapipe as mp

load_dotenv()

# === MODIFIED: Add configuration class ===
class Config:
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.midas_model_type = os.getenv("MIDAS_MODEL_TYPE", "DPT_Large")
        self.segformer_model = os.getenv("SEGFORMER_MODEL_NAME", "mattmdjaga/segformer_b2_clothes")
        self.fallback_segformer = "nvidia/segformer-b0-finetuned-ade-512-512"
        self.max_image_size = int(os.getenv("MAX_IMAGE_SIZE", "1024"))
        self.min_confidence = float(os.getenv("MIN_CONFIDENCE", "0.5"))

config = Config()

# ---------- Pose (MediaPipe) ----------
mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils
POSE = mp_pose.Pose(
    static_image_mode=True, 
    model_complexity=2, 
    enable_segmentation=True,
    min_detection_confidence=0.5
)

# ---------- Depth (MiDaS / DPT) ----------
def load_midas(model_type: str = "DPT_Large"):
    """Load MiDaS depth estimation model"""
    try:
        midas = torch.hub.load("intel-isl/MiDaS", model_type)
        midas.to(config.device)
        midas.eval()
        midas_transforms = torch.hub.load("intel-isl/MiDaS", "transforms")
        if model_type.startswith("DPT"):
            transform = midas_transforms.dpt_transform
        else:
            transform = midas_transforms.small_transform
        print(f"Loaded MiDaS model: {model_type} on {config.device}")
        return midas, transform
    except Exception as e:
        print(f"Error loading MiDaS model: {e}")
        raise

MIDAS_MODEL, MIDAS_TRANSFORM = load_midas(config.midas_model_type)


def estimate_depth(image_bgr: np.ndarray) -> np.ndarray:
    """Return depth map (H x W) as numpy float32 normalized map."""
    try:
        img_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
        input_img = Image.fromarray(img_rgb)
        with torch.no_grad():
            inp = MIDAS_TRANSFORM(input_img).to(config.device)
            inp = inp.unsqueeze(0)
            prediction = MIDAS_MODEL(inp)
            prediction = F.interpolate(
                prediction.unsqueeze(1), 
                size=img_rgb.shape[:2], 
                mode="bilinear", 
                align_corners=False
            ).squeeze()
            depth = prediction.cpu().numpy()
            # normalize to [0,1]
            depth = (depth - depth.min()) / (depth.max() - depth.min() + 1e-8)
        return depth.astype(np.float32)
    except Exception as e:
        print(f"Depth estimation error: {e}")
        raise

# ---------- Clothing segmentation (optional) ----------
def load_segformer(model_name: str):
    """Load SegFormer segmentation model with fallback"""
    try:
        processor = AutoImageProcessor.from_pretrained(model_name)
        model = SegformerForSemanticSegmentation.from_pretrained(model_name).to(config.device)
        print(f"Loaded SegFormer model: {model_name}")
        return processor, model
    except Exception as e:
        print(f"Error loading SegFormer model {model_name}, using fallback: {e}")
        try:
            processor = AutoImageProcessor.from_pretrained(config.fallback_segformer)
            model = SegformerForSemanticSegmentation.from_pretrained(config.fallback_segformer).to(config.device)
            print(f"Using fallback model: {config.fallback_segformer}")
            return processor, model
        except Exception as e2:
            print(f"Error loading fallback model: {e2}")
            raise

SEGMENTATION_PROCESSOR, SEGMENTATION_MODEL = load_segformer(config.segformer_model)


def clothing_mask_from_image(image_bgr: np.ndarray) -> np.ndarray:
    """Return boolean mask (H x W) where clothing pixels are True."""
    try:
        img_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
        pil = Image.fromarray(img_rgb)
        inputs = SEGMENTATION_PROCESSOR(images=pil, return_tensors="pt").to(config.device)
        with torch.no_grad():
            outputs = SEGMENTATION_MODEL(**inputs)
            logits = outputs.logits
            seg = torch.argmax(logits, dim=1).squeeze().cpu().numpy().astype(np.uint8)
        
        # For clothing models, assume non-zero classes are clothing
        # For ADE fallback, use heuristic for person/clothing areas
        mask = (seg > 0).astype(np.uint8)
        mask = cv2.resize(mask, (image_bgr.shape[1], image_bgr.shape[0]), 
                         interpolation=cv2.INTER_NEAREST)
        
        # === MODIFIED: Add morphological operations to clean mask ===
        kernel = np.ones((5,5), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
        
        return mask
    except Exception as e:
        print(f"Clothing segmentation error: {e}")
        raise

# === MODIFIED: Add image preprocessing functions ===
def preprocess_image(image_bgr: np.ndarray, max_size: int = 1024) -> np.ndarray:
    """Resize image while maintaining aspect ratio"""
    h, w = image_bgr.shape[:2]
    if max(h, w) > max_size:
        scale = max_size / max(h, w)
        new_w, new_h = int(w * scale), int(h * scale)
        image_bgr = cv2.resize(image_bgr, (new_w, new_h), interpolation=cv2.INTER_AREA)
    return image_bgr

def enhance_pose_detection(image_bgr: np.ndarray) -> np.ndarray:
    """Improve pose detection with basic image enhancement"""
    # Contrast enhancement
    lab = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2LAB)
    lab[:,:,0] = cv2.createCLAHE(clipLimit=2.0).apply(lab[:,:,0])
    enhanced = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
    return enhanced

# ---------- Utilities for landmark extraction ----------
def extract_pose_landmarks(image_bgr: np.ndarray):
    """Return MediaPipe pose landmarks or None if not found."""
    try:
        rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
        results = POSE.process(rgb)
        if not results.pose_landmarks:
            return None
        
        landmarks = results.pose_landmarks.landmark
        h, w = image_bgr.shape[:2]
        
        # convert to pixel coords with visibility and confidence filtering
        pts = {}
        for i, lm in enumerate(landmarks):
            if lm.visibility < config.min_confidence:
                continue
            pts[i] = {
                "x": lm.x * w,
                "y": lm.y * h,
                "z": lm.z,
                "visibility": lm.visibility
            }
        return pts
    except Exception as e:
        print(f"Pose landmark extraction error: {e}")
        return None

def validate_landmarks(landmarks: dict) -> bool:
    """Check if we have sufficient landmarks for measurements"""
    required_landmarks = [
        mp_pose.PoseLandmark.NOSE.value,
        mp_pose.PoseLandmark.LEFT_SHOULDER.value,
        mp_pose.PoseLandmark.RIGHT_SHOULDER.value,
        mp_pose.PoseLandmark.LEFT_HIP.value,
        mp_pose.PoseLandmark.RIGHT_HIP.value,
        mp_pose.PoseLandmark.LEFT_ANKLE.value,
        mp_pose.PoseLandmark.RIGHT_ANKLE.value,
    ]
    
    found_required = sum(1 for lm in required_landmarks if lm in landmarks)
    return found_required >= 5  # Allow some missing but need most key points

# ---------- Measurement logic ----------
def cm_per_pixel_from_height(landmarks: dict, image_height_px: int, 
                           user_height_cm: Optional[float] = None, 
                           fallback_scale: Optional[float] = None) -> float:
    """Return cm per pixel using user height if available, otherwise fallback."""
    # Use nose to ankle distance for height estimation
    nose = landmarks.get(mp_pose.PoseLandmark.NOSE.value)
    left_ankle = landmarks.get(mp_pose.PoseLandmark.LEFT_ANKLE.value)
    right_ankle = landmarks.get(mp_pose.PoseLandmark.RIGHT_ANKLE.value)
    
    if not (nose and left_ankle and right_ankle):
        return fallback_scale or (170.0 / image_height_px)  # Default assumption
    
    bottom_ankle_y = max(left_ankle["y"], right_ankle["y"])
    pixel_height = abs(bottom_ankle_y - nose["y"])
    
    if user_height_cm:
        # Add small adjustment factor for head-to-ankle vs full height
        adjustment_factor = 0.95  # Empirical adjustment
        return (user_height_cm * adjustment_factor) / (pixel_height + 1e-8)
    else:
        # Assume average height if not provided
        assumed_height_cm = 170.0
        return assumed_height_cm / (pixel_height + 1e-8)

def pixel_dist(a: Tuple[float, float], b: Tuple[float, float]) -> float:
    """Calculate Euclidean distance between two points"""
    return np.linalg.norm(np.array(a) - np.array(b))

# === MODIFIED: Enhanced circumference calculation ===
def calculate_circumference_from_depth(width_px: float, depth_map: np.ndarray, 
                                    center_x: int, center_y: int, cmpp: float) -> float:
    """More accurate circumference using depth information"""
    if depth_map is not None:
        try:
            depth_val = float(depth_map[center_y, center_x])
            # Use depth to estimate front-to-back ratio (deeper = more elliptical)
            depth_ratio = 0.5 + (1.0 - depth_val) * 0.3
        except:
            depth_ratio = 0.65
    else:
        depth_ratio = 0.65  # Default elliptical ratio
    
    a = (width_px * cmpp) / 2.0  # Semi-major axis
    b = a * depth_ratio          # Semi-minor axis
    
    # Ramanujan's approximation for ellipse circumference
    h = ((a - b) ** 2) / ((a + b) ** 2 + 1e-8)
    circumference = np.pi * (a + b) * (1 + (3 * h) / (10 + np.sqrt(4 - 3 * h)))
    
    return circumference

def compute_measurements(image_bgr: np.ndarray, landmarks: dict, 
                        depth_map: Optional[np.ndarray] = None, 
                        user_height_cm: Optional[float] = None, 
                        clothing_mask: Optional[np.ndarray] = None) -> Dict[str, float]:
    h, w = image_bgr.shape[:2]
    cmpp = cm_per_pixel_from_height(landmarks, h, user_height_cm)

    def lm_px(idx):
        lm = landmarks.get(idx)
        return (lm["x"], lm["y"]) if lm else (None, None)

    left_sh = lm_px(mp_pose.PoseLandmark.LEFT_SHOULDER.value)
    right_sh = lm_px(mp_pose.PoseLandmark.RIGHT_SHOULDER.value)
    left_hip = lm_px(mp_pose.PoseLandmark.LEFT_HIP.value)
    right_hip = lm_px(mp_pose.PoseLandmark.RIGHT_HIP.value)
    left_wrist = lm_px(mp_pose.PoseLandmark.LEFT_WRIST.value)
    left_ankle = lm_px(mp_pose.PoseLandmark.LEFT_ANKLE.value)
    nose = lm_px(mp_pose.PoseLandmark.NOSE.value)

    results = {}

    # Shoulder width (straight line)
    if left_sh[0] and right_sh[0]:
        shoulder_px = pixel_dist(left_sh, right_sh)
        results["shoulder"] = round(shoulder_px * cmpp * 1.06, 2)  # small correction
    else:
        results["shoulder"] = 0.0

    # Chest — sample horizontal scan at mid-torso; use clothing mask if available for width
    if left_sh[1] and left_hip[1]:
        chest_y = int(left_sh[1] + 0.18 * (left_hip[1] - left_sh[1]))
        if clothing_mask is not None:
            # scan horizontally for mask edges
            row = clothing_mask[chest_y, :]
            non_zero = np.where(row > 0)[0]
            if len(non_zero) >= 2:
                chest_px = non_zero[-1] - non_zero[0]
            else:
                chest_px = abs(left_sh[0] - right_sh[0])
        else:
            chest_px = abs(left_sh[0] - right_sh[0])
        # approximate circumference using depth_map if available
        depth_adj = 1.0
        if depth_map is not None:
            # sample normalized depth value at chest center
            center_x = int((left_sh[0] + right_sh[0]) / 2)
            center_x = np.clip(center_x, 0, depth_map.shape[1]-1)
            center_y = int(chest_y * depth_map.shape[0] / h)
            depth_val = float(depth_map[center_y, center_x])
            depth_adj = 1.0 + 0.5 * (1.0 - depth_val)  # heuristic
        chest_cm = chest_px * cmpp
        # elliptical circumference approximation
        a = chest_cm / 2.0
        b = a * 0.7 * depth_adj
        circ = 2 * np.pi * np.sqrt((a*a + b*b) / 2.0)
        results["chest"] = round(circ, 2)
    else:
        results["chest"] = 0.0

    # Waist (similar approach but lower)
    if left_sh[1] and left_hip[1]:
        waist_y = int(left_sh[1] + 0.40 * (left_hip[1] - left_sh[1]))
        if clothing_mask is not None:
            row = clothing_mask[waist_y, :]
            non_zero = np.where(row > 0)[0]
            if len(non_zero) >= 2:
                waist_px = non_zero[-1] - non_zero[0]
            else:
                waist_px = abs(left_hip[0] - right_hip[0]) * 0.9
        else:
            waist_px = abs(left_hip[0] - right_hip[0]) * 0.9

        depth_adj = 1.0
        if depth_map is not None:
            center_x = int((left_hip[0] + right_hip[0]) / 2)
            center_y = int(waist_y * depth_map.shape[0] / h)
            depth_val = float(depth_map[center_y, center_x])
            depth_adj = 1.0 + 0.5 * (1.0 - depth_val)

        a = (waist_px * cmpp) / 2.0
        b = a * 0.65 * depth_adj
        circ = 2 * np.pi * np.sqrt((a*a + b*b) / 2.0)
        results["waist"] = round(circ, 2)
    else:
        results["waist"] = 0.0

    # Hip
    if left_hip[0] and right_hip[0]:
        hip_px = abs(left_hip[0] - right_hip[0])
        hip_px = hip_px * 1.10
        a = (hip_px * cmpp) / 2.0
        b = a * 0.75
        results["hip"] = round(2 * np.pi * np.sqrt((a*a + b*b) / 2.0), 2)
    else:
        results["hip"] = 0.0

    # Arm length
    if left_sh[1] and left_wrist[1]:
        arm_px = pixel_dist(left_sh, left_wrist)
        results["sleeveLength"] = round(arm_px * cmpp, 2)
    else:
        results["sleeveLength"] = 0.0

    # Shirt length (shoulder to hip)
    if left_sh[1] and left_hip[1]:
        shirt_px = abs(left_hip[1] - left_sh[1])
        results["shirtLength"] = round(shirt_px * cmpp * 1.2, 2)
    else:
        results["shirtLength"] = 0.0

    # Trouser length (hip to ankle)
    if left_hip[1] and left_ankle[1]:
        trouser_px = abs(left_ankle[1] - left_hip[1])
        results["trouserLength"] = round(trouser_px * cmpp, 2)
    else:
        results["trouserLength"] = 0.0

    # Neck circumference
    if nose[0] and left_sh[0]:
        neck_px = abs(left_sh[0] - nose[0]) * 2.0
        results["neck"] = round(neck_px * cmpp, 2)
    else:
        results["neck"] = 0.0

    # Thigh circumference
    if left_hip[1] and left_ankle[1]:
        thigh_y = int(left_hip[1] + 0.2 * (left_ankle[1] - left_hip[1]))
        thigh_px = abs(left_hip[0] - right_hip[0]) * 0.5
        a = (thigh_px * cmpp) / 2.0
        b = a * 0.6
        results["thigh"] = round(2 * np.pi * np.sqrt((a*a + b*b) / 2.0), 2)
    else:
        results["thigh"] = 0.0

    # Remove zero measurements
    results = {k: v for k, v in results.items() if v > 0}
    
    return results