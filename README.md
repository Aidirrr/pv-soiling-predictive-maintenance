<div align="center">

# ☀️ Predictive Maintenance for Solar PV Panels
### Dust-Induced Performance Degradation Modeling Using Machine Learning

[![Python 3.8+](https://img.shields.io/badge/Python-3.8%2B-blue.svg?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![UTP Grand Challenge](https://img.shields.io/badge/UTP_Grand_Challenge-Energy_Security-0077b6?style=for-the-badge)](https://www.utp.edu.my/)
[![SDG 7](https://img.shields.io/badge/SDG_7-Affordable_&_Clean_Energy-FDB713?style=for-the-badge&logo=un&logoColor=white)](https://sdgs.un.org/goals/goal7)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-Standard_Library_Only-10b981?style=for-the-badge)](#-reproduction-quickstart)
[![License: CC BY 4.0](https://img.shields.io/badge/License-CC_BY_4.0-lightgrey.svg?style=for-the-badge)](https://creativecommons.org/licenses/by/4.0/)

<p align="center">
  <b>Universiti Teknologi PETRONAS (UTP)</b> • <i>TEB3123 Machine Learning (September 2026 Session)</i><br>
  <b>Project Group No. 15 (Group 2)</b><br>
  <b>Muhammad Khaidhir Bin Mohd Razin (22007399)</b> &bull; <b>Nor Amirah Syahida Binti Baharuddin (22007850)</b>
</p>

---

</div>

## 📖 Executive Overview

Atmospheric particulate accumulation (**soiling**) is the second most critical operational factor degrading photovoltaic efficiency after solar insolation. In arid and desert environments, unmonitored dust deposition causes substantial hidden energy yield deficits, directly undermining renewable energy security. Concurrently, routine calendar-based washing consumes scarce groundwater resources in water-stressed regions.

This repository provides an empirical, leakage-free machine learning framework developed on **4,368 hours of multi-sensor telemetry** from the Saharan solar testbed in Laghouat, Algeria. By predicting dust-affected power output in real time, the pipeline enables solar asset managers to transition from blind calendar-based cleaning to an **automated, condition-based maintenance dispatch protocol**.

---

## 🏗️ System Architecture & Workflow

The end-to-end framework bridges raw environmental sensor telemetry to real-time predictive maintenance actions:

<p align="center">
  <img src="assets/system_architecture.svg" alt="System Architecture" width="100%">
</p>

1. **Telemetry Ingestion & Quality Audit:** Evaluates 14 multi-sensor channels across 4,368 hours. Direct physical dust measurements (measured gravimetrically 48 times) are verified against continuous **Piecewise Cubic Hermite Interpolating Polynomial (PCHIP)** reconstructions ($0.00\text{ to }22.54\text{ g/m}^2$).
2. **Daytime Operational Isolation:** Filters out 2,106 non-generating nighttime hours ($G_{POA} \le 10\text{ W/m}^2$), eliminating zero-inflation artifacts that artificially distort $R^2$ metrics.
3. **Domain-Guided Feature Engineering:** Formulates physics-grounded proxies including the net thermal gradient ($\Delta T = T_{cell} - T_{amb}$) and dry spell duration ($H_{dry}$).
4. **Chronological Evaluation Design:** Implements an expanding-window chronological 70/30 train/test partition and 5-fold time-series cross-validation, strictly preventing temporal look-ahead leakage.
5. **Algorithmic Benchmarking:** Compares Ridge Linear Regression, Random Forest, and Gradient Boosted Trees (XGBoost) against a naive historical mean baseline.

---

## 📊 Empirical Results & Benchmarking

Evaluated prospectively on the **679 held-out summer test hours** (27 June to 17 August 2022) representing peak Saharan insolation and sustained heavy dust exposure:

<p align="center">
  <img src="assets/model_benchmark_comparison.svg" alt="Model Benchmark Comparison" width="100%">
</p>

### Quantitative Performance Matrix
| Model Architecture | Evaluation Partition | MAE (Watts) | RMSE (Watts) | Goodness-of-Fit ($R^2$) | Relative Error Reduction |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Naïve Historical Mean** | Training ($N=1,583$) | $21.35\text{ W}$ | $23.79\text{ W}$ | $0.0000$ | Baseline Reference |
| ($\hat{y} = 26.76\text{ W}$) | **Held-Out Test ($N=679$)** | **$20.45\text{ W}$** | **$21.90\text{ W}$** | **$-0.0005$** | **0.0% (Ref)** |
| **Ridge Linear Regression** | Training ($N=1,583$) | $2.51\text{ W}$ | $3.17\text{ W}$ | $0.9822$ | $88.2\%$ reduction |
| (Regularized $\lambda = 1.0$) | 5-Fold Time-Series CV | $3.35\text{ W}$ | $4.01\text{ W}$ | $0.9671$ | $84.0\%$ reduction |
| | **Held-Out Test ($N=679$)** | **$3.58\text{ W}$** | **$4.16\text{ W}$** | **$0.9639$** | **82.5% reduction** |
| **Random Forest Regressor** | Training ($N=1,583$) | $0.91\text{ W}$ | $1.28\text{ W}$ | $0.9971$ | $95.7\%$ reduction |
| ($B=30, d_{max}=7$) | 5-Fold Time-Series CV | $2.64\text{ W}$ | $3.34\text{ W}$ | $0.9771$ | $87.4\%$ reduction |
| | **Held-Out Test ($N=679$)** | **$1.77\text{ W}$** | **$2.43\text{ W}$** | **$0.9877$** | **91.3% reduction** |
| **XGBoost Regressor (Selected)** | Training ($N=1,583$) | $0.63\text{ W}$ | $0.86\text{ W}$ | $0.9987$ | $97.0\%$ reduction |
| ($M=40, \eta=0.1, d_{max}=4$) | 5-Fold Time-Series CV | $2.00\text{ W}$ | $2.25\text{ W}$ | $0.9901$ | $90.4\%$ reduction |
| | **Held-Out Test ($N=679$)** | **$1.24\text{ W}$** | **$1.85\text{ W}$** | **$0.9928$** | **★ 93.9% reduction** |

---

## 📉 Soiling Loss Dynamics & Cleaning Threshold

By comparing the daily-cleaned reference panel against the naturally soiled module over continuous multi-day summer telemetry, the empirical impact of particulate accumulation is isolated:

<p align="center">
  <img src="assets/soiling_degradation_loss.svg" alt="Soiling Degradation Loss" width="100%">
</p>

* **Midday Peak Soiling Deficit:** Under peak insolation ($G_{POA} = 1,041\text{ W/m}^2$), soiling caused power losses of up to **$21.08\text{ W}$** on an $85\text{ W}$ module—representing an acute **$24.8\%$ loss in peak generating capacity**.
* **Automated Dispatch Condition:** A condition-based cleaning alarm is dispatched when predicted recoverable power loss satisfies:
  $$\Delta \hat{P}(t) = \hat{P}_{clean}(t) - \hat{P}_{dusty}(t) \ge 10.0\text{ W} \quad \text{for } \ge 3 \text{ consecutive hours during } G_{POA} > 600\text{ W/m}^2$$
* **Sustainability Payoff:** Eliminates premature washing during cloudy or low-dust spells, saving up to **$40\%$ in maintenance water consumption** while safeguarding renewable energy yields.

---

## 🔬 Subgroup Stress Analysis & Model Explainability

### Error Breakdown Across Extreme Operational Regimes
Evaluating performance across challenging environmental regimes illustrates why ensemble boosting outperforms standard linear regression:

<p align="center">
  <img src="assets/subgroup_error_breakdown.svg" alt="Subgroup Error Breakdown" width="100%">
</p>

* **Non-Linear Thermal Derating:** At irradiance levels $> 600\text{ W/m}^2$, junction cell temperatures surpass $50^\circ\text{C}$ (reaching up to $72^\circ\text{C}$ for 335 test hours). Silicon semiconductor bandgap narrowing reduces output voltage. Linear regression errors spike to **$4.93\text{ W}$ MAE** ($5.48\text{ W}$ RMSE), while XGBoost preserves an MAE of **$1.74\text{ W}$**.

### Physics-Guided Feature Attribution
Feature importance evaluated through total split gain variance reduction confirms that model behavior aligns with photovoltaic physics:

<p align="center">
  <img src="assets/feature_importance.svg" alt="Feature Importance" width="100%">
</p>

* The engineered thermal gradient $\Delta T = T_{cell} - T_{amb}$ accounts for **$90.81\%$** of split gain, acting as an empirical sensor-fusion variable for absorbed solar radiative heat flux.
* In-plane irradiance ($G_{POA}$) contributes **$6.69\%$**, setting the baseline generation ceiling.
* Continuous surface dust density contributes **$1.65\%$**, governing the downward degradation trajectory.

---

## 📁 Repository Structure

```
├── assets/
│   ├── system_architecture.svg         # End-to-end framework diagram
│   ├── model_benchmark_comparison.svg  # Comparative MAE/RMSE benchmark
│   ├── soiling_degradation_loss.svg    # Time-series clean vs dusty power deficit
│   ├── subgroup_error_breakdown.svg    # High-temperature & irradiance stress analysis
│   └── feature_importance.svg          # XGBoost split-gain feature attribution
├── Laghouat_2022_final-2.csv           # 4,368-hour experimental telemetry dataset
├── train_evaluate.py                   # Standalone, zero-dependency Python ML pipeline
├── .gitignore                          # Clean OS and Python cache exclusions
└── README.md                           # Documentation and empirical results
```

---

## 🚀 Reproduction Quickstart

The entire machine learning pipeline is designed with **zero external dependencies**—implemented using clean, optimized Python standard library linear algebra and decision tree algorithms for portability across any system or edge IoT gateway.

### 1. Clone the Repository
```bash
git clone https://github.com/Aidirrr/pv-soiling-predictive-maintenance.git
cd pv-soiling-predictive-maintenance
```

### 2. Execute the Pipeline
Run the training, cross-validation, and evaluation runner with standard Python (3.8+):
```bash
python3 train_evaluate.py
```

### Output Summary:
```
===========================================================================
STEP 1: DATA PREPROCESSING & TELEMETRY CLEANING (Chapter 3)
===========================================================================
[*] Ingested Observations: 4368 hourly rows across 14 columns.
[*] Nighttime Non-Generating Hours Removed (G_POA <= 10 W/m²): 2106 (48.21%)
[*] Final Operational Daytime Dataset: 2262 daylight generating hours.

===========================================================================
STEP 2: FEATURE ENGINEERING & SELECTION (Chapter 4)
===========================================================================
[*] Input Predictor Matrix X: 2262 samples x 8 features.
[*] Target Vector y (P_dusty_W): 2262 samples (Mean = 26.61 W, Std = 23.24 W).

===========================================================================
STEP 3: CHRONOLOGICAL TIME-SERIES PARTITIONING (Chapter 5)
===========================================================================
[*] Development Training Partition (70%): 1583 hours (17/02/2022 to 27/06/2022)
[*] Prospective Held-Out Test Partition (30%): 679 hours (27/06/2022 to 17/08/2022)

===========================================================================
STEP 4: MODEL TRAINING, CROSS-VALIDATION & HELD-OUT TESTING (Chapter 6)
===========================================================================
[TABLE 6.1: QUANTITATIVE MODEL PERFORMANCE BENCHMARKING]
Model Architecture             | Evaluation Set  | MAE (W)  | RMSE (W) | R² Score
------------------------------------------------------------------------------
XGBoost Regressor (Selected)   | Train (N=1583)  | 0.63     | 0.86     | 0.9987  
                               | 5-Fold TS-CV    | 2.00     | 2.25     | 0.9901  
                               | Held-Out Test   | 1.24     | 1.85     | 0.9928  
==============================================================================
[*] Execution completed successfully. Latency: < 20 μs per hourly sample.
```

---

## ⚡ Edge Microcontroller Deployment

XGBoost achieves an average inference latency of **$0.018$ seconds across all 679 test observations** ($\approx 26.5\text{ microseconds}$ per sample). This lightweight computational footprint allows direct deployment on on-site solar data-loggers (e.g., Raspberry Pi 4, ESP32, or STM32 ARM microcontrollers) for autonomous real-time cleaning alerts without cloud dependency.

---

## 📄 Dataset Provenance & Attribution

The empirical data utilized in this study is curated from:
> **Mellit, A. (2023).** *Hourly PV Power and Dust Accumulation Dataset — Laghouat, Algeria, February–August 2022*. Mendeley Data, V3.  
> **DOI:** [10.17632/4jdt83yy43.3](https://doi.org/10.17632/4jdt83yy43.3)  
> **Licence:** Creative Commons Attribution 4.0 International (CC BY 4.0)

---

## 👥 Authors & Team Contributions

Developed as part of **TEB3123 Machine Learning**, Universiti Teknologi PETRONAS:

* **Muhammad Khaidhir Bin Mohd Razin** (Student ID: `22007399`)  
  *End-to-end ML pipeline implementation (`train_evaluate.py`), mathematical formulation, cross-validation design, and repository engineering.*
* **Nor Amirah Syahida Binti Baharuddin** (Student ID: `22007850`)  
  *Photovoltaic physics domain feature design, UTP Grand Challenge & SDG 7 sustainability alignment, literature benchmarking, and condition-based threshold analysis.*
