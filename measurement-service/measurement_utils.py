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
from ml_correction import MeasurementCorrectionModel

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
        
        # Anthropometric constants from ANSUR II (2012) and ISO 8559 (2017)
        self.anthro_male = {
            'shoulder_to_height': 0.259,
            'torso_to_height': 0.520,
            'chest_depth_ratio': 0.60,
            'waist_depth_ratio': 0.65,
            'hip_depth_ratio': 0.75
        }
        self.anthro_female = {
            'shoulder_to_height': 0.255,
            'torso_to_height': 0.515,
            'chest_depth_ratio': 0.55,
            'waist_depth_ratio': 0.70,
            'hip_depth_ratio': 0.80
        }
        self.anthro_unisex = {
            'shoulder_to_height': 0.257,
            'torso_to_height': 0.518,
            'chest_depth_ratio': 0.58,
            'waist_depth_ratio': 0.68,
            'hip_depth_ratio': 0.78
        }

config = Config()

# === ML Correction Model ===
ml_correction_model = MeasurementCorrectionModel()

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


def estimate_depth_with_scale(image_bgr: np.ndarray) -> Tuple[np.ndarray, Dict[str, float], np.ndarray]:
    """Return depth map with scale metadata for calibration.
    
    Returns:
        depth_normalized: Normalized depth map [0,1] for visualization
        depth_stats: Statistics (min, max, median, std) for calibration
        depth_raw: Raw MiDaS output for metric conversion
    """
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
            depth_raw = prediction.cpu().numpy()
            
            # Store scale info BEFORE normalization
            depth_stats = {
                'min': float(depth_raw.min()),
                'max': float(depth_raw.max()),
                'median': float(np.median(depth_raw)),
                'std': float(np.std(depth_raw))
            }
            
            # normalize to [0,1] for visualization/heuristics
            depth_normalized = (depth_raw - depth_stats['min']) / (depth_stats['max'] - depth_stats['min'] + 1e-8)
            
        return depth_normalized.astype(np.float32), depth_stats, depth_raw.astype(np.float32)
    except Exception as e:
        print(f"Depth estimation error: {e}")
        raise

def estimate_depth(image_bgr: np.ndarray) -> np.ndarray:
    """Return depth map (H x W) as numpy float32 normalized map.
    
    DEPRECATED: Use estimate_depth_with_scale() for better calibration.
    Kept for backward compatibility.
    """
    depth_normalized, _, _ = estimate_depth_with_scale(image_bgr)
    return depth_normalized

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
    # Contrast enhancement with fixed parameters for consistency
    lab = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2LAB)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    lab[:,:,0] = clahe.apply(lab[:,:,0])
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

def extract_side_landmarks(image_bgr: np.ndarray):
    """Extract pose landmarks from side-view image.
    Side views typically show one side of the body, so we use visible landmarks."""
    try:
        rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
        results = POSE.process(rgb)
        if not results.pose_landmarks:
            return None
        
        landmarks = results.pose_landmarks.landmark
        h, w = image_bgr.shape[:2]
        
        # For side view, collect all visible landmarks
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
        
        # Validate we have key side-view landmarks
        required_side = [
            mp_pose.PoseLandmark.NOSE.value,
            mp_pose.PoseLandmark.LEFT_SHOULDER.value,
            mp_pose.PoseLandmark.LEFT_HIP.value,
        ]
        
        if sum(1 for lm in required_side if lm in pts) < 2:
            return None
            
        return pts
    except Exception as e:
        print(f"Side landmark extraction error: {e}")
        return None

def calculate_side_depths(side_image_bgr: np.ndarray, side_landmarks: dict, 
                         cmpp: float) -> Dict[str, float]:
    """Calculate body depth measurements from side-view image.
    Returns depths at chest, waist, and hip levels in centimeters."""
    
    h, w = side_image_bgr.shape[:2]
    depths = {}
    
    def lm_px(idx):
        lm = side_landmarks.get(idx)
        return (lm["x"], lm["y"]) if lm else (None, None)
    
    # Get key landmarks (use whichever side is visible)
    left_sh = lm_px(mp_pose.PoseLandmark.LEFT_SHOULDER.value)
    right_sh = lm_px(mp_pose.PoseLandmark.RIGHT_SHOULDER.value)
    left_hip = lm_px(mp_pose.PoseLandmark.LEFT_HIP.value)
    right_hip = lm_px(mp_pose.PoseLandmark.RIGHT_HIP.value)
    
    # Additional landmarks for depth estimation
    left_elbow = lm_px(mp_pose.PoseLandmark.LEFT_ELBOW.value)
    right_elbow = lm_px(mp_pose.PoseLandmark.RIGHT_ELBOW.value)
    
    # Use whichever shoulder/hip is visible
    shoulder = left_sh if left_sh[0] else right_sh
    hip = left_hip if left_hip[0] else right_hip
    elbow = left_elbow if left_elbow[0] else right_elbow
    
    if not (shoulder[0] and hip[0]):
        return depths
    
    # Method: Use body segmentation mask to find actual body boundaries
    gray = cv2.cvtColor(side_image_bgr, cv2.COLOR_BGR2GRAY)
    
    # Apply Gaussian blur for noise reduction (deterministic)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    
    # Use Otsu's thresholding to separate body from background
    _, mask = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # Clean up the mask with fixed kernel size
    kernel = np.ones((5, 5), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)
    
    # Helper function to measure body thickness at a given y-coordinate
    def measure_thickness_at_y(y_coord, mask_img):
        """Measure body thickness at a specific y-coordinate"""
        if not (0 <= y_coord < h):
            return None
        
        row = mask_img[y_coord, :]
        # Find continuous white regions (body)
        non_zero = np.where(row > 0)[0]
        
        if len(non_zero) < 2:
            return None
        
        # Find the largest continuous segment (the body)
        segments = []
        start = non_zero[0]
        for i in range(1, len(non_zero)):
            if non_zero[i] - non_zero[i-1] > 5:  # Gap detected
                segments.append((start, non_zero[i-1]))
                start = non_zero[i]
        segments.append((start, non_zero[-1]))
        
        # Get the largest segment
        largest_segment = max(segments, key=lambda s: s[1] - s[0])
        thickness_px = largest_segment[1] - largest_segment[0]
        
        return thickness_px
    
    # Chest depth - measure at chest level
    chest_y = int(shoulder[1] + 0.18 * (hip[1] - shoulder[1]))
    chest_thickness_px = measure_thickness_at_y(chest_y, mask)
    if chest_thickness_px:
        # Apply correction factor (side view shows ~70-80% of actual depth)
        depths["chest"] = chest_thickness_px * cmpp * 0.75
    
    # Waist depth - measure at waist level
    waist_y = int(shoulder[1] + 0.40 * (hip[1] - shoulder[1]))
    waist_thickness_px = measure_thickness_at_y(waist_y, mask)
    if waist_thickness_px:
        depths["waist"] = waist_thickness_px * cmpp * 0.75
    
    # Hip depth - measure at hip level
    hip_y = int(hip[1])
    hip_thickness_px = measure_thickness_at_y(hip_y, mask)
    if hip_thickness_px:
        depths["hip"] = hip_thickness_px * cmpp * 0.75
    
    return depths


def create_landmarks_visualization(image_bgr: np.ndarray, landmarks: dict) -> str:
    """Create a visualization of detected landmarks and return as base64 string"""
    try:
        # Create a copy of the image for visualization
        vis_img = image_bgr.copy()
        
        # Draw landmarks as circles
        for lm_id, lm_data in landmarks.items():
            if lm_data and 'x' in lm_data and 'y' in lm_data:
                x, y = int(lm_data['x']), int(lm_data['y'])
                visibility = lm_data.get('visibility', 0)
                
                # Color based on visibility (green for high confidence, yellow for medium, red for low)
                if visibility > 0.8:
                    color = (0, 255, 0)  # Green
                elif visibility > 0.5:
                    color = (0, 255, 255)  # Yellow
                else:
                    color = (0, 0, 255)  # Red
                
                # Draw circle for landmark
                cv2.circle(vis_img, (x, y), 4, color, -1)
                cv2.circle(vis_img, (x, y), 6, (255, 255, 255), 1)  # White border
        
        # Draw connections between key landmarks
        connections = [
            (mp_pose.PoseLandmark.LEFT_SHOULDER.value, mp_pose.PoseLandmark.RIGHT_SHOULDER.value),
            (mp_pose.PoseLandmark.LEFT_SHOULDER.value, mp_pose.PoseLandmark.LEFT_HIP.value),
            (mp_pose.PoseLandmark.RIGHT_SHOULDER.value, mp_pose.PoseLandmark.RIGHT_HIP.value),
            (mp_pose.PoseLandmark.LEFT_HIP.value, mp_pose.PoseLandmark.RIGHT_HIP.value),
            (mp_pose.PoseLandmark.LEFT_SHOULDER.value, mp_pose.PoseLandmark.LEFT_ELBOW.value),
            (mp_pose.PoseLandmark.LEFT_ELBOW.value, mp_pose.PoseLandmark.LEFT_WRIST.value),
            (mp_pose.PoseLandmark.RIGHT_SHOULDER.value, mp_pose.PoseLandmark.RIGHT_ELBOW.value),
            (mp_pose.PoseLandmark.RIGHT_ELBOW.value, mp_pose.PoseLandmark.RIGHT_WRIST.value),
            (mp_pose.PoseLandmark.LEFT_HIP.value, mp_pose.PoseLandmark.LEFT_KNEE.value),
            (mp_pose.PoseLandmark.LEFT_KNEE.value, mp_pose.PoseLandmark.LEFT_ANKLE.value),
            (mp_pose.PoseLandmark.RIGHT_HIP.value, mp_pose.PoseLandmark.RIGHT_KNEE.value),
            (mp_pose.PoseLandmark.RIGHT_KNEE.value, mp_pose.PoseLandmark.RIGHT_ANKLE.value),
        ]
        
        for start_lm, end_lm in connections:
            if start_lm in landmarks and end_lm in landmarks:
                start_data = landmarks[start_lm]
                end_data = landmarks[end_lm]
                if start_data and end_data and 'x' in start_data and 'y' in start_data and 'x' in end_data and 'y' in end_data:
                    start_x, start_y = int(start_data['x']), int(start_data['y'])
                    end_x, end_y = int(end_data['x']), int(end_data['y'])
                    cv2.line(vis_img, (start_x, start_y), (end_x, end_y), (0, 255, 0), 2)
        
        # Convert to base64 string
        _, buffer = cv2.imencode('.jpg', vis_img)
        import base64
        landmarks_b64 = base64.b64encode(buffer).decode('utf-8')
        return landmarks_b64
        
    except Exception as e:
        print(f"Error creating landmarks visualization: {e}")
        return None

def create_side_visualization(side_image_bgr: np.ndarray, side_landmarks: dict, 
                              side_depths: Dict[str, float]) -> str:
    """Create a visualization of side view with measurement lines"""
    try:
        import base64
        vis_img = side_image_bgr.copy()
        h, w = vis_img.shape[:2]
        
        def lm_px(idx):
            lm = side_landmarks.get(idx)
            return (int(lm["x"]), int(lm["y"])) if lm else (None, None)
        
        # Get key landmarks
        left_sh = lm_px(mp_pose.PoseLandmark.LEFT_SHOULDER.value)
        right_sh = lm_px(mp_pose.PoseLandmark.RIGHT_SHOULDER.value)
        left_hip = lm_px(mp_pose.PoseLandmark.LEFT_HIP.value)
        right_hip = lm_px(mp_pose.PoseLandmark.RIGHT_HIP.value)
        
        shoulder = left_sh if left_sh[0] else right_sh
        hip = left_hip if left_hip[0] else right_hip
        
        if not (shoulder[0] and hip[0]):
            return None
        
        # Draw landmarks
        for lm_id, lm_data in side_landmarks.items():
            if lm_data and 'x' in lm_data and 'y' in lm_data:
                x, y = int(lm_data['x']), int(lm_data['y'])
                cv2.circle(vis_img, (x, y), 4, (0, 255, 0), -1)
        
        # Draw measurement lines
        measurements_drawn = []
        
        # Chest line
        if "chest" in side_depths:
            chest_y = int(shoulder[1] + 0.18 * (hip[1] - shoulder[1]))
            cv2.line(vis_img, (0, chest_y), (w, chest_y), (255, 0, 0), 2)
            cv2.putText(vis_img, f"Chest: {side_depths['chest']:.1f}cm", 
                       (10, chest_y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 0), 2)
            measurements_drawn.append("chest")
        
        # Waist line
        if "waist" in side_depths:
            waist_y = int(shoulder[1] + 0.40 * (hip[1] - shoulder[1]))
            cv2.line(vis_img, (0, waist_y), (w, waist_y), (0, 255, 0), 2)
            cv2.putText(vis_img, f"Waist: {side_depths['waist']:.1f}cm", 
                       (10, waist_y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
            measurements_drawn.append("waist")
        
        # Hip line
        if "hip" in side_depths:
            hip_y = int(hip[1])
            cv2.line(vis_img, (0, hip_y), (w, hip_y), (0, 0, 255), 2)
            cv2.putText(vis_img, f"Hip: {side_depths['hip']:.1f}cm", 
                       (10, hip_y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
            measurements_drawn.append("hip")
        
        # Add title
        cv2.putText(vis_img, "Side View - Depth Measurements", 
                   (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
        
        # Convert to base64
        _, buffer = cv2.imencode('.jpg', vis_img)
        side_vis_b64 = base64.b64encode(buffer).decode('utf-8')
        return side_vis_b64
        
    except Exception as e:
        print(f"Error creating side visualization: {e}")
        return None


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

# === NEW: Multi-constraint scale estimation ===
def estimate_scale_with_constraints(
    landmarks: dict, 
    image_shape: Tuple[int, int],
    user_height_cm: Optional[float] = None,
    gender: Optional[str] = None  # 'M', 'F', or None for unisex
) -> Dict[str, float]:
    """
    Estimate cm-per-pixel using anthropometric constraints.
    
    Returns:
        {
            'cmpp': float,  # Primary scale
            'confidence': float,  # 0-1 reliability score
            'method': str,  # Which constraint was used
            'residuals': dict  # Validation metrics
        }
    """
    h, w = image_shape[:2]
    
    # Select anthropometric constants based on gender
    if gender == 'M':
        anthro = config.anthro_male
    elif gender == 'F':
        anthro = config.anthro_female
    else:
        anthro = config.anthro_unisex
    
    # Extract key landmarks
    nose = landmarks.get(mp_pose.PoseLandmark.NOSE.value)
    left_sh = landmarks.get(mp_pose.PoseLandmark.LEFT_SHOULDER.value)
    right_sh = landmarks.get(mp_pose.PoseLandmark.RIGHT_SHOULDER.value)
    left_hip = landmarks.get(mp_pose.PoseLandmark.LEFT_HIP.value)
    right_hip = landmarks.get(mp_pose.PoseLandmark.RIGHT_HIP.value)
    left_ankle = landmarks.get(mp_pose.PoseLandmark.LEFT_ANKLE.value)
    right_ankle = landmarks.get(mp_pose.PoseLandmark.RIGHT_ANKLE.value)
    
    candidates = []  # List of (cmpp, confidence, method) tuples
    
    # === Constraint 1: User-provided height ===
    if user_height_cm and nose and left_ankle and right_ankle:
        bottom_ankle_y = max(left_ankle["y"], right_ankle["y"])
        pixel_height = abs(bottom_ankle_y - nose["y"])
        
        # Perspective correction (head ~25cm closer than feet)
        perspective_correction = 0.97
        
        cmpp_height = (user_height_cm * perspective_correction) / (pixel_height + 1e-8)
        candidates.append((cmpp_height, 0.95, 'user_height'))
    
    # === Constraint 2: Shoulder-to-height ratio ===
    if left_sh and right_sh and nose and left_ankle and right_ankle:
        shoulder_width_px = pixel_dist(
            (left_sh["x"], left_sh["y"]), 
            (right_sh["x"], right_sh["y"])
        )
        bottom_ankle_y = max(left_ankle["y"], right_ankle["y"])
        pixel_height = abs(bottom_ankle_y - nose["y"])
        
        # Use average height if not provided
        assumed_height = user_height_cm if user_height_cm else 170.0
        cmpp_shoulder = (assumed_height * anthro['shoulder_to_height']) / (shoulder_width_px + 1e-8)
        
        confidence = 0.75 if user_height_cm else 0.60
        candidates.append((cmpp_shoulder, confidence, 'shoulder_ratio'))
    
    # === Constraint 3: Torso proportion ===
    if left_sh and left_hip and nose and left_ankle:
        torso_px = abs(left_hip["y"] - left_sh["y"])
        bottom_ankle_y = left_ankle["y"]
        pixel_height = abs(bottom_ankle_y - nose["y"])
        
        assumed_height = user_height_cm if user_height_cm else 170.0
        cmpp_torso = (assumed_height * anthro['torso_to_height']) / (torso_px + 1e-8)
        
        confidence = 0.70 if user_height_cm else 0.55
        candidates.append((cmpp_torso, confidence, 'torso_ratio'))
    
    # === Weighted average of all candidates ===
    if not candidates:
        # Fallback: assume 170cm height
        return {
            'cmpp': 170.0 / h,
            'confidence': 0.3,
            'method': 'fallback',
            'residuals': {},
            'candidates': []
        }
    
    total_weight = sum(c[1] for c in candidates)
    cmpp_final = sum(c[0] * c[1] for c in candidates) / total_weight
    
    # Calculate residuals for validation
    residuals = {}
    for cmpp_i, conf_i, method_i in candidates:
        residuals[method_i] = abs(cmpp_i - cmpp_final) / cmpp_final
    
    # Confidence based on agreement between methods
    max_residual = max(residuals.values()) if residuals else 0
    confidence_final = np.clip(1.0 - max_residual, 0.3, 1.0)
    
    return {
        'cmpp': cmpp_final,
        'confidence': confidence_final,
        'method': 'multi_constraint',
        'residuals': residuals,
        'candidates': candidates
    }

# === NEW: Anthropometric depth estimation ===
def estimate_body_depth_from_constraints(
    width_cm: float,
    body_part: str,  # 'chest', 'waist', 'hip'
    depth_map_normalized: Optional[np.ndarray],
    depth_raw: Optional[np.ndarray],
    center_x: int,
    center_y: int,
    cmpp: float,
    side_depth_cm: Optional[float] = None,
    gender: Optional[str] = None
) -> float:
    """
    Estimate body depth (front-to-back) using multiple cues.
    
    Priority:
    1. Side-view measurement (if available) - HIGHEST ACCURACY
    2. Anthropometric priors + depth gradient
    3. Fallback to statistical average
    """
    
    # === Method 1: Side-view depth (ground truth) ===
    if side_depth_cm is not None:
        return side_depth_cm
    
    # === Method 2: Depth gradient analysis ===
    curvature_factor = 1.0
    if depth_raw is not None:
        try:
            # Sample depth along horizontal line at measurement height
            # Find body boundaries (±width/2 around center)
            left_x = max(0, center_x - int(width_cm / (2 * cmpp)))
            right_x = min(depth_raw.shape[1] - 1, center_x + int(width_cm / (2 * cmpp)))
            
            # Depth at center (front of body) vs edges (sides)
            depth_center = float(depth_raw[center_y, center_x])
            depth_edges = (float(depth_raw[center_y, left_x]) + float(depth_raw[center_y, right_x])) / 2.0
            
            # Depth difference indicates curvature
            depth_diff = abs(depth_center - depth_edges)
            depth_range = depth_raw.max() - depth_raw.min()
            
            # Heuristic: larger depth gradient → more curved → larger depth
            if depth_diff > 0.05 * depth_range:
                curvature_factor = 1.1  # More rounded
            elif depth_diff < 0.02 * depth_range:
                curvature_factor = 0.9  # Flatter
        except:
            curvature_factor = 1.0
    
    # === Method 3: Anthropometric priors ===
    # Select gender-specific ratios
    if gender == 'M':
        anthro = config.anthro_male
    elif gender == 'F':
        anthro = config.anthro_female
    else:
        anthro = config.anthro_unisex
    
    depth_ratio_key = f'{body_part}_depth_ratio'
    base_ratio = anthro.get(depth_ratio_key, 0.65)
    
    # Combine prior with curvature hint
    final_ratio = base_ratio * curvature_factor
    depth_cm = width_cm * final_ratio
    
    return depth_cm


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
                        depth_stats: Optional[Dict[str, float]] = None,  # NEW
                        depth_raw: Optional[np.ndarray] = None,  # NEW
                        user_height_cm: Optional[float] = None,
                        gender: Optional[str] = None,  # NEW
                        clothing_mask: Optional[np.ndarray] = None,
                        side_depths: Optional[Dict[str, float]] = None) -> Dict[str, float]:
    h, w = image_bgr.shape[:2]
    
    # === NEW: Multi-constraint calibration ===
    scale_result = estimate_scale_with_constraints(
        landmarks, 
        (h, w), 
        user_height_cm, 
        gender
    )
    cmpp = scale_result['cmpp']
    scale_confidence = scale_result['confidence']

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
        
        # === NEW: Improved depth estimation ===
        chest_width_cm = chest_px * cmpp  # Front width (a axis)
        a = chest_width_cm / 2.0
        
        center_x = int((left_sh[0] + right_sh[0]) / 2)
        chest_depth_cm = estimate_body_depth_from_constraints(
            width_cm=chest_width_cm,
            body_part='chest',
            depth_map_normalized=depth_map,
            depth_raw=depth_raw,
            center_x=center_x,
            center_y=chest_y,
            cmpp=cmpp,
            side_depth_cm=side_depths.get('chest') if side_depths else None,
            gender=gender
        )
        b = chest_depth_cm / 2.0
        
        # Ramanujan's approximation for ellipse circumference
        h_ellipse = ((a - b) ** 2) / ((a + b) ** 2 + 1e-8)
        circ = np.pi * (a + b) * (1 + (3 * h_ellipse) / (10 + np.sqrt(4 - 3 * h_ellipse)))
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

        # === NEW: Improved depth estimation ===
        waist_width_cm = waist_px * cmpp
        a = waist_width_cm / 2.0
        
        center_x = int((left_hip[0] + right_hip[0]) / 2)
        waist_depth_cm = estimate_body_depth_from_constraints(
            width_cm=waist_width_cm,
            body_part='waist',
            depth_map_normalized=depth_map,
            depth_raw=depth_raw,
            center_x=center_x,
            center_y=waist_y,
            cmpp=cmpp,
            side_depth_cm=side_depths.get('waist') if side_depths else None,
            gender=gender
        )
        b = waist_depth_cm / 2.0
        
        # Ramanujan's approximation
        h_ellipse = ((a - b) ** 2) / ((a + b) ** 2 + 1e-8)
        circ = np.pi * (a + b) * (1 + (3 * h_ellipse) / (10 + np.sqrt(4 - 3 * h_ellipse)))
        results["waist"] = round(circ, 2)
    else:
        results["waist"] = 0.0

    # Hip
    if left_hip[0] and right_hip[0]:
        hip_px = abs(left_hip[0] - right_hip[0])
        hip_px = hip_px * 1.10
        hip_width_cm = hip_px * cmpp
        a = hip_width_cm / 2.0
        
        # === NEW: Improved depth estimation ===
        center_x = int((left_hip[0] + right_hip[0]) / 2)
        hip_y = int(left_hip[1])
        hip_depth_cm = estimate_body_depth_from_constraints(
            width_cm=hip_width_cm,
            body_part='hip',
            depth_map_normalized=depth_map,
            depth_raw=depth_raw,
            center_x=center_x,
            center_y=hip_y,
            cmpp=cmpp,
            side_depth_cm=side_depths.get('hip') if side_depths else None,
            gender=gender
        )
        b = hip_depth_cm / 2.0
        
        # Ramanujan's approximation
        h_ellipse = ((a - b) ** 2) / ((a + b) ** 2 + 1e-8)
        circ = np.pi * (a + b) * (1 + (3 * h_ellipse) / (10 + np.sqrt(4 - 3 * h_ellipse)))
        results["hip"] = round(circ, 2)
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
    
    # === NEW: Add calibration metadata ===
    results['_metadata'] = {
        'scale_confidence': scale_confidence,
        'scale_method': scale_result['method'],
        'cmpp': cmpp,
        'residuals': scale_result['residuals'],
        'depth_methods': {
            'chest': 'side_view' if (side_depths and 'chest' in side_depths) else 'anthropometric_prior',
            'waist': 'side_view' if (side_depths and 'waist' in side_depths) else 'anthropometric_prior',
            'hip': 'side_view' if (side_depths and 'hip' in side_depths) else 'anthropometric_prior'
        }
    }
    
    # === ML CORRECTION: Apply learned corrections ===
    # CRITICAL: Only apply ML when confidence is sufficient
    if ml_correction_model.available and scale_confidence >= 0.6:
        # Protect against missing required measurements
        if not all(k in results for k in ["chest", "waist", "hip"]):
            results['_metadata']['ml_correction_applied'] = False
            results['_metadata']['ml_correction_skip_reason'] = 'missing_required_measurements'
            return results
        
        # Extract features for the ML model
        # IMPORTANT: Use raw values as trained (no normalization)
        features = [
            scale_confidence,
            1.0 if side_depths else 0.0,  # Has side view
            results.get('chest', 0) / 100.0,  # Normalized chest
            results.get('waist', 0) / 100.0,  # Normalized waist
            results.get('hip', 0) / 100.0,    # Normalized hip
        ]
        
        # Get correction factor from ML model
        correction = ml_correction_model.predict_correction(features)
        
        # Apply correction to circumference measurements
        # (These are the measurements most affected by depth estimation errors)
        for key in ['chest', 'waist', 'hip', 'thigh', 'neck']:
            if key in results:
                results[key] = round(results[key] * correction, 2)
        
        # Store correction metadata
        results['_metadata']['ml_correction_applied'] = True
        results['_metadata']['ml_correction_factor'] = correction
    else:
        results['_metadata']['ml_correction_applied'] = False
        if not ml_correction_model.available:
            results['_metadata']['ml_correction_skip_reason'] = 'model_unavailable'
        elif scale_confidence < 0.6:
            results['_metadata']['ml_correction_skip_reason'] = f'low_confidence_{scale_confidence:.2f}'
    
    return results