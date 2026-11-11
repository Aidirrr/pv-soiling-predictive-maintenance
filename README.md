# Predictive Maintenance for Solar PV Panels: Dust-Induced Performance Degradation Modeling Using Machine Learning

**Course:** TEB3123 Machine Learning (September 2026 Session)  
**Institution:** Universiti Teknologi PETRONAS (UTP)  
**Group:** Lecture Session Group 2 | Project Group No. 15  
**Team Members:**  
- Muhammad Khaidhir Bin Mohd Razin (Student ID: 22007399)  
- Nor Amirah Syahida Binti Baharuddin (Student ID: 22007850)  
**UTP Grand Challenge:** Energy Security  
**Relevant SDG:** SDG 7 – Affordable and Clean Energy (Target 7.2)  

---

## 📌 Project Overview
This repository contains the official machine learning implementation for modeling dust accumulation and performance degradation in solar photovoltaic (PV) modules operating in arid desert environments (Laghouat, Algeria). 

Using multi-sensor telemetry recorded over 4,368 hours (February–August 2022), the project evaluates Ridge Linear Regression, Random Forest, and Gradient Boosted Trees (XGBoost) across chronological time-series partitions to predict dust-affected power output and establish condition-based predictive maintenance thresholds.

---

## 📊 Summary of Quantitative Results

### Model Performance Comparison
| Model Architecture | Evaluation Partition | MAE (W) | RMSE (W) | $R^2$ Score | Error Reduction vs Baseline |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Naïve Historical Mean** | Train ($N=1,583$) | 21.35 | 23.79 | 0.0000 | Baseline |
| ($\hat{y} = 26.76\text{ W}$) | Held-Out Test ($N=679$) | 20.45 | 21.90 | -0.0005 | Ref |
| **Ridge Linear Regression** | Train ($N=1,583$) | 2.51 | 3.17 | 0.9822 | 88.2% |
| ($\lambda = 1.0$) | 5-Fold Time-Series CV | 3.35 | 4.01 | 0.9671 | 84.0% |
| | **Held-Out Test ($N=679$)** | **3.58** | **4.16** | **0.9639** | **82.5%** |
| **Random Forest Regressor** | Train ($N=1,583$) | 0.91 | 1.28 | 0.9971 | 95.7% |
| ($B=30, d_{max}=7$) | 5-Fold Time-Series CV | 2.64 | 3.34 | 0.9771 | 87.4% |
| | **Held-Out Test ($N=679$)** | **1.77** | **2.43** | **0.9877** | **91.3%** |
| **XGBoost Regressor (Selected)** | Train ($N=1,583$) | 0.63 | 0.86 | 0.9987 | 97.0% |
| ($M=40, \eta=0.1, d_{max}=4$) | 5-Fold Time-Series CV | 2.00 | 2.25 | 0.9901 | 90.4% |
| | **Held-Out Test ($N=679$)** | **1.24** | **1.85** | **0.9928** | **93.9%** |

---

## 🛠️ Repository Structure
```
├── Laghouat_2022_final-2.csv      # Raw hourly telemetry dataset (Mendeley Data DOI: 10.17632/4jdt83yy43.3)
├── train_evaluate.py             # Complete, self-contained Python ML pipeline (Preprocessing, CV, Evaluation)
├── Chapters_3_4_5_6_Report.md     # Full academic report text for Chapters 3, 4, 5, and 6
├── .gitignore                    # Standard Python gitignore
└── README.md                     # Project documentation and summary
```

---

## 🚀 Reproduction Instructions

### 1. Requirements
- Python 3.8+ (zero external dependencies required; implemented with pure standard library algorithms for full reproducibility and portability across any environment).

### 2. Run the Pipeline
Clone the repository and run:
```bash
python3 train_evaluate.py
```
This will:
1. Parse and validate the 4,368 raw hourly records.
2. Filter non-generating nighttime observations ($G_{POA} \le 10\text{ W/m}^2$), retaining 2,262 daylight hours.
3. Compute domain-engineered features ($\Delta T = T_{cell} - T_{amb}$, dry spell duration).
4. Partition the data chronologically (70% train: Feb–Jun 2022, 30% test: Jun–Aug 2022).
5. Run 5-fold TimeSeriesSplit cross-validation and evaluate on the prospective held-out test partition.
6. Display performance tables, subgroup breakdowns under heat stress and high dust, and feature importance rankings.

---

## 📄 License & Attribution
Dataset curated from:
> Mellit, A. (2023). *Hourly PV Power and Dust Accumulation Dataset — Laghouat, Algeria, February–August 2022*. Mendeley Data, V3, DOI: [10.17632/4jdt83yy43.3](https://doi.org/10.17632/4jdt83yy43.3).
