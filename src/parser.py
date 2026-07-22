import json
import sqlite3
import requests
from typing import Dict, Any, Optional
from src.db import get_db_connection, insert_institution, insert_job_posting, update_staging_status, DEFAULT_DB_PATH

OLLAMA_API_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "gemma4:e4b"

SYSTEM_PROMPT = """You are an expert data parsing assistant. Your task is to analyze the provided raw text of a higher education legal job posting and extract structured data matching the specified JSON schema.

JSON Schema:
{
  "institution": {
    "name": "Official institution name (e.g. 'East Carolina University', 'University of Notre Dame')",
    "state_location": "Two-letter US state code where the job is located (e.g. 'NC', 'IN', 'CO')",
    "city_location": "City where the job is located (e.g. 'Greenville', 'Notre Dame', 'Boulder')"
  },
  "job_posting": {
    "job_title": "Full job title from posting",
    "JD_required": 1 or 0,
    "standardized_level": "One of: 'General Counsel', 'Deputy General Counsel', 'Associate General Counsel', 'Assistant General Counsel', 'Legal Counsel/Staff Attorney', 'Title IX', 'Intern', 'Paralegal'",
    "reports_to": "Title of direct supervisor (e.g. 'General Counsel', 'President', 'Board of Trustees') or null if unknown",
    "salary_min": number or null,
    "salary_max": number or null,
    "is_commensurate_with_experience": 1 or 0,
    "min_years": number or null,
    "pref_years": number or null
  }
}

Rigid Constraints:
1. "JD_required": Set to 1 if a Juris Doctorate (JD) degree, admission to a state bar, or a license to practice law is required/essential; set to 0 if it is not required or not mentioned.
2. "standardized_level": Map the position to the correct level based on reporting hierarchy and duties:
   - "General Counsel": Chief legal officer, reports to President/Chancellor or Board of Trustees.
   - "Deputy General Counsel": Second in command, reports to General Counsel, has broad oversight.
   - "Associate General Counsel": Mid-level attorney, reports to General Counsel or Deputy GC.
   - "Assistant General Counsel": Entry/Mid-level attorney, reports to General Counsel/Associate GC.
   - "Legal Counsel/Staff Attorney": Generic attorney, Assistant GC level.
   - "Title IX": Title IX Coordinator, investigator, or civil rights officer.
   - "Intern": Legal intern or clerk.
   - "Paralegal": Paralegal or legal assistant.
3. "salary_min" and "salary_max": Extract numbers representing annual salary ranges. If the posting lists hourly wages, convert them to annual (hourly * 2080). If the posting lists monthly wages, convert them to annual (monthly * 12). If no salary is posted, set both fields to null. Never hallucinate salary.
4. "is_commensurate_with_experience": Set to 1 if the salary is not explicitly posted but the text states "commensurate with experience", "salary depends on experience", or "based on qualifications/market". Set to 0 if a salary is posted or if no mention of experience-based pay is made.
5. "min_years": The minimum years of legal/professional experience required. Set to null if not mentioned.
6. "pref_years": The preferred/desired years of experience. Set to null if not mentioned. If a range is given (e.g. "3-5 years experience"), set min_years = 3 and pref_years = 5.
7. Return ONLY the valid JSON block. Do not include any explanation or markdown formatting outside of the JSON block."""

def clean_llm_json_string(response_text: str) -> str:
    """Cleans up markdown code blocks from LLM response if present."""
    cleaned = response_text.strip()
    if cleaned.startswith("```"):
        # Find first newline
        first_nl = cleaned.find("\n")
        if first_nl != -1:
            cleaned = cleaned[first_nl:].strip()
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].strip()
    return cleaned

def parse_job_with_llm(raw_text: str, inst_name_raw: str) -> Dict[str, Any]:
    """
    Sends the raw job text to local Ollama instance and returns the parsed JSON.
    """
    prompt = f"Analyze this job posting raw text:\nInstitution Name (Raw): {inst_name_raw}\nRaw Posting Text:\n{raw_text}"
    
    payload = {
        "model": MODEL_NAME,
        "system": SYSTEM_PROMPT,
        "prompt": prompt,
        "format": "json",
        "options": {
            "num_ctx": 8192
        },
        "stream": False
    }
    
    r = requests.post(OLLAMA_API_URL, json=payload, timeout=60)
    r.raise_for_status()
    
    res = r.json()
    response_text = res.get("response", "")
    json_str = clean_llm_json_string(response_text)
    
    return json.loads(json_str)

def resolve_institution(conn: sqlite3.Connection, inst_data: Dict[str, Any]) -> str:
    """
    Looks up an institution by name. If it exists, returns its ID.
    If it does not exist, inserts it and returns the new ID.
    """
    name = inst_data.get("name")
    if not name:
        raise ValueError("Institution name is missing in LLM output")
        
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM institutions WHERE name = ?", (name,))
    row = cursor.fetchone()
    
    if row:
        return row[0]
        
    # Not found, insert new
    state = inst_data.get("state_location")
    city = inst_data.get("city_location")
    
    # Normalize state code to 2 uppercase letters or default to 'XX'
    if state:
        state = state.strip().upper()[:2]
    else:
        state = "XX"
        
    if not city:
        city = "Unknown"
        
    return insert_institution(
        conn=conn,
        name=name,
        state_location=state,
        city_location=city
    )

def process_staging_queue(db_path: str = DEFAULT_DB_PATH, limit: Optional[int] = None) -> Dict[str, int]:
    """
    Pulls 'Pending' postings from the staging table, passes them to the LLM,
    inserts normalized records, and updates staging row statuses.
    """
    stats = {"Processed": 0, "Failed": 0}
    
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        query = """
            SELECT id, institution_name_raw, raw_scraped_text, source_url, job_board_source, scrape_date
            FROM job_postings_staging
            WHERE status = 'Pending'
        """
        if limit is not None:
            query += f" LIMIT {limit}"
        
        cursor.execute(query)
        staged_rows = cursor.fetchall()
        
        if not staged_rows:
            print("No pending job postings in staging queue.")
            return stats
            
        print(f"Found {len(staged_rows)} pending postings in staging. Starting parsing...")
        
        for row in staged_rows:
            staging_id = row["id"]
            inst_raw = row["institution_name_raw"]
            raw_text = row["raw_scraped_text"]
            source_url = row["source_url"]
            board_source = row["job_board_source"]
            scrape_date = row["scrape_date"]
            
            try:
                print(f"Parsing job posting {staging_id} ({inst_raw})...")
                parsed_data = parse_job_with_llm(raw_text, inst_raw)
                print(f"Ollama Raw Response: {parsed_data}")
                
                inst_data = parsed_data.get("institution", {})
                job_data = parsed_data.get("job_posting", {})
                
                # Check critical keys
                if not inst_data or not job_data:
                    raise ValueError("Parsed data is missing critical keys")
                
                # Resolve institution ID
                inst_name = inst_data.get("name") or inst_raw
                inst_data["name"] = inst_name
                inst_id = resolve_institution(conn, inst_data)
                
                # Safe type conversion and defaults to prevent NOT NULL check constraint failures
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
                
                # Insert job posting
                insert_job_posting(
                    conn=conn,
                    institution_id=inst_id,
                    job_title=job_title,
                    JD_required=JD_required,
                    standardized_level=standardized_level,
                    is_commensurate_with_experience=is_commensurate_with_experience,
                    job_board_source=board_source,
                    source_url=source_url,
                    post_date=scrape_date,  # Use staging scrape_date as post_date
                    reports_to=job_data.get("reports_to"),
                    salary_min=job_data.get("salary_min"),
                    salary_max=job_data.get("salary_max"),
                    min_years=job_data.get("min_years"),
                    pref_years=job_data.get("pref_years")
                )
                
                # Mark as processed
                update_staging_status(conn, staging_id, "Processed")
                stats["Processed"] += 1
                print(f"Successfully processed posting {staging_id}.")
                
            except Exception as e:
                print(f"Failed to process posting {staging_id}. Error: {e}")
                try:
                    update_staging_status(conn, staging_id, "Failed")
                except Exception as db_err:
                    print(f"Failed to update staging status: {db_err}")
                stats["Failed"] += 1
                
    return stats

if __name__ == "__main__":
    import sys
    limit = None
    if len(sys.argv) > 1:
        try:
            limit = int(sys.argv[1])
        except ValueError:
            pass
    print(f"Running background parsing worker (limit={limit})...")
    res = process_staging_queue(DEFAULT_DB_PATH, limit=limit)
    print("Worker finished. Summary:", res)
