import sqlite3
import pandas as pd
import numpy as np

conn = sqlite3.connect('e:\\AI_Projects\\JobHunt\\university_legal_tracker.db')
query = """
SELECT standardized_level, salary_min, salary_max, min_years
FROM job_postings
WHERE standardized_level IN ('General Counsel', 'Deputy General Counsel', 'Associate General Counsel', 'Assistant General Counsel')
AND salary_min IS NOT NULL
AND salary_max IS NOT NULL
AND min_years IS NOT NULL
"""
df = pd.read_sql(query, conn)

if df.empty:
    print("NO DATA")
else:
    df['salary_mid'] = (df['salary_min'] + df['salary_max']) / 2

    def get_bracket(years):
        if years <= 3: return '0-3 years'
        elif years <= 7: return '4-7 years'
        else: return '8+ years'

    df['bracket'] = df['min_years'].apply(get_bracket)

    print("--- Summary Table ---")
    # Order the brackets for printing
    df['bracket'] = pd.Categorical(df['bracket'], categories=['0-3 years', '4-7 years', '8+ years'], ordered=True)
    summary = df.groupby('bracket')['salary_mid'].agg(['count', 'mean', 'min', 'max']).round(2)
    print(summary)

    print("\n--- Regression ---")
    coeffs = np.polyfit(df['min_years'], df['salary_mid'], 1)
    print(f"Value added per year: ${coeffs[0]:.2f}")
    print(f"Baseline (intercept): ${coeffs[1]:.2f}")

    print("\n--- Sanity Check: Titles by Bracket ---")
    sanity = pd.crosstab(df['standardized_level'], df['bracket'])
    print(sanity)
