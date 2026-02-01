
import sys
import os

# Add current dir to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from ml_correction import MeasurementCorrectionModel

print("--- Starting Model Load ---")
try:
    m = MeasurementCorrectionModel()
    print(f"Model available: {m.available}")
except Exception as e:
    print(f"Caught exception outside class: {e}")
print("--- End Model Load ---")
