# TEB3123 Machine Learning — Final Project Front Matter
## Executive Summary & Required One-Page Project Infographic

**Project Title:** Predictive Maintenance for Solar PV Panels: Dust-Induced Performance Degradation Modeling Using Machine Learning  
**Lecture Session Group:** Group 2 | **Project Group No.:** 15  
**Team Members:**  
1. Muhammad Khaidhir Bin Mohd Razin (Student ID: 22007399)  
2. Nor Amirah Syahida Binti Baharuddin (Student ID: 22007850)  
**UTP Grand Challenge:** Energy Security | **Relevant SDG:** SDG 7 – Affordable and Clean Energy (Target 7.2)  

---

# Executive Summary

Solar photovoltaic (PV) systems operating in arid and desert environments experience severe performance degradation due to atmospheric dust deposition, commonly known as soiling. Unmonitored dust accumulation diminishes electrical generation, directly undermining renewable energy security, while routine calendar-based washing consumes scarce water resources. Aligned with Universiti Teknologi PETRONAS (UTP) Grand Challenge of Energy Security and United Nations Sustainable Development Goal 7 (Target 7.2: Affordable and Clean Energy), this study develops an empirical predictive maintenance framework to guide solar facility managers and asset operators.

The investigation utilizes a continuous multi-sensor telemetry dataset collected over six consecutive months (February to August 2022) at Laghouat, Algeria. The raw 4,368-hour dataset was preprocessed to isolate 2,262 daylight generating hours by filtering out non-generating periods ($G_{POA} \le 10\text{ W/m}^2$) to eliminate severe zero-inflation distortion. A supervised regression pipeline was formulated to predict dust-affected PV power output ($P_{dusty\_W}$) from meteorological, thermal, and dust accumulation features, using a strict chronological 70/30 train/test split and 5-fold expanding-window time-series cross-validation.

Evaluated across candidate architectures, the Gradient Boosted Trees (XGBoost) model demonstrated superior generalization on the prospective summer test set, achieving a Mean Absolute Error (MAE) of 1.24 W, Root Mean Squared Error (RMSE) of 1.85 W, and $R^2$ of 0.9928. This represents a 93.9% error reduction over the naive baseline and substantially outperforms regularized linear regression (MAE 3.58 W, $R^2$ 0.9639). Empirical findings reveal that dust accumulation causes up to 21.08 W (24.8%) peak midday capacity loss on an 85 W module, while extreme operating temperatures ($T_{cell} > 50^\circ\text{C}$) introduce non-linear thermal derating that tree ensembles capture effectively.

Facility managers are recommended to adopt a condition-based cleaning trigger: initiating washing only when predicted recoverable loss exceeds 10.0 W for at least three consecutive peak irradiance hours ($G_{POA} > 600\text{ W/m}^2$). This strategy avoids premature washing, conserving up to 40% of maintenance water while safeguarding renewable energy yields. The principal limitation is the single-location semi-arid scope, requiring field transfer recalibration for different panel tilt angles and local airborne particulate chemistries.

*(Word Count: 322 words — strictly adheres to the 250–350 words rubric requirement)*

---

# Required One-Page Project Infographic

> **Note for Report Assembly:** Place this infographic immediately after the Executive Summary and before the Table of Contents as specified in the TEB3123 guidelines. You can embed the visual cards and diagrams below directly into Word, or export them to Canva/PowerPoint for a stylized one-page sheet.

```
========================================================================================================
                                 PROJECT INFOGRAPHIC: AT A GLANCE
 PREDICTIVE MAINTENANCE FOR SOLAR PV PANELS: DUST-INDUCED DEGRADATION MODELING USING MACHINE LEARNING
         UTP Grand Challenge: Energy Security  |  SDG 7: Affordable & Clean Energy (Target 7.2)
                            Group 2 — Project Group 15 (Khaidhir & Amirah)
========================================================================================================

┌───────────────────────────────────────┐               ┌──────────────────────────────────────┐
│ 1. THE SUSTAINABILITY PROBLEM         │               │ 2. DATASET SNAPSHOT                  │
├───────────────────────────────────────┤               ├──────────────────────────────────────┤
│ • Atmospheric dust (soiling) blocks   │               │ • Source: URAER, Laghouat, Algeria   │
│   solar radiation from PV cells.      │               │ • Scope: Feb 17 to Aug 17, 2022      │
│ • Unmonitored soiling causes up to    │               │ • Raw Data: 4,368 Hourly Records     │
│   24.8% peak power loss.              │               │ • Clean Operational Set: 2,262 Hours │
│ • Routine calendar cleaning wastes    │               │   (G_POA <= 10 W/m² filtered out)    │
│   water in hyper-arid regions.        │               │ • Inputs: G_POA, T_amb, T_cell, RH,  │
│ • Target Stakeholders: Solar Plant    │               │   Wind, Cloud, PCHIP Dust, Delta_T   │
│   Asset Managers & Facility Engineers.│               │ • Target: Dusty Output P_dusty (W)   │
└───────────────────────────────────────┘               └──────────────────────────────────────┘

                                        ▼                               ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 3. END-TO-END MACHINE LEARNING METHODOLOGY                                                           │
├──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│   Telemetry Ingestion ──► Domain Engineering ──► Chronological Partitioning ──► Algorithmic Benchmarking
│   • 14 Sensor Channels    • Delta_T (T_cell-T_amb) • 70% Train (Feb - Jun 2022) • Baseline Mean      │
│   • PCHIP Dust Validation • Derated Irradiance    • 30% Test (Jun - Aug 2022)  • Ridge Linear Reg    │
│   • Zero Missing Impute   • Memory Dry Hours      • 5-Fold Expanding TS-CV     • Random Forest (30)  │
│   • Nighttime Filtered    • Cyclical Hour Encode  • Zero Look-Ahead Bias       • XGBoost Reg (40)    │
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘

                                        ▼                               ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 4. QUANTITATIVE BENCHMARKING (PROSPECTIVE HELD-OUT TEST SET: 679 HOURS)                              │
├───────────────────────────────────────────┬──────────────┬──────────────┬─────────────┬──────────────┤
│ Model Architecture                        │ MAE (Watts)  │ RMSE (Watts) │ R² Score    │ Error Reduct.│
├───────────────────────────────────────────┼──────────────┼──────────────┼─────────────┼──────────────┤
│ Naïve Historical Mean Baseline            │ 20.45 W      │ 21.90 W      │ -0.0005     │ Reference    │
│ Ridge Linear Regression (λ = 1.0)         │ 3.58 W       │ 4.16 W       │ 0.9639      │ 82.5%        │
│ Random Forest Regressor (B = 30)          │ 1.77 W       │ 2.43 W       │ 0.9877      │ 91.3%        │
│ Gradient Boosted Trees (XGBoost) ★ WINNER │ 1.24 W       │ 1.85 W       │ 0.9928      │ 93.9%        │
└───────────────────────────────────────────┴──────────────┴──────────────┴─────────────┴──────────────┘

                                        ▼                               ▼
┌───────────────────────────────────────┐               ┌──────────────────────────────────────┐
│ 5. KEY EMPIRICAL FINDINGS             │               │ 6. ACTIONABLE MAINTENANCE PROTOCOL   │
├───────────────────────────────────────┤               ├──────────────────────────────────────┤
│ • Peak Capacity Degradation: Midday   │               │ • Decision Trigger: Clean modules    │
│   soiling loss reached 21.08 W (24.8% │               │   when recoverable loss ΔP >= 10.0 W │
│   on an 85 W SolarWorld module).      │               │   for >= 3 consecutive midday hours. │
│ • Severe Thermal Stress: Cell temp    │               │ • Sustainability Impact:             │
│   exceeded 50°C for 335 test hours;   │               │   - Up to 40% water conservation     │
│   XGBoost maintained 1.73 W MAE.      │               │     by stopping premature cleanings. │
│ • Feature Importance (Variance Gain): │               │   - Recovers up to 13.4% unmonitored │
│   - Delta_T: 90.81%                   │               │     seasonal energy yield loss.      │
│   - In-Plane Irradiance: 6.69%        │               │ • Key Limitation: Single semi-arid   │
│   - PCHIP Dust Density: 1.65%         │               │   location; recalibration needed     │
│   - Ambient Temperature: 0.83%        │               │   for varying tilt and dust types.   │
└───────────────────────────────────────┘               └──────────────────────────────────────┘
========================================================================================================
```
