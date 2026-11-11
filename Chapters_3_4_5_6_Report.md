# TEB3123 Machine Learning — Final Project Report
## Chapters 3, 4, 5, and 6: Empirical Methodology, Evaluation, and Engineering Analysis

**Project Title:** Predictive Maintenance for Solar PV Panels: Dust-Induced Performance Degradation Modeling Using Machine Learning  
**Lecture Session Group:** Group 2 | **Project Group No.:** 15  
**Team Members:**  
- Muhammad Khaidhir Bin Mohd Razin (Student ID: 22007399)  
- Nor Amirah Syahida Binti Baharuddin (Student ID: 22007850)  
**UTP Grand Challenge:** Energy Security | **Relevant SDG:** SDG 7 – Affordable and Clean Energy (Target 7.2)  
**Dataset:** Hourly PV Power and Dust Accumulation Dataset — Laghouat, Algeria (February–August 2022, Mendeley Data, DOI: `10.17632/4jdt83yy43.3`)  

---

# Chapter 3: Data Preprocessing

### 3.1 Preparation Sequence
The raw experimental dataset comprises 4,368 hourly observations recorded consecutively from 17 February 2022 00:00 to 17 August 2022 23:00 at the Applied Research Unit for Renewable Energies (URAER) in Laghouat, Algeria. To transform this raw telemetry into a robust, leakage-free dataset suitable for supervised machine learning, an end-to-end preprocessing sequence was implemented:

```
[Raw Telemetry: 4,368 Hourly Rows x 14 Columns]
                     │
                     ▼
[1. DateTime Parsing & Chronological Index Verification (0 duplicates found)]
                     │
                     ▼
[2. Sparsity Audit & Missing Value Treatment (PCHIP interpolation validation)]
                     │
                     ▼
[3. Physical Boundary & Sensor Anomaly Screening]
                     │
                     ▼
[4. Non-Generating Nighttime Filtering: G_POA <= 10 W/m² (2,106 rows removed)]
                     │
                     ▼
[Clean Daytime Operational Dataset: 2,262 Rows x 14 Columns]
                     │
                     ▼
[5. Temporal Chronological Train/Test Partitioning: 70% Train (1,583) / 30% Test (679)]
                     │
                     ▼
[6. Strict Partition-Isolated Z-Score Feature Scaling (for Linear Baseline only)]
```

1. **Timestamp Normalization & Chronological Sorting:** The string-based timestamp column (`datetime`) formatted as `DD/MM/YYYY HH:MM` was parsed into standardized ISO-8601 temporal datetime indices and validated to verify strict monotonic progression without chronological skips or duplicates.
2. **Missing Value & Sparsity Diagnosis:** The dataset was audited for null, NaN, and blank values across all 14 attributes.
3. **Physical Plausibility & Outlier Auditing:** All meteorological parameters ($G_{POA}$, ambient temperature, cell operating temperature, relative humidity, wind speed, cloud cover, and precipitation) and electrical power outputs ($P_{clean}$, $P_{dusty}$) were screened against physical atmospheric limits and manufacturer electrical ratings.
4. **Daytime Operational Filtering ($G_{POA} > 10\text{ W/m}^2$):** Nighttime records ($G_{POA} = 0\text{ W/m}^2$) represent non-generating periods where electrical power output is identically zero ($P_{clean} = P_{dusty} = 0.0\text{ W}$). Retaining nighttime periods introduces extreme zero-inflation that distorts error gradients, causes severe heteroscedasticity, and artificially inflates the coefficient of determination ($R^2 > 0.995$) without reflecting true daylight degradation dynamics. Rows with in-plane irradiance $G_{POA} \le 10\text{ W/m}^2$ were systematically filtered out, removing 2,106 non-generating records and yielding a clean operational dataset of 2,262 daylight hours.
5. **Leakage-Safe Chronological Partitioning:** The 2,262 daytime observations were split chronologically into a 70% historical development training set (1,583 hours: 17 February 2022 09:00 to 27 June 2022 09:00) and a 30% prospective held-out test set (679 hours: 27 June 2022 10:00 to 17 August 2022 19:00).
6. **Feature Standardization:** For distance-sensitive and gradient-based algorithms (Ridge Linear Regression), standardization parameters (mean $\mu$ and standard deviation $\sigma$) were computed exclusively on the training split and subsequently applied to transform the test split, preserving total out-of-sample isolation. Tree-based ensembles (Random Forest and XGBoost) utilized unscaled physical features to maintain direct interpretability of decision nodes.

---

### 3.2 Cleaning and Missing Values
A rigorous missing-value audit revealed that 13 out of 14 features contained zero missing observations ($0.0\%$ missingness) across all 4,368 hours. The only variable exhibiting sparsity was the experimentally measured gravimetric dust density (`dust_density_measured_gm2`), which contained 4,320 missing values and only 48 valid entries (1.1% availability). 

* **Physical Gravimetric Measurements:** Direct mass accumulation was measured by laboratory technicians approximately once every few days using precision glass slide gravimetry. Because real-time field maintenance systems cannot rely on sparse manual laboratory measurements, this column was retained solely as ground-truth calibration data and was excluded from continuous feature inputs.
* **Continuous Reconstruction via PCHIP:** To provide continuous dust accumulation tracking, the dataset curators reconstructed hourly surface dust density (`dust_density_reconstructed_PCHIP_gm2`) using **Piecewise Cubic Hermite Interpolating Polynomial (PCHIP)** interpolation between the 48 gravimetric sample points. PCHIP was selected over standard cubic spline interpolation because it strictly preserves local monotonicity and prevents unphysical overshoot or artificial oscillations between dry-deposition periods. This continuous reconstructed feature contains zero missing values and serves as our continuous proxy for physical dust accumulation ($0.00\text{ g/m}^2$ to $22.54\text{ g/m}^2$).
* **Duplicate Records:** An integrity scan across the temporal index confirmed exactly 4,368 distinct hourly steps. Zero duplicate rows or conflicting duplicate timestamps were detected.
* **Precipitation Data:** Rainfall was recorded in millimetres per hour, with 4,339 dry hours ($0.0\text{ mm}$) and 29 rainfall events ranging from $0.1\text{ mm}$ to $6.0\text{ mm}$ (mean: $0.02\text{ mm/hr}$). These rainfall instances represent natural wash-off events that trigger abrupt drops in accumulated dust.

---

### 3.3 Outliers and Unusual Cases
In semi-arid desert environments such as Laghouat (Saharan Atlas edge, $33.8^\circ\text{N}$, $2.9^\circ\text{E}$), extreme meteorological conditions occur regularly. It is essential to distinguish genuine environmental extremes from sensor malfunctions or transmission corruption:

1. **Extreme Cell Temperatures ($T_{cell}$ up to $72.0^\circ\text{C}$):** The PV cell operating temperature reached a maximum of $72.0^\circ\text{C}$ during July afternoons, with ambient temperatures reaching $42.3^\circ\text{C}$. This $29.7^\circ\text{C}$ thermal elevation above ambient aligns with the standard thermal balance equation under peak desert insolation ($G_{POA} > 1,000\text{ W/m}^2$) and low convective cooling:
   $$T_{cell} = T_{amb} + \left(\frac{\text{NOCT} - 20}{800}\right) \cdot G_{POA}$$
   These values represent genuine operational stress that causes severe thermal derating in silicon PV modules ($\approx -0.4\%/^\circ\text{C}$). Rather than clipping or removing them as outliers, they were retained to enable the model to learn the compound interaction between high thermal stress and dust accumulation.
2. **Solar Irradiance Upper Bound ($G_{POA} = 1,052.64\text{ W/m}^2$):** Maximum in-plane irradiance was recorded at $1,052.64\text{ W/m}^2$, which is fully consistent with clear-sky Saharan summer conditions where high direct beam radiation combines with cloud-edge forward scattering.
3. **Power Output Consistency:** The peak power outputs for the daily-cleaned panel ($P_{clean} = 80.29\text{ W}$) and naturally soiled panel ($P_{dusty} = 77.03\text{ W}$) remained within the manufacturer nameplate capacity of the SolarWorld SW-85 poly-crystalline module ($85\text{ W}$ at STC: $1,000\text{ W/m}^2$, $25^\circ\text{C}$, AM 1.5G). The minimum power under daytime filtering was $0.87\text{ W}$ and $0.28\text{ W}$ respectively, representing heavily overcast sunrise/sunset hours.
4. **Nighttime Zero Inflation:** At $G_{POA} = 0\text{ W/m}^2$, photovoltaic conversion ceases. Retaining the 2,106 night records creates an artificial cluster of $(0, 0)$ coordinates. As demonstrated in preliminary testing, including night hours produced a deceptive $R^2$ of $0.998$ on naïve models, while distorting Mean Absolute Error across daytime hours by averaging over 12 hours of trivial zeros. Filtering at $G_{POA} > 10\text{ W/m}^2$ eliminated this artifact.

---

### 3.4 Encoding, Scaling, and Imbalance
* **Categorical Encoding:** The operational telemetry consists exclusively of continuous floating-point and integer measurements. No categorical encoding (such as One-Hot or Ordinal encoding) was required. Cyclical temporal dynamics (hour-of-day) were converted into harmonic mathematical features in Chapter 4.
* **Feature Scaling:** Because features span disparate physical dimensions and numerical orders of magnitude (e.g., $G_{POA} \in [10, 1052]\text{ W/m}^2$ vs. $\text{Dust Density} \in [0, 22.5]\text{ g/m}^2$ vs. $\text{Wind Speed} \in [0, 14.2]\text{ m/s}$), scaling is necessary for distance-based and gradient-based algorithms:
  $$z = \frac{x - \mu_{train}}{\sigma_{train}}$$
  Z-score standardization was applied to the Linear Regression pipeline, fitting parameters $\mu_{train}$ and $\sigma_{train}$ solely on the 1,583 training records. In contrast, for tree-based ensemble models (Random Forest and XGBoost), unscaled features were preserved. Tree split criteria (mean squared error reduction) are invariant to monotonic monotonic feature scaling, and retaining raw physical units allows facility managers to inspect human-readable split thresholds (e.g., $G_{POA} > 584.2\text{ W/m}^2$ or $T_{cell} > 52.3^\circ\text{C}$).
* **Data Imbalance & Operational Regimes:** As a continuous regression problem, target class imbalance does not apply directly. However, operational regime imbalance exists: the dataset contains 875 hours of low-irradiance conditions ($G_{POA} \le 200\text{ W/m}^2$), 520 hours of medium irradiance ($200 < G_{POA} \le 600\text{ W/m}^2$), and 867 hours of high irradiance ($G_{POA} > 600\text{ W/m}^2$). The temporal validation split preserves continuous seasonal blocks to test model robustness under shifting operational regimes.

---

### 3.5 Prepared Dataset Summary
Table 3.1 details the structural characteristics, observation counts, and statistical parameters of the telemetry before and after the preprocessing pipeline.

#### Table 3.1: Comprehensive Telemetry Preprocessing and Data Profile Summary
| Telemetry Attribute | Raw Ingestion State | Preprocessed Operational State | Unit / Format | Modeling Role |
| :--- | :--- | :--- | :--- | :--- |
| **Total Record Count ($N$)** | 4,368 hourly observations | **2,262 generating daylight hours** | Integer count | Sampling universe |
| **Temporal Span** | 17/02/2022 00:00 – 17/08/2022 23:00 | 17/02/2022 09:00 – 17/08/2022 19:00 | Datetime (UTC+1) | Time-series sequence |
| **Nighttime Records ($G_{POA} \le 10$)** | 2,106 records (48.21%) | **0 records (Filtered out)** | Integer count | Excluded artifact |
| **Missing Values (13 Features)** | 0 missing (0.00%) | 0 missing (0.00%) | Numerical | Clean observations |
| **Measured Dust Density** | 4,320 missing (98.90%) | Retained for validation only | $\text{g/m}^2$ | Ground-truth reference |
| **PCHIP Reconstructed Dust** | 0 missing ($0.00 - 22.54$) | Continuous ($0.00 - 22.54$, $\mu=15.01$) | $\text{g/m}^2$ | Primary soiling predictor |
| **In-Plane Irradiance ($G_{POA}$)** | $0.00 - 1,052.64$ ($\mu=216.48$) | **$10.02 - 1,052.64$ ($\mu=417.88$, $\sigma=384.10$)** | $\text{W/m}^2$ | Solar resource input |
| **Ambient Temperature ($T_{amb}$)** | $-0.20 - 42.30$ ($\mu=21.91$) | $-0.20 - 42.30$ ($\mu=25.71$, $\sigma=9.83$) | $^\circ\text{C}$ | Climate predictor |
| **Cell Temperature ($T_{cell}$)** | $0.30 - 72.00$ ($\mu=26.31$) | **$0.30 - 72.00$ ($\mu=38.77$, $\sigma=16.84$)** | $^\circ\text{C}$ | Thermal state predictor |
| **Relative Humidity ($RH$)** | $5.00 - 95.00$ ($\mu=34.33$) | $5.00 - 95.00$ ($\mu=27.67$, $\sigma=18.99$) | $\%$ | Atmospheric moisture |
| **Wind Speed ($v_{wind}$)** | $0.00 - 14.20$ ($\mu=4.14$) | $0.00 - 14.20$ ($\mu=4.41$, $\sigma=2.67$) | $\text{m/s}$ | Convective cooling |
| **Clean Panel Power ($P_{clean}$)** | $0.00 - 80.29$ ($\mu=16.22$) | $0.87 - 80.29$ ($\mu=31.30$, $\sigma=27.62$) | $\text{W}$ | Baseline diagnostic reference |
| **Dusty Panel Power ($P_{dusty}$)** | $0.00 - 77.03$ ($\mu=13.79$) | **$0.28 - 77.03$ ($\mu=26.61$, $\sigma=23.24$)** | $\text{W}$ | **Primary Target Variable ($y$)** |

---

# Chapter 4: Feature Engineering and Selection

### 4.1 Feature Design Rationale
Raw meteorological telemetry alone does not explicitly capture the physical mechanisms of semiconductor heat transfer, atmospheric dust deposition, or diurnal optical incidence angles. To enhance predictive fidelity and model interpretability, four domain-guided feature engineering transformations were developed based on photovoltaic physics:

1. **Thermal Gradient Proxy ($\Delta T = T_{cell} - T_{amb}$):**  
   * *Physical Rationale:* In operating PV modules, the difference between cell temperature and ambient air temperature is directly proportional to absorbed solar insolation that is not converted into electrical power or dissipated by convection. While ambient temperature varies slowly with macroscopic weather fronts, $\Delta T$ reacts instantaneously to cloud transients, solar irradiance intensity, and surface dust layer emissivity:
     $$\Delta T = T_{cell} - T_{amb} \quad (^\circ\text{C})$$
   * *Domain Value:* $\Delta T$ serves as an empirical sensor-fusion feature combining thermal absorption and radiative equilibrium.
2. **Temperature-Derated Effective Irradiance ($G_{POA,eff}$):**  
   * *Physical Rationale:* Standard silicon solar cell efficiency decreases linearly with operating temperature beyond the Standard Test Condition ($25^\circ\text{C}$) at a rate of $\gamma \approx -0.4\%/^\circ\text{C}$ ($-0.004\text{ }^\circ\text{C}^{-1}$). High operating temperatures cause bandgap narrowing and increased intrinsic carrier recombination, reducing output voltage. By defining an effective thermal irradiance proxy:
     $$G_{POA,eff} = G_{POA} \cdot \left[1 - 0.004 \cdot (T_{cell} - 25)\right] \quad (\text{W/m}^2)$$
   * *Domain Value:* This engineered feature decouples reversible semiconductor thermal derating from irreversible optical attenuation caused by dust accumulation.
3. **Cumulative Dry Hours Since Last Precipitation ($H_{dry}$):**  
   * *Physical Rationale:* Dust deposition is a cumulative physical process governed by gravitational settling, electrostatic attraction, and aeolian saltation. In arid desert zones, particulate matter builds up progressively during dry spells, forming an increasingly opaque cake layer until a sufficient rainfall event ($>0.1\text{ mm}$) washes the glass surface:
     $$H_{dry}(t) = \begin{cases} 0, & \text{if } \text{Precipitation}(t) > 0.1\text{ mm} \\ H_{dry}(t-1) + 1, & \text{otherwise} \end{cases}$$
   * *Domain Value:* Provides the machine learning model with a continuous temporal memory of dust buildup duration and rain-washing cycles.
4. **Diurnal Solar Angle Harmonic Encoders ($\sin(\theta_{hour}), \cos(\theta_{hour})$):**  
   * *Physical Rationale:* Solar incidence angle modifier (IAM) effects introduce non-linear optical reflection at high angles of incidence (early morning and late afternoon). Hour-of-day was mapped into cyclical continuous coordinates:
     $$x_{sin} = \sin\left(\frac{2\pi \cdot \text{Hour}}{24}\right), \quad x_{cos} = \cos\left(\frac{2\pi \cdot \text{Hour}}{24}\right)$$
   * *Domain Value:* Prevents artificial numerical discontinuities between hour 23 and hour 0 and captures diurnal sun-path geometry.

---

### 4.2 Feature Selection
To avoid multicollinearity and optimize model generalizability, a multi-stage feature selection methodology was conducted, evaluating linear bivariate Pearson correlation coefficients ($r$) against target power $P_{dusty}$, variance inflation factors (VIF), and tree-based split gain importance.

#### Table 4.1: Feature Correlation Matrix and Selection Decisions
| Candidate Feature | Symbol / Expression | Pearson Correlation ($r$) with $P_{dusty\_W}$ | Variance Inflation Factor (VIF) | Final Selection Status | Engineering Rationale |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **In-Plane Irradiance** | $G_{POA}$ | **$+0.9807$** | $8.4$ | **Selected** | Primary physical driver of photogenerated electron-hole pairs. |
| **Thermal Gradient** | $\Delta T = T_{cell} - T_{amb}$ | **$+0.9807$** | $7.9$ | **Selected** | Captures net solar absorption and thermal dissipation dynamics. |
| **Derated Effective Irradiance** | $G_{POA,eff}$ | **$+0.9907$** | $14.2$ | Preserved in Tree Models | Highly predictive; collinear with $G_{POA}$ in linear models. |
| **Cell Temperature** | $T_{cell}$ | $+0.7372$ | $12.1$ | **Selected** | Direct metric of operating semiconductor temperature. |
| **Reconstructed Dust Density** | $\text{Dust}_{PCHIP}$ | **$-0.0807$** | $1.8$ | **Selected** | Key degradation driver; negative coefficient indicates soiling loss. |
| **Cloud Cover Percentage** | $\text{Cloud}$ | $-0.3244$ | $1.5$ | **Selected** | Captures diffuse vs. direct beam optical scattering. |
| **Relative Humidity** | $RH$ | $-0.1072$ | $2.3$ | **Selected** | Influences dust caking and atmospheric optical depth. |
| **Wind Speed** | $v_{wind}$ | $+0.0145$ | $1.2$ | **Selected** | Drives convective module cooling and wind-blown dust resuspension. |
| **Ambient Temperature** | $T_{amb}$ | $+0.0657$ | $6.8$ | **Selected** | Baseline climate boundary condition. |
| **Clean Panel Power** | $P_{clean\_W}$ | $+0.9972$ | $> 50$ | **Excluded from Inputs (Diagnostic Only)** | **Target leakage prevention:** clean reference panel does not exist in standalone commercial field installations. |

---

### 4.3 Dimensionality Reduction
Unsupervised dimensionality reduction techniques (such as Principal Component Analysis - PCA or t-SNE) were **deliberately excluded** from the final machine learning pipeline. This decision is grounded in strict operational and engineering requirements:
1. **Preservation of Physical Explainability:** In utility-scale solar asset management, facility operators must interpret alarms in physical units (e.g., Watts lost per gram of dust: $\text{W}/(\text{g/m}^2)$, temperature derating in $^\circ\text{C}$). PCA projects raw features into orthogonal latent components ($\text{PC}_1, \text{PC}_2$) that blend irradiance, cell temperature, and soiling into uninterpretable mathematical eigenvectors.
2. **Low Dimensionality of the Input Space:** The total engineered input feature space consists of 8 primary predictors ($p = 8$). With 2,262 daylight observations, the ratio of samples to features is $N/p \approx 282:1$, entirely ruling out the "curse of dimensionality" and rendering matrix projection unnecessary.
3. **Tree-Based Feature Subsampling:** Ensemble tree models (Random Forest and XGBoost) perform intrinsic feature selection at every split node, naturally handling collinearity without loss of dimensional meaning.

---

### 4.4 Evidence of Usefulness
Empirical evidence verifies that domain engineering substantially improves modeling fidelity:
* The engineered thermal gradient $\Delta T = T_{cell} - T_{amb}$ exhibits a Pearson correlation of $r = +0.9807$ with dusty panel output, compared to only $r = +0.0657$ for raw ambient temperature alone. Ambient temperature by itself fails to reflect instantaneous cloud cover and irradiance dips, whereas $\Delta T$ tracks dynamic module heating with high precision.
* The temperature-derated effective irradiance ($G_{POA,eff}$) improves correlation with power output to $r = +0.9907$, higher than raw irradiance ($r = +0.9807$).
* The inclusion of PCHIP reconstructed dust density provides a continuous soiling degradation signal: as shown in Chapter 6, including dust density allows tree models to capture the 6.65 W average midday power loss observed across the summer test window.

---

### 4.5 Leakage and Temporal Integrity Checks
To ensure scientific validity and real-world deployment reliability, strict data integrity safeguards were enforced:
1. **Target Leakage Prevention:** In experimental testbeds, a side-by-side manually cleaned reference panel produces $P_{clean\_W}$. Including $P_{clean\_W}$ as an input feature to predict $P_{dusty\_W}$ would yield a trivial mathematical identity model ($R^2 \approx 0.999$, MAE $< 0.4\text{ W}$), because $P_{dusty} \approx P_{clean} \cdot (1 - \text{Soiling Ratio})$. In real commercial solar farms, operators do not deploy continuously cleaned twin panels across vast solar fields. Therefore, $P_{clean\_W}$ was strictly quarantined and used exclusively as an evaluation benchmark and diagnostic comparator, never as an input predictor.
2. **Temporal Integrity (Zero Look-Ahead Bias):** In time-series telemetry, random k-fold cross-validation or random train-test splitting causes catastrophic temporal data leakage: shuffling observations allows models to interpolate between hour $t-1$ and hour $t+1$, artificially deflating test errors. To prevent look-ahead bias, all data partitions were split chronologically. Preprocessing statistics (means, standard deviations) and hyperparameter validation were restricted strictly to historical training horizons.

---

# Chapter 5: Machine Learning Methodology

### 5.1 Task Formulation and Model Types
The predictive maintenance framework is formulated as a **supervised continuous regression task**. The operational objective is to accurately map the vector of environmental, thermal, and dust accumulation features $\mathbf{x}_t \in \mathbb{R}^8$ at hour $t$ to the electrical power output $y_t = P_{dusty,t} \in \mathbb{R}^+$ of the dust-affected solar PV module:
$$\hat{y}_t = f(\mathbf{x}_t; \boldsymbol{\theta})$$
where $\mathbf{x}_t = [G_{POA}, T_{amb}, T_{cell}, RH, v_{wind}, \text{Cloud}, \text{Dust}_{PCHIP}, \Delta T]^T$.

To systematically evaluate model complexity, three complementary machine learning algorithms representing diverse inductive biases were developed and compared against a defined baseline:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MODEL COMPLEXITY SPECTRUM                       │
├─────────────────┬───────────────────┬──────────────────────────────────┤
│ Linear Baseline │ Bagging Ensemble  │ Boosting Ensemble                │
├─────────────────┼───────────────────┼──────────────────────────────────┤
│ Ridge Linear    │ Random Forest     │ Gradient Boosted Trees (XGBoost) │
│ Regression      │ Regressor         │                                  │
│ - Parametric    │ - Non-parametric  │ - Non-parametric                 │
│ - Global linear │ - Bagging         │ - Sequential residual boosting   │
│   hyperplane    │ - Variance reduct.│ - Bias & variance optimization   │
└─────────────────┴───────────────────┴──────────────────────────────────┘
```

1. **Ridge Linear Regression ($L_2$-Regularized OLS):**
   * *Inductive Bias:* Assumes a global linear relationship between predictors and power output. Ridge regularization introduces an $L_2$ penalty on weight magnitudes to prevent numerical instability arising from collinearity between $G_{POA}$ and $\Delta T$:
     $$\min_{\mathbf{w}} \sum_{i=1}^N \left(y_i - \mathbf{w}^T \mathbf{x}_i\right)^2 + \lambda \|\mathbf{w}\|_2^2$$
   * *Role:* Provides a computationally lightweight, transparent linear benchmark.
2. **Random Forest Regressor:**
   * *Inductive Bias:* Non-parametric ensemble bagging method. Constructs an ensemble of $B$ de-correlated decision trees, each trained on a bootstrap sample of the training data with randomized feature subspace selection ($\approx \sqrt{p}$ features per split):
     $$\hat{y}_{RF}(\mathbf{x}) = \frac{1}{B} \sum_{b=1}^B T_b(\mathbf{x})$$
   * *Role:* Reduces prediction variance, captures non-linear feature interactions (such as the threshold where wind speed transitions from cooling the panel to depositing airborne dust), and provides robust resistance to overfitting.
3. **Gradient Boosted Decision Trees (XGBoost):**
   * *Inductive Bias:* Sequential boosting ensemble that builds shallow regression trees iteratively. Each successive tree $f_m(\mathbf{x})$ is trained to fit the negative gradient (pseudo-residuals) of the squared-error loss function with shrinkage parameter $\eta$:
     $$\hat{y}^{(m)}(\mathbf{x}) = \hat{y}^{(m-1)}(\mathbf{x}) + \eta \cdot f_m(\mathbf{x})$$
   * *Role:* Directly minimizes residual error across challenging operational regimes, capturing complex interactions between extreme desert heat ($T_{cell} > 50^\circ\text{C}$) and heavy surface dust accumulation.

---

### 5.2 Reference Baseline
To establish an empirical baseline against which all algorithmic performance can be rigorously justified, a **Naïve Historical Mean Predictor** was implemented:
$$\hat{y}_{baseline} = \bar{y}_{train} = \frac{1}{N_{train}} \sum_{i=1}^{N_{train}} y_i = 26.76\text{ W}$$
This baseline represents the expected performance of an uninformed facility manager who predicts constant average daylight power output regardless of solar irradiance, temperature, or dust condition. In addition, the Linear Regression model serves as the secondary, industry-standard parametric baseline.

---

### 5.3 Data Splitting and Validation Strategy
To reflect real-world deployment where historical telemetry is used to forecast future operational health, a **chronological time-series partition** was executed across the 2,262 daylight observations:

* **Training Partition (70%):** 1,583 hours spanning 17 February 2022 09:00 to 27 June 2022 09:00. This development partition covers late winter, spring, and early summer, capturing initial panel exposure, moderate irradiance regimes, and early dust accumulation cycles ($0.00\text{ g/m}^2$ to $17.30\text{ g/m}^2$).
* **Held-Out Test Partition (30%):** 679 hours spanning 27 June 2022 10:00 to 17 August 2022 19:00. This held-out evaluation window represents the most demanding operational period: extreme Saharan mid-summer heat ($T_{amb}$ up to $42.3^\circ\text{C}$, $T_{cell}$ up to $72.0^\circ\text{C}$) and peak sustained dust density ($17.30\text{ g/m}^2$ to $22.54\text{ g/m}^2$).
* **Validation Strategy (5-Fold Time-Series Split):** To tune hyperparameters without contaminating the test set, an expanding-window **TimeSeriesSplit** cross-validation protocol was executed exclusively on the 1,583 training records:
  * Fold 1: Train on first 500 hours $\rightarrow$ Validate on subsequent 200 hours.
  * Fold 2: Train on first 700 hours $\rightarrow$ Validate on subsequent 200 hours.
  * Fold 3: Train on first 900 hours $\rightarrow$ Validate on subsequent 200 hours.
  * Fold 4: Train on first 1,100 hours $\rightarrow$ Validate on subsequent 200 hours.
  * Fold 5: Train on first 1,300 hours $\rightarrow$ Validate on final 283 training hours.

This expanding-window structure strictly preserves the arrow of time, preventing look-ahead leakage and simulating periodic model recalibration.

---

### 5.4 Search Strategy and Hyperparameter Selection
Hyperparameter optimization was conducted systematically using grid search evaluated against Mean Squared Error across the 5-fold time-series validation splits. Table 5.1 summarizes the candidate search space, tuning criteria, and final selected configurations.

#### Table 5.1: Model Hyperparameter Configurations and Search Specifications
| Model Architecture | Hyperparameter | Search Space Considered | Selection Metric | Final Selected Setting | Structural Role / Justification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Ridge Regression** | Regularization strength ($\lambda$) | $[0.001, 0.01, 0.1, 1.0, 10.0, 100.0]$ | 5-Fold TS-CV RMSE | **$\lambda = 1.0$** | Balances ill-conditioned matrix inversion against bias. |
| **Random Forest** | Number of estimators ($B$) | $[10, 20, 30, 50, 100]$ | 5-Fold TS-CV RMSE | **$B = 30$** | Minimizes out-of-bag variance without latency overhead. |
| | Maximum tree depth ($d_{max}$) | $[4, 6, 7, 8, 10]$ | 5-Fold TS-CV RMSE | **$d_{max} = 7$** | Restricts tree complexity to prevent leaf overfitting. |
| | Minimum samples split | $[4, 8, 12, 16]$ | 5-Fold TS-CV RMSE | **$8$** | Enforces minimum statistical support per decision split. |
| | Feature subsample ratio ($k$) | $[\sqrt{p}, p/2, p]$ | 5-Fold TS-CV RMSE | **$4$ ($\approx \sqrt{p}+1$)** | Promotes de-correlation across individual tree estimators. |
| **XGBoost Regressor** | Number of boosting rounds ($M$) | $[20, 30, 40, 60, 100]$ | 5-Fold TS-CV RMSE | **$M = 40$** | Sufficient iterations for convergence before residual over-fit. |
| | Learning rate shrinkage ($\eta$) | $[0.01, 0.05, 0.10, 0.20]$ | 5-Fold TS-CV RMSE | **$\eta = 0.10$** | Controls step size along negative loss gradient. |
| | Maximum tree depth ($d_{max}$) | $[3, 4, 5, 6]$ | 5-Fold TS-CV RMSE | **$d_{max} = 4$** | Shallow trees prevent memorization of transient micro-fluctuations. |
| | Minimum samples per leaf | $[6, 10, 12, 20]$ | 5-Fold TS-CV RMSE | **$12$** | Regularizes split confidence in dense irradiance regions. |

---

### 5.5 Implementation Details
The end-to-end machine learning pipeline was implemented in a reproducible Python 3.10 environment utilizing Scikit-Learn, NumPy, and Pandas. All stochastic procedures (random feature sampling and bootstrap data indexing) were seeded deterministically (`random_state = 42`). 

* **Computational Latency & Hardware Requirements:** Model training and evaluation were executed on a standard multi-core workstation. Ridge regression trained in under $0.05$ seconds; Random Forest trained in $3.2$ seconds; XGBoost converged in $4.8$ seconds.
* **Inference Latency for Edge Deployment:** On the 679 held-out test observations, XGBoost achieved a batch inference latency of $0.018$ seconds ($\approx 26.5\text{ microseconds}$ per hourly prediction). This low computational footprint confirms that the trained model can be deployed directly on resource-constrained solar site IoT gateways (e.g., Raspberry Pi 4 or ESP32-based dataloggers) for real-time edge inference.

---

# Chapter 6: Results Evaluation and Discussion

### 6.1 Choice of Evaluation Measures
To provide a comprehensive assessment aligned with solar facility management needs, three standard regression metrics were computed:

1. **Mean Absolute Error (MAE):**
   $$\text{MAE} = \frac{1}{N} \sum_{i=1}^N \left|y_i - \hat{y}_i\right| \quad (\text{W})$$
   *Operational Meaning:* Measures the average expected magnitude of prediction error in direct physical power units (Watts). MAE translates directly into estimated kilowatt-hour revenue deviations for facility operators.
2. **Root Mean Squared Error (RMSE):**
   $$\text{RMSE} = \sqrt{\frac{1}{N} \sum_{i=1}^N \left(y_i - \hat{y}_i\right)^2} \quad (\text{W})$$
   *Operational Meaning:* Penalizes large outlier errors disproportionately due to quadratic squaring. A low RMSE indicates that the model avoids severe mispredictions during critical midday peak generation hours.
3. **Coefficient of Determination ($R^2$):**
   $$R^2 = 1 - \frac{\sum_{i=1}^N \left(y_i - \hat{y}_i\right)^2}{\sum_{i=1}^N \left(y_i - \bar{y}\right)^2}$$
   *Operational Meaning:* Measures the proportion of variance in PV power generation captured by the model relative to a trivial mean predictor.

---

### 6.2 Quantitative Comparison
Table 6.1 reports the quantitative results across all candidate models, evaluated consistently on the Training set ($N=1,583$), 5-Fold Time-Series Cross-Validation, and the strictly held-out Prospective Test set ($N=679$).

#### Table 6.1: Quantitative Model Evaluation and Comparative Performance Benchmarking
| Model Architecture | Evaluation Subset / Horizon | Primary Metric: MAE (W) | Secondary Metric: RMSE (W) | Goodness-of-Fit: $R^2$ Score | Relative Improvement vs. Baseline |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Naïve Mean Baseline** | Training ($N=1,583$) | $21.35$ | $23.79$ | $0.0000$ | Baseline reference |
| ($\hat{y} = 26.76\text{ W}$) | 5-Fold Time-Series CV | $21.00$ | $22.85$ | $-0.0143$ | — |
| | **Held-Out Test ($N=679$)** | **$20.45$** | **$21.90$** | **$-0.0005$** | **$0.0\%$ (Ref)** |
| **Linear Regression** | Training ($N=1,583$) | $2.51$ | $3.17$ | $0.9822$ | $88.2\%$ reduction |
| (Ridge Regularized, $\lambda=1.0$) | 5-Fold Time-Series CV | $3.35$ | $4.01$ | $0.9671$ | $84.0\%$ reduction |
| | **Held-Out Test ($N=679$)** | **$3.58$** | **$4.16$** | **$0.9639$** | **$82.5\%$ reduction** |
| **Random Forest Regressor** | Training ($N=1,583$) | $1.38$ | $1.86$ | $0.9939$ | $93.5\%$ reduction |
| ($B=30, d_{max}=7$) | 5-Fold Time-Series CV | $2.71$ | $3.40$ | $0.9764$ | $87.1\%$ reduction |
| | **Held-Out Test ($N=679$)** | **$2.18$** | **$2.66$** | **$0.9852$** | **$89.3\%$ reduction** |
| **Gradient Boosted Trees (XGBoost)** | Training ($N=1,583$) | $0.63$ | $0.86$ | $0.9987$ | $97.0\%$ reduction |
| ($M=40, \eta=0.1, d_{max}=4$) | 5-Fold Time-Series CV | $2.01$ | $2.26$ | $0.9901$ | $90.4\%$ reduction |
| | **Held-Out Test ($N=679$)** | **$1.24$** | **$1.85$** | **$0.9928$** | **$93.9\%$ reduction** |

---

### 6.3 Uncertainty and Consistency
Cross-validation performance across the 5 expanding temporal folds demonstrated stable convergence. The standard deviation of validation MAE across folds was $\pm 0.38\text{ W}$ for XGBoost, compared to $\pm 0.62\text{ W}$ for Random Forest and $\pm 0.84\text{ W}$ for Ridge Regression. The higher variance in Linear Regression stems from its inability to adjust slope coefficients when moving from moderate spring temperatures in early folds to high ambient heat in later folds. In contrast, XGBoost displayed high consistency across expanding validation windows, indicating that sequential boosting stabilizes prediction bounds against seasonal drift.

---

### 6.4 Final Model Selection
**Gradient Boosted Trees (XGBoost)** is selected as the production model for the solar PV predictive maintenance system based on five criteria:
1. **Predictive Accuracy:** Achieves the lowest error on held-out prospective data ($\text{MAE} = 1.24\text{ W}$, $\text{RMSE} = 1.85\text{ W}$, $R^2 = 0.9928$), outperforming the Random Forest model ($\text{MAE} = 2.18\text{ W}$) and Ridge Regression ($\text{MAE} = 3.58\text{ W}$).
2. **Error Reduction:** Delivers a $93.9\%$ reduction in Mean Absolute Error compared to the naïve baseline and a $65.4\%$ reduction in residual error variance relative to standard linear modeling.
3. **Generalization Across Regimes:** As demonstrated in Section 6.7, XGBoost maintains low error during extreme summer conditions ($T_{cell} > 50^\circ\text{C}$ and peak dust density), whereas linear regression errors double.
4. **Computational Efficiency:** Minimal inference latency ($< 0.02\text{ ms}$ per sample) enables edge deployment on microcontrollers.
5. **Operational Interpretability:** Tree-based split gain analysis provides transparent physical feature attribution that aligns with photovoltaic domain theory.

---

### 6.5 Principal Findings
The empirical findings reveal key insights into solar photovoltaic degradation under Saharan operating conditions:
* **Decoupling Soiling Loss from Solar Irradiance:** During the summer test period (27 June to 17 August 2022), the naturally soiled panel suffered an average hourly loss of $6.65\text{ W}$ compared to the daily-cleaned panel, with peak midday losses reaching **$21.08\text{ W}$** under $1,041\text{ W/m}^2$ insolation. On an $85\text{ W}$ module, this represents a **$24.8\%$ loss in peak generating capacity** solely due to dust deposition.
* **Non-Linear Thermal Saturation:** Linear models overpredict power at high irradiance ($G_{POA} > 600\text{ W/m}^2$) because they treat power as a constant linear multiple of irradiance. In reality, high irradiance drives cell temperatures up to $72.0^\circ\text{C}$, inducing severe thermal derating that curves the power-irradiance trajectory downward. Tree-based models capture this saturation naturally through split thresholds.

---

### 6.6 Visual Evidence and Residual Analysis
Analysis of prediction residuals ($e_i = y_i - \hat{y}_i$) on the held-out test partition confirms the architectural superiority of gradient boosting:

```
                RESIDUAL DISTRIBUTION PROFILE (HELD-OUT TEST SET)
   Frequency
      ▲
      │                    ┌─┐
      │                   ┌┘ └┐              XGBoost Residuals:
      │                  ┌┘   └┐             - Mean Error: -0.04 W (Zero-centered)
      │                 ┌┘  │  └┐            - Std Dev: 1.85 W
      │               ┌─┘   │   └─┐          - 91.2% errors within ± 2.0 W
      │             ┌─┘     │     └─┐
      │        ┌────┘       │       └────┐   Linear Regression Residuals:
      │   ─────┘            │            └─  - Mean Error: +0.78 W (Biased)
      └─────────────────────┼───────────────►- Std Dev: 4.08 W
         -8.0  -4.0  -2.0   0   +2.0  +4.0   - High-end heteroscedastic fan-out
                                Residual (W)
```

1. **Residual Distribution Shape:** The XGBoost residual distribution is tightly centered at zero ($\mu_e = -0.04\text{ W}$) with a standard deviation of $1.85\text{ W}$, exhibiting minimal skewness. In contrast, the Linear Regression residual distribution has a positive bias ($\mu_e = +0.78\text{ W}$) and higher spread ($\sigma_e = 4.08\text{ W}$), reflecting systematic underprediction during peak hours.
2. **Homoscedasticity vs. Heteroscedasticity:** Plotting residuals against fitted values reveals that XGBoost residuals remain evenly bounded across all power levels ($0\text{ W}$ to $77\text{ W}$). Linear Regression displays distinct heteroscedastic fan-out, where residual dispersion widens significantly above $50\text{ W}$.
3. **Actual vs. Predicted Tracking:** Over multi-day test sequences, the XGBoost predicted power curve closely tracks the true sensor trace across both cloud transients and clear midday peaks.

---

### 6.7 Error and Subgroup Analysis
To identify operational vulnerabilities before field deployment, model performance was evaluated across specific operational subgroups within the 679 test hours.

#### Table 6.2: Subgroup Performance Breakdown on Held-Out Test Data
| Operational Subgroup Regime | Subgroup Criteria | Sample Count ($N$) | Linear Regression MAE | Linear Regression RMSE | XGBoost Regressor MAE | XGBoost Regressor RMSE |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Low Irradiance** | $10 < G_{POA} \le 200\text{ W/m}^2$ | $295$ hours ($43.5\%$) | $2.67\text{ W}$ | $2.89\text{ W}$ | **$0.69\text{ W}$** | **$0.75\text{ W}$** |
| **Medium Irradiance** | $200 < G_{POA} \le 600\text{ W/m}^2$ | $99$ hours ($14.6\%$) | $2.40\text{ W}$ | $2.69\text{ W}$ | **$1.43\text{ W}$** | **$1.78\text{ W}$** |
| **High Irradiance** | $G_{POA} > 600\text{ W/m}^2$ | $285$ hours ($42.0\%$) | $4.93\text{ W}$ | $5.48\text{ W}$ | **$1.74\text{ W}$** | **$2.55\text{ W}$** |
| **Severe Thermal Stress** | $T_{cell} > 50.0^\circ\text{C}$ | $335$ hours ($49.3\%$) | $4.49\text{ W}$ | $5.14\text{ W}$ | **$1.73\text{ W}$** | **$2.49\text{ W}$** |
| **Sustained Heavy Soiling**| $\text{Dust}_{PCHIP} > 18.0\text{ g/m}^2$| $542$ hours ($79.8\%$) | $3.72\text{ W}$ | $4.31\text{ W}$ | **$1.31\text{ W}$** | **$1.91\text{ W}$** |

#### Operational Consequences:
* **High Irradiance Degradation:** Under peak sunlight ($>600\text{ W/m}^2$), Linear Regression error deteriorates to an MAE of $4.93\text{ W}$ (RMSE of $5.48\text{ W}$), whereas XGBoost maintains an MAE of $1.74\text{ W}$. Because peak generation hours account for the majority of daily energy yield, a $4.93\text{ W}$ linear modeling error would lead to miscalculated cleaning decisions.
* **Thermal Stress Stability:** During severe thermal stress ($T_{cell} > 50^\circ\text{C}$, 335 hours), XGBoost limits RMSE to $2.49\text{ W}$, compared to $5.14\text{ W}$ for Linear Regression.
* **Low False Alarm Risk:** Under low morning/evening irradiance ($G_{POA} \le 200\text{ W/m}^2$), XGBoost achieves an MAE of $0.69\text{ W}$, preventing false alarms during sunrise and sunset transitions.

---

### 6.8 Explainability and Decision Usefulness
To translate model predictions into actionable maintenance protocols for facility managers, feature importance was evaluated through split-gain reduction and total impurity variance explained.

#### Table 6.3: XGBoost Relative Feature Attribution and Operational Roles
| Feature Identifier | Relative Importance (% Gain) | Decision Split Frequency | Operational Interpretation for Facility Management |
| :--- | :--- | :--- | :--- |
| **$\Delta T$ ($T_{cell} - T_{amb}$)** | **$90.81\%$** | 174 splits | Primary thermal absorption driver; tracks dynamic module heat flux. |
| **$G_{POA}$ (In-Plane Irradiance)** | **$6.69\%$** | 171 splits | Sets baseline ceiling of photo-generated current. |
| **$\text{Dust}_{PCHIP}$ (Dust Density)** | **$1.65\%$** | 142 splits | Governs downward degradation curve; quantifies soiling attenuation. |
| **$T_{amb}$ (Ambient Temperature)** | **$0.83\%$** | 78 splits | Sets macro-climatic convective boundary temperature. |
| **$\text{Cloud Cover}$** | **$0.02\%$** | 14 splits | Minor adjustments for diffuse vs direct beam atmospheric conditions. |
| **$v_{wind}$, $RH$, $T_{cell}$** | **$< 0.01\%$** | 20 splits | Refinements for boundary-layer cooling and humidity. |

#### Condition-Based Predictive Maintenance Rule:
By comparing predicted clean-panel reference output $\hat{P}_{clean}(t)$ against the dust-affected model prediction $\hat{P}_{dusty}(t)$, the real-time recoverable soiling loss $\Delta \hat{P}(t)$ is quantified:
$$\Delta \hat{P}(t) = \hat{P}_{clean}(t) - \hat{P}_{dusty}(t)$$
A condition-based cleaning alarm is triggered when the estimated recoverable loss satisfies:
$$\Delta \hat{P}(t) \ge 10.0\text{ W} \quad \text{for } \ge 3 \text{ consecutive hours during } G_{POA} > 600\text{ W/m}^2$$
This threshold prevents false triggers during overcast spells while ensuring panels are cleaned before cumulative unrecovered energy losses exceed the cost of maintenance water and labor.

---

### 6.9 Comparison with Literature
The evaluation results align well with published literature on solar PV soiling degradation in arid and semi-arid environments:
* **Dataset Benchmarks (Laghouat Campaign):** The original curators of the Mendeley Laghouat dataset reported average power losses between $10\%$ and $15\%$ over prolonged dry exposure periods, peaking near $30\%$ after severe dust accumulation without rain. Our empirical analysis confirms these findings: the observed soiling loss averaged $6.65\text{ W}$ ($21.2\%$ relative to mean clean daylight output) and peaked at $21.08\text{ W}$ ($24.8\%$ peak loss) during the summer test split.
* **Machine Learning Performance in Solar Literature:** Recent studies applying ensemble learning to solar soiling (e.g., Said et al., *Clean Energy Systems*, 2024; Pulipaka et al., *Solar Energy*, 2020) report test $R^2$ scores between $0.94$ and $0.98$ for linear and shallow network baselines, and $0.98$ to $0.995$ for gradient-boosted architectures. Our XGBoost held-out test performance ($R^2 = 0.9928$, $\text{MAE} = 1.24\text{ W}$) is consistent with these benchmarks, while establishing fair temporal generalizability without data leakage.
* **Environmental Feature Dynamics:** Prior research indicates that while solar irradiance accounts for over $90\%$ of output variance, accurate dust loss quantification requires secondary environmental predictors ($T_{cell}$, humidity, dry spell duration) to isolate soiling from thermal degradation. The feature importance hierarchy established in Section 6.8 aligns with these physical principles.
