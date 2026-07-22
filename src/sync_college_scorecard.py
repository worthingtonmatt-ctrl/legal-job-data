import os
import sys
import sqlite3
import json
import urllib.request
import urllib.parse
import argparse

# Load env variables from .env if present
def load_env():
    paths = [
        os.path.join(os.getcwd(), ".env"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    ]
    for env_path in paths:
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    if "=" in line:
                        key, val = line.split("=", 1)
                        key = key.strip()
                        val = val.strip().strip("'\"")
                        os.environ[key] = val
            break

# Standard university aliases/abbreviations mapping to official names
ALIASES = {
    "Penn State": "Pennsylvania State University",
    "Ohio State": "Ohio State University",
    "NC State": "North Carolina State University",
    "LSU": "Louisiana State University",
    "MIT": "Massachusetts Institute of Technology",
    "Virginia Tech": "Virginia Polytechnic Institute and State University",
    "Caltech": "California Institute of Technology",
    "UCLA": "University of California-Los Angeles",
    "UC Berkeley": "University of California-Berkeley",
    "UC Davis": "University of California-Davis",
    "UC Irvine": "University of California-Irvine",
    "UC San Diego": "University of California-San Diego",
    "UC Santa Barbara": "University of California-Santa Barbara",
    "UC Santa Cruz": "University of California-Santa Cruz",
    "UC Riverside": "University of California-Riverside",
    "IU": "Indiana University-Bloomington",
    "NYU": "New York University",
    "USC": "University of Southern California",
    "GW": "George Washington University",
    "GWU": "George Washington University",
    "W&M": "College of William and Mary",
    "William & Mary": "College of William and Mary",
    "UNC": "University of North Carolina",
    "UNC Chapel Hill": "University of North Carolina at Chapel Hill",
    "Penn": "University of Pennsylvania",
    "UPenn": "University of Pennsylvania",
    "Pitt": "University of Pittsburgh",
    "UT Austin": "University of Texas at Austin",
    "UT": "University of Texas",
    "UW": "University of Washington",
    "UConn": "University of Connecticut",
    "UMass": "University of Massachusetts-Amherst",
    "Mizzou": "University of Missouri-Columbia",
    "Vanderbilt": "Vanderbilt University",
    "Rutgers": "Rutgers University-New Brunswick",
    "TCU": "Texas Christian University",
    "SMU": "Southern Methodist University",
    "BYU": "Brigham Young University"
}

# User-provided Carnegie basic classifications mapping (1 to 33)
CARNEGIE_MAPPING = {
    1: "Associate's Colleges: High Transfer-High Traditional",
    2: "Associate's Colleges: High Transfer-Mixed Traditional/Nontraditional",
    3: "Associate's Colleges: High Transfer-High Nontraditional",
    4: "Associate's Colleges: Mixed Transfer/Career & Technical-High Traditional",
    5: "Associate's Colleges: Mixed Transfer/Career & Technical-Mixed Traditional/Nontraditional",
    6: "Associate's Colleges: Mixed Transfer/Career & Technical-High Nontraditional",
    7: "Associate's Colleges: High Career & Technical-High Traditional",
    8: "Associate's Colleges: High Career & Technical-Mixed Traditional/Nontraditional",
    9: "Associate's Colleges: High Career & Technical-High Nontraditional",
    10: "Special Focus Two-Year: Health Professions",
    11: "Special Focus Two-Year: Technical Professions",
    12: "Special Focus Two-Year: Arts & Design",
    13: "Special Focus Two-Year: Other Fields",
    14: "Baccalaureate/Associate's Colleges: Associate's Dominant",
    15: "Doctoral Universities: Very High Research Activity (R1)",
    16: "Doctoral Universities: High Research Activity (R2)",
    17: "Doctoral/Professional Universities",
    18: "Master's Colleges & Universities: Larger Programs (M1)",
    19: "Master's Colleges & Universities: Medium Programs (M2)",
    20: "Master's Colleges & Universities: Smaller Programs (M3)",
    21: "Baccalaureate Colleges: Arts & Sciences Focus",
    22: "Baccalaureate Colleges: Diverse Fields",
    23: "Baccalaureate/Associate's Colleges: Mixed Baccalaureate/Associate's",
    24: "Special Focus Four-Year: Faith-Related Institutions",
    25: "Special Focus Four-Year: Medical Schools & Centers",
    26: "Special Focus Four-Year: Other Health Professions Schools",
    27: "Special Focus Four-Year: Engineering and Other Technology-Related Schools",
    28: "Special Focus Four-Year: Business & Management Schools",
    29: "Special Focus Four-Year: Arts, Music & Design Schools",
    30: "Special Focus Four-Year: Law Schools",
    31: "Special Focus Four-Year: Other Special Focus Institutions",
    32: "Tribal Colleges",
    33: "Special Focus Four-Year: Research Institutions"
}

# 3-gram character similarity
def get_similarity(n1, n2):
    # Remove spaces and punctuation
    c1 = "".join(c for c in n1.lower() if c.isalnum())
    c2 = "".join(c for c in n2.lower() if c.isalnum())
    
    ng1 = set(c1[i:i+3] for i in range(len(c1)-2))
    ng2 = set(c2[i:i+3] for i in range(len(c2)-2))
    
    if not ng1:
        return 0.0
    return len(ng1.intersection(ng2)) / len(ng1)

# Combined scoring engine to handle branch campuses and tie breakers
def score_candidate(db_name, db_city, cand_name, cand_city):
    score = get_similarity(db_name, cand_name)
    
    db_clean = "".join(c for c in db_name.lower() if c.isalnum())
    cand_clean = "".join(c for c in cand_name.lower() if c.isalnum())
    
    # 1. Boost if candidate name starts with database name (fixes Saint Mary's University of Minnesota vs University of Minnesota)
    if cand_clean.startswith(db_clean):
        score += 0.25
        
    # 2. Boost if exact match (ignoring case, spaces, and punctuation)
    if db_clean == cand_clean:
        score += 0.20
        
    # 3. Boost if candidate is a main campus
    if "main campus" in cand_name.lower():
        score += 0.15
        
    # 4. Boost if city matches or is contained
    if db_city and db_city != "Unknown":
        db_city_clean = db_city.lower().strip()
        cand_city_clean = cand_city.lower().strip()
        if db_city_clean == cand_city_clean or db_city_clean in cand_name.lower():
            score += 0.15
            
    # 5. Penalize branch campuses if DB name is generic (not specifying a branch)
    has_branch_indicator = "-" in cand_name or "," in cand_name or " campus" in cand_name.lower()
    db_has_branch = "-" in db_name or "," in db_name or " campus" in db_name.lower()
    
    if has_branch_indicator and not db_has_branch:
        if "main campus" not in cand_name.lower():
            score -= 0.15
            
    return score

# API Querying
def query_scorecard_api(api_key, school_name, state=None):
    base_url = "https://api.data.gov/ed/collegescorecard/v1/schools.json"
    fields = [
        "id",
        "school.name",
        "school.ownership",
        "school.carnegie_basic",
        "school.state",
        "school.city",
        "latest.student.size"
    ]
    params = {
        "api_key": api_key,
        "school.name": school_name,
        "fields": ",".join(fields),
        "per_page": 100  # Query 100 results per page to get all campuses of large systems
    }
    if state and state != "XX":
        params["school.state"] = state
        
    url = f"{base_url}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(
        url,
        headers={'User-Agent': 'AntigravityJobHuntSync/1.0'}
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())
            headers = response.info()
            rate_limit_remaining = headers.get("X-RateLimit-Remaining")
            return data.get("results", []), rate_limit_remaining
    except Exception as e:
        if hasattr(e, 'code') and e.code == 429:
            print("Warning: Rate limit exceeded (HTTP 429). Please use a registered API key.")
            return None, None
        else:
            print(f"Warning: Non-fatal error querying API for '{school_name}': {e}")
            return [], None  # Return empty list to skip this school and continue the loop

# Ownership/Funding Type normalization
def map_ownership(ownership_code):
    if ownership_code == 1:
        return "Public"
    elif ownership_code == 2:
        return "Private Non-Profit"
    elif ownership_code == 3:
        return "Private For-Profit"
    return None

def main():
    parser = argparse.ArgumentParser(description="Sync institutions with College Scorecard API")
    parser.add_argument("--commit", action="store_true", help="Actually commit changes to the database")
    parser.add_argument("--api-key", help="College Scorecard API key (overrides .env / env var)")
    parser.add_argument("--limit", type=int, help="Limit the number of institutions to process")
    parser.add_argument("--db-path", default="university_legal_tracker.db", help="Path to SQLite database")
    args = parser.parse_args()
    
    load_env()
    
    api_key = args.api_key or os.environ.get("COLLEGE_SCORECARD_API_KEY") or "DEMO_KEY"
    
    print(f"Using database: {args.db_path}")
    if api_key == "DEMO_KEY":
        print("Warning: Using default DEMO_KEY. You may be rate limited to 30 requests/hour.")
    else:
        masked_key = api_key[:4] + "..." + api_key[-4:] if len(api_key) > 8 else "..."
        print(f"Using API Key: {masked_key}")
        
    if not args.commit:
        print("DRY-RUN MODE: No changes will be saved to the database. Use --commit to apply changes.\n")
        
    conn = sqlite3.connect(args.db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Get all institutions that have at least one missing field of interest
    cursor.execute("""
        SELECT id, name, state_location, city_location, funding_type, carnegie_classification, estimated_enrollment
        FROM institutions
        WHERE funding_type IS NULL OR carnegie_classification IS NULL OR estimated_enrollment IS NULL
    """)
    institutions = [dict(row) for row in cursor.fetchall()]
    
    total_to_process = len(institutions)
    print(f"Found {total_to_process} institutions in database with missing data.")
    
    if args.limit:
        institutions = institutions[:args.limit]
        print(f"Limiting execution to the first {len(institutions)} institutions.\n")
        
    matched_count = 0
    updated_count = 0
    skipped_count = 0
    
    # Matching threshold
    MATCH_THRESHOLD = 0.75
    
    for idx, inst in enumerate(institutions):
        db_id = inst["id"]
        raw_db_name = inst["name"]
        db_state = inst["state_location"]
        db_city = inst["city_location"]
        
        # Skip obviously non-university entries
        if raw_db_name in ("N/A", "Unknown") or (db_state == "XX" and raw_db_name in ("Covista", "XL Law & Consulting P.A.")):
            print(f"[{idx+1}/{len(institutions)}] Skipping generic/non-institution: {raw_db_name}")
            skipped_count += 1
            continue
            
        # Resolve aliases (e.g. "Penn State" -> "Pennsylvania State University")
        db_name = ALIASES.get(raw_db_name, raw_db_name)
        if db_name != raw_db_name:
            print(f"[{idx+1}/{len(institutions)}] Searching for: '{raw_db_name}' -> alias: '{db_name}' ({db_state})")
        else:
            print(f"[{idx+1}/{len(institutions)}] Searching for: '{db_name}' ({db_state})")
        
        results = []
        rate_limit_rem = None
        
        # 1. Search with state filter first (unless state is XX)
        if db_state and db_state != "XX":
            results, rate_limit_rem = query_scorecard_api(api_key, db_name, db_state)
            
        # 2. Fallback: Search without state filter if no results
        if not results and results is not None:
            results, rate_limit_rem = query_scorecard_api(api_key, db_name, None)
            
        if results is None:
            # Fatal error/rate limit
            print("Stopping sync process due to API error or rate limit.")
            break
            
        if not results:
            print("  No matches found on the API.")
            continue
            
        # 3. Find the best match using candidate scoring
        best_match = None
        best_score = 0.0
        
        for res in results:
            api_name = res.get("school.name")
            api_city = res.get("school.city")
            
            score = score_candidate(db_name, db_city, api_name, api_city)
            
            # Boost score slightly if state matches to resolve ties
            if res.get("school.state") == db_state:
                score += 0.05
                
            if score > best_score:
                best_score = score
                best_match = res
                
        # 4. Process matches
        if best_match and best_score >= MATCH_THRESHOLD:
            matched_count += 1
            api_name = best_match.get("school.name")
            api_state = best_match.get("school.state")
            api_city = best_match.get("school.city")
            api_ownership = best_match.get("school.ownership")
            api_carnegie_code = best_match.get("school.carnegie_basic")
            api_size = best_match.get("latest.student.size")
            
            funding_type = map_ownership(api_ownership)
            carnegie_label = CARNEGIE_MAPPING.get(api_carnegie_code)
            
            print(f"  Found match: '{api_name}' ({api_state}) [Similarity Score: {best_score:.2f}]")
            
            updates = {}
            if inst["funding_type"] is None and funding_type:
                updates["funding_type"] = funding_type
            if inst["carnegie_classification"] is None and carnegie_label:
                updates["carnegie_classification"] = carnegie_label
            if inst["estimated_enrollment"] is None and api_size is not None:
                updates["estimated_enrollment"] = api_size
            if inst["state_location"] == "XX" and api_state:
                updates["state_location"] = api_state
            if inst["city_location"] == "Unknown" and api_city:
                updates["city_location"] = api_city
                
            if updates:
                print("  Updates:")
                for col, val in updates.items():
                    print(f"    - {col}: {inst[col]} -> {val}")
                    
                if args.commit:
                    set_clause = ", ".join(f"{col} = ?" for col in updates.keys())
                    params = list(updates.values()) + [db_id]
                    cursor.execute(f"UPDATE institutions SET {set_clause} WHERE id = ?", params)
                    updated_count += 1
            else:
                print("  No new information to add (existing values are up to date).")
        else:
            match_name = best_match.get("school.name") if best_match else "None"
            print(f"  Best match '{match_name}' score ({best_score:.2f}) is below threshold ({MATCH_THRESHOLD}).")
            
        if rate_limit_rem is not None:
            print(f"  Rate limit remaining: {rate_limit_rem}")
            
    if args.commit:
        conn.commit()
        print(f"\nSUCCESS: Synchronization complete. Updated {updated_count} institutions in the database.")
    else:
        print(f"\nDRY-RUN COMPLETE: Matched {matched_count} institutions. No changes were committed. (Processed {idx+1 - skipped_count} schools, skipped {skipped_count})")
        
    conn.close()

if __name__ == "__main__":
    main()
