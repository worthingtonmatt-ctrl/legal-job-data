import sqlite3
import math
import numpy as np
import pandas as pd
from typing import Dict, Any, List

def run_regression_analysis(db_path: str = "university_legal_tracker.db") -> Dict[str, Any]:
    # 1. Load data from SQLite database
    conn = sqlite3.connect(db_path)
    # Join with institutions to get the private status and estimated enrollment
    query = """
        SELECT jp.salary_min, jp.salary_max, jp.min_years, jp.standardized_level, inst.funding_type, inst.estimated_enrollment, inst.state_location
        FROM job_postings jp
        JOIN institutions inst ON jp.institution_id = inst.id
        WHERE jp.JD_required = 1 
          AND jp.salary_min IS NOT NULL 
          AND jp.salary_max IS NOT NULL
          AND jp.min_years IS NOT NULL
          AND inst.funding_type IS NOT NULL
          AND inst.funding_type != ''
          AND inst.estimated_enrollment IS NOT NULL
    """
    df = pd.read_sql_query(query, conn)
    conn.close()
    
    if len(df) < 10:
        return {
            "success": False,
            "error": f"Insufficient data for regression analysis. Found only {len(df)} postings."
        }

    # 2. Define Private dummy and COL Index
    COL_INDEX = {
        'HI': 179.0, 'DC': 148.7, 'MA': 148.4, 'CA': 137.6, 'NY': 125.1, 'AK': 124.4, 'MD': 119.5,
        'OR': 114.3, 'CT': 113.9, 'NH': 113.3, 'VT': 112.5, 'ME': 112.2, 'NJ': 111.2, 'RI': 110.7,
        'WA': 110.4, 'CO': 105.5, 'NV': 103.3, 'UT': 102.8, 'AZ': 102.3, 'PA': 101.4, 'ID': 100.3,
        'MT': 100.1, 'DE': 100.1, 'FL': 100.1, 'VA': 99.8, 'ND': 98.7, 'SD': 98.1, 'MN': 97.4,
        'TX': 93.0, 'WI': 92.9, 'NM': 92.5, 'WY': 92.3, 'NC': 92.2, 'MI': 91.9, 'SC': 91.8,
        'IL': 91.2, 'OH': 90.7, 'IN': 90.6, 'AR': 90.6, 'TN': 90.4, 'NE': 90.1, 'IA': 89.7,
        'KY': 89.6, 'LA': 89.3, 'MO': 88.4, 'GA': 88.4, 'AL': 88.1, 'WV': 87.8, 'KS': 87.5,
        'OK': 86.8, 'MS': 85.3
    }
    df['is_private'] = df['funding_type'].apply(lambda x: 1 if 'Private' in str(x) else 0)
    df['col_index'] = df['state_location'].apply(lambda x: COL_INDEX.get(str(x).upper(), 100.0))

    # 3. Filter levels to standard attorney titles (excluding Staff Attorney) and one-hot encode
    attorney_levels = [
        'General Counsel',
        'Deputy General Counsel',
        'Associate General Counsel',
        'Assistant General Counsel'
    ]
    df = df[df['standardized_level'].isin(attorney_levels)].copy()
    
    # Calculate midpoint of salary range
    df['salary_mid'] = (df['salary_min'] + df['salary_max']) / 2.0
    
    # One-hot encode standardized_level, dropping 'Assistant General Counsel' as the reference group
    level_dummies = pd.get_dummies(df['standardized_level'], dtype=float)
    
    # We want to make sure all expected levels are columns, even if some have no data
    for lvl in attorney_levels:
        if lvl not in level_dummies.columns:
            level_dummies[lvl] = 0.0

    # Define predictors (X) and target (y)
    y = df['salary_mid'].values
    
    # Design matrix: Intercept, min_years, is_private, col_index, estimated_enrollment, and level dummies (excluding Assistant GC)
    df_design = pd.DataFrame({
        'Intercept': 1.0,
        'min_years': df['min_years'].astype(float),
        'is_private': df['is_private'].astype(float),
        'col_index': df['col_index'].astype(float),
        'estimated_enrollment': df['estimated_enrollment'].astype(float)
    })
    
    # Add level dummies (excluding reference level 'Assistant General Counsel')
    levels_to_include = [lvl for lvl in attorney_levels if lvl != 'Assistant General Counsel']
    for lvl in levels_to_include:
        df_design[lvl] = level_dummies[lvl]
        
    X = df_design.values
    features = list(df_design.columns)
    
    N, P_total = X.shape
    df_residual = N - P_total  # Degrees of freedom (N - features)

    # 4. Fit OLS Model: Solve X * beta = y
    beta, residuals, rank, s = np.linalg.lstsq(X, y, rcond=None)
    
    # Fitted values and residuals
    y_hat = np.dot(X, beta)
    residuals_vec = y - y_hat
    rss = np.sum(residuals_vec ** 2)
    
    # Total sum of squares
    y_bar = np.mean(y)
    tss = np.sum((y - y_bar) ** 2)
    
    # R-squared metrics
    r_squared = 1.0 - (rss / tss)
    adj_r_squared = 1.0 - ((rss / df_residual) / (tss / (N - 1)))
    
    # Root Mean Squared Error & Mean Absolute Error
    rmse = np.sqrt(rss / N)
    mae = np.mean(np.abs(residuals_vec))

    # 5. Compute Standard Errors, t-stats, and p-values
    residual_variance = rss / df_residual
    
    # Covariance matrix of coefficients
    XTX_inv = np.linalg.inv(np.dot(X.T, X))
    cov_beta = residual_variance * XTX_inv
    
    # Standard errors of coefficients
    se = np.sqrt(np.diag(cov_beta))
    
    # t-statistics
    t_stats = beta / se
    
    # Two-tailed p-value approximation using normal CDF (erf-based)
    p_values = []
    for t in t_stats:
        p_val = 1.0 - math.erf(abs(t) / math.sqrt(2.0))
        p_values.append(p_val)

    # Compile results
    results_list = []
    for idx, feature in enumerate(features):
        results_list.append({
            "feature": feature,
            "coef": beta[idx],
            "std_err": se[idx],
            "t_stat": t_stats[idx],
            "p_value": p_values[idx]
        })

    return {
        "success": True,
        "sample_size": N,
        "df_residual": df_residual,
        "r_squared": r_squared,
        "adj_r_squared": adj_r_squared,
        "rmse": rmse,
        "mae": mae,
        "results": results_list,
        "raw_data_summary": {
            "avg_salary": float(y_bar),
            "min_salary": float(np.min(y)),
            "max_salary": float(np.max(y)),
            "avg_years": float(np.mean(df['min_years'])),
            "avg_enrollment": float(np.mean(df['estimated_enrollment'])),
            "private_count": int(df['is_private'].sum())
        }
    }

def print_markdown_report(results: Dict[str, Any]):
    if not results.get("success"):
        return f"Error running regression: {results.get('error')}"

    summary = results["raw_data_summary"]
    
    report = []
    report.append("# Attorney Salary Regression Analysis Report")
    report.append("")
    report.append("This report presents the findings of an Ordinary Least Squares (OLS) linear regression model trained on active university attorney job listings. The model estimates the midpoint of the salary range based on experience, job level, funding type, and university enrollment size.")
    report.append("")
    report.append("## Model Fit Summary")
    report.append("")
    report.append(f"- **Sample Size (N)**: {results['sample_size']} jobs")
    report.append(f"- **Degrees of Freedom (Residual)**: {results['df_residual']}")
    report.append(f"- **R-squared ($R^2$)**: {results['r_squared']:.4f} (The model explains {results['r_squared']*100:.1f}% of the variance in salary midpoints)")
    report.append(f"- **Adjusted R-squared**: {results['adj_r_squared']:.4f}")
    report.append(f"- **Mean Absolute Error (MAE)**: ${results['mae']:,.2f}")
    report.append(f"- **Root Mean Squared Error (RMSE)**: ${results['rmse']:,.2f}")
    report.append("")
    report.append("## Regression Coefficients")
    report.append("")
    report.append("| Feature (Predictor) | Coefficient ($\\beta$) | Standard Error | t-Statistic | p-Value | Significance |")
    report.append("| :--- | :---: | :---: | :---: | :---: | :---: |")
    
    for row in results["results"]:
        p = row["p_value"]
        sig = ""
        if p < 0.001:
            sig = "***"
        elif p < 0.01:
            sig = "**"
        elif p < 0.05:
            sig = "*"
        elif p < 0.1:
            sig = "."
            
        report.append(
            f"| **{row['feature']}** | ${row['coef']:,.4f} | ${row['std_err']:,.4f} | {row['t_stat']:.3f} | {row['p_value']:.4e} | {sig} |"
        )
        
    report.append("")
    report.append("Significance codes: `***` p < 0.001, `**` p < 0.01, `*` p < 0.05, `.` p < 0.1")
    report.append("")
    report.append("### Interpretation of Coefficients:")
    report.append("1. **Intercept (Public Assistant GC Reference Group)**: Represents the estimated base salary midpoint for an *Assistant General Counsel* with 0 years of experience in a Public university of 0 students, assuming a baseline COL index of 0.")
    report.append("2. **min_years**: For every additional year of experience required, the salary midpoint is estimated to increase by the coefficient value (holding title, size, COL, and funding type constant).")
    report.append("3. **is_private**: Moving a job from a public to a private university increases the estimated salary midpoint by the coefficient value.")
    report.append("4. **col_index**: For every 1 point increase in the state's MERIC Cost of Living Index (e.g. moving from 100 to 101), the salary midpoint is estimated to increase by this coefficient.")
    report.append("5. **estimated_enrollment**: For every additional student enrolled at the university, the salary midpoint changes by the coefficient value.")
    report.append("6. **Titled Tiers (relative to Assistant GC)**:")
    report.append("   - *General Counsel* salary midpoints are expected to be higher by the GC coefficient.")
    report.append("   - *Associate/Deputy General Counsel* midpoints are relative to Assistant GC as indicated by their coefficients.")
    report.append("")
    
    # Generate Example Predictions
    report.append("## Example Salary Predictions")
    report.append("")
    report.append("Below are the model's predictions for common career profiles:")
    report.append("")
    report.append("| Title / Profile | Years of Experience | Institution Type & Size | Predicted Salary |")
    report.append("| :--- | :---: | :---: | :---: |")
    
    coef_dict = {row["feature"]: row["coef"] for row in results["results"]}
    
    def predict(years: float, is_private: float, col: float, enrollment: float, level: str) -> str:
        pred = coef_dict["Intercept"]
        pred += coef_dict["min_years"] * years
        pred += coef_dict["is_private"] * is_private
        pred += coef_dict["col_index"] * col
        pred += coef_dict["estimated_enrollment"] * enrollment
        if level in coef_dict:
            pred += coef_dict[level]
        return f"${pred:,.2f}"
        
    report.append(f"| Assistant General Counsel | 2 years | Public / 10k students / COL 100 | {predict(2, 0, 100.0, 10000, 'Assistant General Counsel')} |")
    report.append(f"| Assistant General Counsel | 3 years | Public / 15k students / COL 110 | {predict(3, 0, 110.0, 15000, 'Assistant General Counsel')} |")
    report.append(f"| Assistant General Counsel | 5 years | Private / 5k students / COL 120 | {predict(5, 1, 120.0, 5000, 'Assistant General Counsel')} |")
    report.append(f"| Associate General Counsel | 6 years | Public / 20k students / COL 100 | {predict(6, 0, 100.0, 20000, 'Associate General Counsel')} |")
    report.append(f"| Associate General Counsel | 8 years | Private / 8k students / COL 130 | {predict(8, 1, 130.0, 8000, 'Associate General Counsel')} |")
    report.append(f"| Deputy General Counsel | 10 years | Public / 25k students / COL 100 | {predict(10, 0, 100.0, 25000, 'Deputy General Counsel')} |")
    report.append(f"| General Counsel | 10 years | Public / 30k students / COL 90 | {predict(10, 0, 90.0, 30000, 'General Counsel')} |")
    report.append(f"| General Counsel | 12 years | Private / 15k students / COL 150 | {predict(12, 1, 150.0, 15000, 'General Counsel')} |")
    
    return "\n".join(report)

if __name__ == "__main__":
    import os
    import json
    res = run_regression_analysis()
    if res.get("success"):
        report_text = print_markdown_report(res)
        print(report_text)
        
        # Save JSON results for Next.js API
        json_path = os.path.join("frontend", "app", "api", "regression", "model.json")
        try:
            os.makedirs(os.path.dirname(json_path), exist_ok=True)
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(res, f, indent=2)
            print(f"\nSaved regression JSON model to: {json_path}")
        except Exception as e:
            print(f"\nCould not save JSON model: {e}")
            
        # Save report as a brain artifact for user display
        artifact_path = r"C:\Users\Matt\.gemini\antigravity\brain\c21e01a6-aa7e-43de-b53e-959c8cee94f1\regression_report.md"
        try:
            with open(artifact_path, "w", encoding="utf-8") as f:
                f.write(report_text)
            print(f"\nSaved regression analysis report to artifact: {artifact_path}")
        except Exception as e:
            print(f"\nCould not save report artifact: {e}")
    else:
        print("Regression failed:", res.get("error"))
