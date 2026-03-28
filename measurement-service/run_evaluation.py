"""
run_evaluation.py — Automated evaluation runner.

Usage:
    python run_evaluation.py

Reads images from     DATASET/<set_id>/front_img.jpg
Reads ground truth from  DATASET/Body Measurements Image Dataset.csv
Runs all 3 modes, saves result CSVs, prints metrics.

This file is ADDITIVE — delete to revert.
"""

import os
import sys
import csv
import math
import time
from collections import defaultdict

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
MODES = ["baseline_2d", "segmentation_only", "full_corrected"]

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(SCRIPT_DIR, "DATASET")
GROUND_TRUTH_PATH = os.path.join(DATASET_DIR, "Body Measurements Image Dataset.csv")
OUTPUT_DIR = SCRIPT_DIR  # CSVs saved next to this script

# Column mapping from Kaggle CSV → our pipeline keys
GT_COLUMN_MAP = {
    "chest": "chest_circumference_cm",
    "waist": "waist_circumference_cm",
    "hip":   "hips_circumference_cm",
}

MEASUREMENT_KEYS = ["chest", "waist", "hip"]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def clean_value(val: str) -> float:
    """Strip '_tbr' suffix and convert to float. Return 0.0 on failure."""
    if not val or val.strip() == "":
        return 0.0
    val = val.strip().replace("_tbr", "")
    try:
        return float(val)
    except ValueError:
        return 0.0


def load_ground_truth(csv_path: str) -> list[dict]:
    """Load the Kaggle ground truth CSV into a list of dicts."""
    if not os.path.exists(csv_path):
        print(f"ERROR: Ground truth file not found: {csv_path}")
        sys.exit(1)

    rows = []
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    return rows


def find_front_image(dataset_dir: str, set_id: str) -> str | None:
    """Find front_img.jpg in the subject folder."""
    folder = os.path.join(dataset_dir, str(set_id))
    if not os.path.isdir(folder):
        return None
    for name in ("front_img.jpg", "front_img.jpeg", "front_img.png"):
        path = os.path.join(folder, name)
        if os.path.exists(path):
            return path
    return None


def mae(errors: list[float]) -> float:
    return sum(abs(e) for e in errors) / len(errors) if errors else 0.0


def rmse(errors: list[float]) -> float:
    return math.sqrt(sum(e ** 2 for e in errors) / len(errors)) if errors else 0.0


def pct_improvement(baseline_mae: float, new_mae: float) -> float:
    if baseline_mae == 0:
        return 0.0
    return ((baseline_mae - new_mae) / baseline_mae) * 100


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    # Lazy-import so model loading happens once
    from get_measurements import get_measurements

    # 1) Load ground truth
    gt_rows = load_ground_truth(GROUND_TRUTH_PATH)
    if not gt_rows:
        print("Ground truth CSV is empty. Add rows and try again.")
        sys.exit(1)

    print(f"Loaded {len(gt_rows)} ground truth entries.")
    print(f"Looking for images in: {DATASET_DIR}/<set_id>/front_img.jpg\n")

    # 2) Run each mode
    all_results: dict[str, list[dict]] = {}  # mode -> list of result rows

    for mode in MODES:
        print("=" * 50)
        print(f"  Running mode: {mode}")
        print("=" * 50)

        results = []
        for gt in gt_rows:
            set_id = gt.get("set_id", "").strip()
            img_path = find_front_image(DATASET_DIR, set_id)

            if img_path is None:
                print(f"  [SKIP] No front image found for set_id={set_id}")
                continue

            height_cm = clean_value(gt.get("height", ""))
            gender_raw = gt.get("gender", "").strip().lower()
            gender = "M" if gender_raw == "male" else ("F" if gender_raw == "female" else None)

            try:
                t0 = time.time()
                preds = get_measurements(img_path, mode=mode,
                                         height_cm=height_cm if height_cm > 0 else None,
                                         gender=gender)
                elapsed = time.time() - t0
                print(f"  [OK]   set_id={set_id}  ({elapsed:.1f}s)  "
                      f"chest={preds.get('chest', 'N/A')}, "
                      f"waist={preds.get('waist', 'N/A')}, "
                      f"hip={preds.get('hip', 'N/A')}")
            except Exception as e:
                print(f"  [FAIL] set_id={set_id}: {e}")
                continue

            row = {"ID": set_id}
            for key in MEASUREMENT_KEYS:
                gt_col = GT_COLUMN_MAP[key]
                actual = clean_value(gt.get(gt_col, "0"))
                pred = preds.get(key, 0.0)
                error = abs(pred - actual)
                row[f"{key}_actual"] = actual
                row[f"{key}_pred"] = round(pred, 2)
                row[f"{key}_error"] = round(error, 2)

            # Tag category based on image quality (all "clean" for this dataset)
            row["category"] = "clean"

            results.append(row)

        all_results[mode] = results
        print(f"  Processed {len(results)} images for {mode}\n")

    # 3) Save CSV files
    for mode, results in all_results.items():
        csv_path = os.path.join(OUTPUT_DIR, f"results_{mode}.csv")
        if not results:
            print(f"No results for {mode}, skipping CSV.")
            continue

        fieldnames = list(results[0].keys())
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(results)
        print(f"Saved: {csv_path}")

    # 4) Compute & print metrics
    print("\n")
    print("=" * 55)
    print("           EVALUATION SUMMARY")
    print("=" * 55)

    baseline_maes = {}  # key -> MAE for baseline_2d

    for mode in MODES:
        results = all_results.get(mode, [])
        if not results:
            print(f"\nMode: {mode}  — no results\n")
            continue

        errors_by_key: dict[str, list[float]] = defaultdict(list)
        for row in results:
            for key in MEASUREMENT_KEYS:
                errors_by_key[key].append(row[f"{key}_error"])

        mae_vals = {k: mae(v) for k, v in errors_by_key.items()}
        rmse_vals = {k: rmse(v) for k, v in errors_by_key.items()}
        mae_avg = mae([e for errs in errors_by_key.values() for e in errs])

        print(f"\n{'-' * 55}")
        print(f"  Mode: {mode}   ({len(results)} images)")
        print(f"{'-' * 55}")
        for key in MEASUREMENT_KEYS:
            print(f"    MAE_{key:6s} = {mae_vals[key]:7.2f} cm    "
                  f"RMSE_{key:6s} = {rmse_vals[key]:7.2f} cm")
        print(f"    MAE_avg    = {mae_avg:7.2f} cm")

        if mode == "baseline_2d":
            baseline_maes = mae_vals.copy()
            baseline_maes["avg"] = mae_avg
        else:
            if baseline_maes:
                imp = pct_improvement(baseline_maes.get("avg", 0), mae_avg)
                print(f"    Improvement from baseline: {imp:+.1f} %")

    # 5) Robustness split (if category column present)
    any_has_category = any(
        "category" in row
        for results in all_results.values()
        for row in results
    )

    if any_has_category:
        print(f"\n\n{'=' * 55}")
        print("       ROBUSTNESS SPLIT (by category)")
        print(f"{'=' * 55}")

        for mode in MODES:
            results = all_results.get(mode, [])
            if not results:
                continue

            by_cat: dict[str, list[dict]] = defaultdict(list)
            for row in results:
                cat = row.get("category", "unknown")
                by_cat[cat].append(row)

            print(f"\n  Mode: {mode}")
            for cat, cat_rows in sorted(by_cat.items()):
                errors_all = []
                for key in MEASUREMENT_KEYS:
                    errs = [r[f"{key}_error"] for r in cat_rows]
                    errors_all.extend(errs)
                cat_mae = mae(errors_all)
                print(f"    [{cat:12s}]  n={len(cat_rows):3d}  MAE_avg = {cat_mae:.2f} cm")

    print(f"\n{'=' * 55}")
    print("  Evaluation complete.")
    print(f"{'=' * 55}\n")


if __name__ == "__main__":
    main()
