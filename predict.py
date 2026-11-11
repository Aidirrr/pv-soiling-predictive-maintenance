#!/usr/bin/env python3
"""
=============================================================================
TEB3123 Machine Learning — Final Group Project (Group 15)
Inference Engine: Real-Time PV Soiling Power Predictor & Cleaning Alert System
=============================================================================
Usage:
    # Run with default midday conditions:
    python3 predict.py

    # Run with custom environmental sensor readings:
    python3 predict.py --gpoa 950 --tamb 36 --tcell 58 --rh 22 --ws 3.0 --cc 0 --dust 14.5
=============================================================================
"""

import argparse
import os
import pickle
import sys

# Import model class definitions from train_evaluate for unpickling
from train_evaluate import (
    DecisionTreeNode,
    RegressionTree,
    RandomForestModel,
    RidgeRegressionModel,
    XGBoostProxyModel,
)


def load_model(model_path):
    if not os.path.exists(model_path):
        raise FileNotFoundError(
            f"Model file not found at: {model_path}\n"
            "Please run 'python3 train_evaluate.py' first to train and serialize the models."
        )
    with open(model_path, "rb") as f:
        return pickle.load(f)


def main():
    parser = argparse.ArgumentParser(
        description="Predict dust-affected PV power output and dispatch maintenance cleaning alerts."
    )
    parser.add_argument("--gpoa", type=float, default=850.0, help="In-plane solar irradiance in W/m² (default: 850)")
    parser.add_argument("--tamb", type=float, default=33.0, help="Ambient temperature in °C (default: 33.0)")
    parser.add_argument("--tcell", type=float, default=52.0, help="PV cell operating temperature in °C (default: 52.0)")
    parser.add_argument("--rh", type=float, default=25.0, help="Relative humidity in %% (default: 25.0)")
    parser.add_argument("--ws", type=float, default=3.5, help="Wind speed in m/s (default: 3.5)")
    parser.add_argument("--cc", type=float, default=0.0, help="Cloud cover percentage (default: 0.0)")
    parser.add_argument("--dust", type=float, default=12.0, help="Surface dust density in g/m² (default: 12.0)")
    parser.add_argument("--model", type=str, default="xgboost", choices=["xgboost", "random_forest", "ridge"],
                        help="Model architecture to use for prediction (default: xgboost)")

    args = parser.parse_args()

    # Derived physics features
    delta_t = args.tcell - args.tamb

    # Prepare feature vector: [G_POA, T_amb, T_cell, RH, wind_speed, cloud_cover, dust_density_PCHIP, Delta_T]
    feature_vector = [args.gpoa, args.tamb, args.tcell, args.rh, args.ws, args.cc, args.dust, delta_t]

    # Resolve model path
    script_dir = os.path.dirname(os.path.abspath(__file__))
    model_file = os.path.join(script_dir, "models", f"{args.model}_model.pkl")

    model = load_model(model_file)

    # Perform inference (single sample)
    p_dusty_pred = max(0.0, model.predict([feature_vector])[0])

    # Theoretical clean module reference power (~81.8 W at 1000 W/m² STC, accounting for temp derating)
    # P_clean ~ G_POA / 1000 * 85W * (1 - 0.004 * (T_cell - 25))
    temp_derate = max(0.65, 1.0 - 0.004 * (args.tcell - 25.0))
    p_clean_est = (args.gpoa / 1000.0) * 85.0 * temp_derate
    soiling_loss = max(0.0, p_clean_est - p_dusty_pred)
    loss_pct = (soiling_loss / p_clean_est * 100.0) if p_clean_est > 0 else 0.0

    print("=" * 76)
    print(" ☀️  PV SOILING PREDICTIVE MAINTENANCE INFERENCE ENGINE")
    print("     Laghouat Saharan Solar Testbed · Group 15 · Universiti Teknologi PETRONAS")
    print("=" * 76)
    print(f"[*] Loaded Model Architecture : {args.model.upper()} ({model_file})")
    print("\n[INPUT ENVIRONMENTAL TELEMETRY]")
    print(f"  • Solar Irradiance (G_POA)      : {args.gpoa:6.1f} W/m²")
    print(f"  • Ambient Air Temp (T_amb)      : {args.tamb:6.1f} °C")
    print(f"  • PV Cell Temperature (T_cell)  : {args.tcell:6.1f} °C")
    print(f"  • Thermal Gradient (Delta_T)    : {delta_t:6.1f} °C  (T_cell - T_amb)")
    print(f"  • Relative Humidity (RH)        : {args.rh:6.1f} %")
    print(f"  • Convective Wind Speed         : {args.ws:6.1f} m/s")
    print(f"  • Atmospheric Cloud Cover       : {args.cc:6.1f} %")
    print(f"  • Surface Dust Density (PCHIP)  : {args.dust:6.1f} g/m²")
    print("-" * 76)

    print("[PREDICTION OUTPUT]")
    print(f"  • Unsoiled Clean Reference Power : {p_clean_est:6.2f} Watts")
    print(f"  • Dust-Affected Generated Power  : {p_dusty_pred:6.2f} Watts")
    print(f"  • Predicted Soiling Deficit (ΔP) : {soiling_loss:6.2f} Watts ({loss_pct:4.1f}% capacity loss)")
    print("-" * 76)

    # Automated Maintenance Dispatch Rule (Chapter 6 & 7)
    print("[CONDITION-BASED MAINTENANCE DISPATCH STATUS]")
    if soiling_loss >= 10.0 and args.gpoa > 600.0:
        print("  🚨 [CRITICAL ALERT — IMMEDIATE CLEANING DISPATCH REQUIRED]")
        print(f"     Reason: Soiling power loss ({soiling_loss:.2f} W) exceeds the 10.0 W threshold")
        print(f"     under high irradiance ({args.gpoa:.0f} W/m²).")
        print("     Action: Dispatch automated cleaning crew / robotic wash immediately.")
    elif soiling_loss >= 6.0:
        print("  ⚠️  [WARNING — ELEVATED SOILING DETECTED]")
        print(f"     Reason: Power deficit ({soiling_loss:.2f} W) indicates growing particulate layer.")
        print("     Action: Schedule panel washing within next 48 operational hours.")
    else:
        print("  ✅ [NORMAL OPERATION — MODULE CLEAN]")
        print(f"     Reason: Soiling loss ({soiling_loss:.2f} W) is within acceptable tolerance (< 6.0 W).")
        print("     Action: No washing required. Conserving maintenance groundwater.")
    print("=" * 76)


if __name__ == "__main__":
    main()
