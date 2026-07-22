import json
import sqlite3
import os
import sys
from typing import Dict, Any, List
from src.db import get_db_connection, insert_job_posting, update_staging_status, DEFAULT_DB_PATH
from src.parser import resolve_institution

def ingest_parsed_json(json_file_path: str = "parsed_jobs.json", db_path: str = DEFAULT_DB_PATH):
    """
    Reads a JSON file containing parsed job postings output by Gemini,
    inserts them into the SQLite database, and updates staging statuses.
    """
    if not os.path.exists(json_file_path):
        print(f"Error: JSON file '{json_file_path}' not found!")
        print("Please save Gemini's JSON output to this file in the workspace root.")
        return

    if not os.path.exists(db_path):
        print(f"Error: Database '{db_path}' not found!")
        return

    try:
        with open(json_file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error reading or parsing JSON file: {e}")
        return

    if not isinstance(data, list):
        print("Error: JSON root must be a list of parsed job postings.")
        return

    print(f"Found {len(data)} jobs in JSON file. Commencing ingestion...")
    
    stats = {"Success": 0, "Failed": 0, "Duplicates": 0, "UnknownID": 0}
    
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        
        for idx, item in enumerate(data):
            staging_id = item.get("staging_id")
            if not staging_id:
                print(f"Item #{idx + 1} is missing 'staging_id'. Skipping.")
                stats["Failed"] += 1
                continue
                
            # 1. Fetch the corresponding staging record to verify and get source URL / metadata
            cursor.execute(
                "SELECT id, source_url, job_board_source, scrape_date FROM job_postings_staging WHERE id = ?",
                (staging_id,)
            )
            staging_row = cursor.fetchone()
            
            if not staging_row:
                print(f"Warning: Staging ID '{staging_id}' not found in database. Skipping.")
                stats["UnknownID"] += 1
                continue
                
            source_url = staging_row["source_url"]
            board_source = staging_row["job_board_source"]
            scrape_date = staging_row["scrape_date"]
            
            try:
                inst_data = item.get("institution", {})
                job_data = item.get("job_posting", {})
                
                if not inst_data or not job_data:
                    raise ValueError("Parsed item is missing 'institution' or 'job_posting' block.")
                
                # Resolve institution ID
                inst_name = inst_data.get("name")
                if not inst_name:
                    raise ValueError("Institution name is missing.")
                inst_id = resolve_institution(conn, inst_data)
                
                # Safe type conversion and normalization
                job_title = job_data.get("job_title") or "Unknown Position"
                
                try:
                    JD_required = int(job_data.get("JD_required"))
                except (TypeError, ValueError):
                    JD_required = 0
                    
                standardized_level = job_data.get("standardized_level") or "Legal Counsel/Staff Attorney"
                
                try:
                    is_commensurate_with_experience = int(job_data.get("is_commensurate_with_experience"))
                except (TypeError, ValueError):
                    is_commensurate_with_experience = 0

                # Normalize float type for salaries (to fit REAL)
                def clean_salary(val):
                    if val is None or val == "":
                        return None
                    try:
                        return float(val)
                    except (TypeError, ValueError):
                        return None
                        
                # Normalize int type for experience
                def clean_years(val):
                    if val is None or val == "":
                        return None
                    try:
                        return int(float(val))
                    except (TypeError, ValueError):
                        return None

                salary_min = clean_salary(job_data.get("salary_min"))
                salary_max = clean_salary(job_data.get("salary_max"))
                min_years = clean_years(job_data.get("min_years"))
                pref_years = clean_years(job_data.get("pref_years"))

                # 2. Insert into parsed job postings
                try:
                    insert_job_posting(
                        conn=conn,
                        institution_id=inst_id,
                        job_title=job_title,
                        JD_required=JD_required,
                        standardized_level=standardized_level,
                        is_commensurate_with_experience=is_commensurate_with_experience,
                        job_board_source=board_source,
                        source_url=source_url,
                        post_date=scrape_date,
                        reports_to=job_data.get("reports_to"),
                        salary_min=salary_min,
                        salary_max=salary_max,
                        min_years=min_years,
                        pref_years=pref_years,
                        posting_id=staging_id  # Keep staging UUID for consistency
                    )
                    stats["Success"] += 1
                    update_staging_status(conn, staging_id, "Processed")
                    
                except sqlite3.IntegrityError as db_err:
                    if "UNIQUE constraint failed" in str(db_err):
                        # Duplicate entry detected, mark as processed anyway to clear queue
                        print(f"Posting '{job_title}' at {inst_name} already exists. Skipping duplicate.")
                        update_staging_status(conn, staging_id, "Processed")
                        stats["Duplicates"] += 1
                    else:
                        raise db_err
                        
            except Exception as e:
                print(f"Failed to ingest staging ID '{staging_id}'. Error: {e}")
                update_staging_status(conn, staging_id, "Failed")
                stats["Failed"] += 1
                
    print("\n--- Ingestion Summary ---")
    print(f"Successfully Imported: {stats['Success']}")
    print(f"Duplicates Skipped:   {stats['Duplicates']}")
    print(f"Failed parsing:       {stats['Failed']}")
    print(f"Unknown Staging IDs:  {stats['UnknownID']}")
    print("------------------------")

if __name__ == "__main__":
    json_path = "parsed_jobs.json"
    if len(sys.argv) > 1:
        json_path = sys.argv[1]
    ingest_parsed_json(json_path)
