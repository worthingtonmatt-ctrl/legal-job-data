import sqlite3
import os
from src.db import DEFAULT_DB_PATH, get_db_connection

def export_pending_jobs(db_path: str = DEFAULT_DB_PATH, output_file: str = "pending_jobs.md"):
    """
    Reads all 'Pending' job postings in staging and exports them to a single
    markdown file, structured for parsing by long-context LLMs.
    """
    if not os.path.exists(db_path):
        print(f"Database {db_path} does not exist!")
        return

    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, institution_name_raw, raw_scraped_text, source_url, job_board_source, scrape_date
            FROM job_postings_staging
            WHERE status = 'Pending'
            ORDER BY scrape_date DESC, id
            """
        )
        rows = cursor.fetchall()
        
        if not rows:
            print("No pending job postings in staging to export.")
            return
            
        print(f"Exporting {len(rows)} pending job postings to {output_file}...")
        
        with open(output_file, "w", encoding="utf-8") as f:
            f.write("# PENDING JOB POSTINGS AGGREGATION\n")
            f.write(f"Total jobs exported: {len(rows)}\n")
            f.write("Use this file with the provided system prompt to extract structured JSON data.\n\n")
            f.write("=" * 60 + "\n\n")
            
            for idx, row in enumerate(rows):
                f.write(f"## JOB ENTRY #{idx + 1}\n")
                f.write(f"**Staging ID**: {row['id']}\n")
                f.write(f"**Job Board Source**: {row['job_board_source']}\n")
                f.write(f"**Institution Raw**: {row['institution_name_raw']}\n")
                f.write(f"**Source URL**: {row['source_url']}\n")
                f.write(f"**Scraped Date**: {row['scrape_date']}\n\n")
                f.write("**Description**:\n")
                f.write(f"{row['raw_scraped_text']}\n\n")
                f.write("-" * 40 + "\n\n")
                
        print("Export completed successfully.")

if __name__ == "__main__":
    export_pending_jobs()
