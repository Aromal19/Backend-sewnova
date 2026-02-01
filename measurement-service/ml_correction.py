import joblib
import os
import numpy as np

MODEL_PATH = "models/measurement_correction_model.pkl"

class MeasurementCorrectionModel:
    def __init__(self):
        self.model = None
        self.available = False
        self._load_model()

    def _load_model(self):
        if not os.path.exists(MODEL_PATH):
            return
        try:
            self.model = joblib.load(MODEL_PATH)
            self.available = True
        except Exception:
            self.available = False

    def predict_correction(self, features):
        if not self.available:
            return 1.0  # fallback: no correction

        correction = float(self.model.predict([features])[0])
        return float(np.clip(correction, 0.95, 1.05))
