import re
import sqlite3
import requests
import time
from bs4 import BeautifulSoup
from typing import List, Dict, Any, Optional
from src.db import get_db_connection, insert_staging_posting, DEFAULT_DB_PATH

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*"
}

def clean_description_text(html_content: str) -> str:
    """
    Parses HTML content, extracts clean text, and filters out standard university 
    boilerplates (EEO, accessibility, background checks, Clery Act) to trim 
    the context window for local LLMs, while preserving compliance-related duties.
    """
    if not html_content:
        return ""
        
    soup = BeautifulSoup(html_content, "html.parser")
    
    # Remove script and style tags
    for s in soup(["script", "style"]):
        s.decompose()
        
    # Get text with newlines separating tags cleanly
    raw_text = soup.get_text(separator="\n")
    raw_lines = [line.strip() for line in raw_text.split("\n")]
    lines = [line for line in raw_lines if line]
    
    # Boilerplate detection keywords
    eeo_keywords = {
        "employer", "opportunity", "discrimination", "race", "color", "religion", 
        "sex", "national origin", "disability", "veteran", "sexual orientation", 
        "gender identity", "status", "accommodations", "diversity", "inclusion",
        "equal", "affirmative", "action", "protected", "creed", "age", "marital",
        "eeo", "aa"
    }
    
    clery_bg_keywords = {
        "clery", "annual security report", "background check", 
        "background investigation", "criminal history", "fingerprint"
    }

    cleaned_lines = []
    for line in lines:
        line_lower = line.lower()
        
        # 1. Check for standard long-winded EEO and accessibility phrases
        is_eeo_phrase = False
        standard_eeo_phrases = [
            "equal opportunity employer",
            "is an equal opportunity",
            "affirmative action employer",
            "qualified applicants will receive consideration",
            "without regard to race",
            "does not discriminate on the basis of",
            "in compliance with title ix",
            "diversity is a core value",
            "committed to creating a diverse",
            "in compliance with the clery act",
            "disability services",
            "reasonable accommodation",
            "reasonable accommodations",
            "criminal background check",
            "satisfactory criminal background",
            "we are eeo",
            "contingent upon a background"
        ]
        
        for phrase in standard_eeo_phrases:
            if phrase in line_lower:
                is_eeo_phrase = True
                break
                
        if is_eeo_phrase:
            continue
            
        # 2. Count dense boilerplate keywords (to avoid discarding compliance duties)
        words = set(re.findall(r'\b[a-z]+\b', line_lower))
        eeo_match_count = len(words.intersection(eeo_keywords))
        bg_match_count = len(words.intersection(clery_bg_keywords))
        
        if eeo_match_count >= 5:
            continue
            
        if bg_match_count >= 2 and len(line) > 150:
            continue
            
        cleaned_lines.append(line)
        
    return "\n\n".join(cleaned_lines)

def is_duplicate(conn: sqlite3.Connection, source_url: str) -> bool:
    """
    Checks if a job posting with the same source_url already exists 
    in either staging or main job postings.
    """
    cursor = conn.cursor()
    
    # Check staging
    cursor.execute("SELECT COUNT(*) FROM job_postings_staging WHERE source_url = ?", (source_url,))
    if cursor.fetchone()[0] > 0:
        return True
        
    # Check parsed postings
    cursor.execute("SELECT COUNT(*) FROM job_postings WHERE source_url = ?", (source_url,))
    if cursor.fetchone()[0] > 0:
        return True
        
    return False

# HIGHEREDJOBS SCRAPER FUNCTIONALITY
def fetch_higheredjobs_list() -> List[Dict[str, Any]]:
    """
    Fetches the list of Legal Affairs jobs from the HigherEdJobs API.
    """
    url = "https://www.higheredjobs.com/assets/api/searchResults.cfc"
    payload = {
        "method": "getResults",
        "JobCatCodeList": 33,  # Legal Affairs Category
        "sortBy": 0,          # Sort by date
        "AllCatsReturned": "true"
    }
    
    r = requests.post(url, headers=HEADERS, data=payload, timeout=15)
    r.raise_for_status()
    
    res = r.json()
    if res.get("success") == 1:
        return res.get("data", {}).get("ARYSEARCHJOBS", [])
    return []

def fetch_higheredjobs_detail(job_code: int, browser_instance: Optional[Any] = None) -> str:
    """
    Fetches and extracts raw job description text from a HigherEdJobs detail page.
    Supports using Playwright browser_instance for isolated browser contexts.
    """
    url = f"https://www.higheredjobs.com/admin/details.cfm?JobCode={job_code}"
    
    if browser_instance:
        # Create fresh context with stealth scripts
        context = browser_instance.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800},
            device_scale_factor=1,
            is_mobile=False,
            has_touch=False,
            locale="en-US",
            timezone_id="America/New_York"
        )
        context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5]
            });
            window.chrome = {
                runtime: {}
            };
        """)
        page = context.new_page()
        try:
            page.goto(url, wait_until="load")
            page.wait_for_timeout(3000)
            content = page.content()
        finally:
            page.close()
            context.close()
    else:
        r = requests.get(url, headers=HEADERS, timeout=15)
        r.raise_for_status()
        content = r.text
        
    soup = BeautifulSoup(content, "html.parser")
    desc_div = soup.find(id="jobDesc")
    if desc_div:
        return str(desc_div)
        
    if "Request unsuccessful" in content or "incident ID" in content or "Access Denied" in content:
        raise Exception("Blocked by Incapsula security check")
        
    raise Exception("Job description element #jobDesc not found on page")

# NACUA SCRAPER FUNCTIONALITY
def fetch_nacua_list(page: int = 1) -> List[Dict[str, Any]]:
    """
    Fetches a page of job listings from the NACUA Career Center API.
    """
    url = "https://careercenter.nacua.org/api/v1/jobs"
    params = {
        "locale": "en",
        "page": page,
        "sort": "date"
    }
    r = requests.get(url, headers=HEADERS, params=params, timeout=15)
    r.raise_for_status()
    
    res = r.json()
    return res.get("data", [])

def fetch_nacua_detail(job_id: int) -> Dict[str, Any]:
    """
    Fetches the raw job detail dictionary from the NACUA API.
    """
    url = f"https://careercenter.nacua.org/api/v1/jobs/{job_id}"
    r = requests.get(url, headers=HEADERS, timeout=15)
    r.raise_for_status()
    
    res = r.json()
    return res.get("data", {})

# MAIN RUNNER
def run_scraper(db_path: str = DEFAULT_DB_PATH, max_pages: int = 1, limit: Optional[int] = None) -> Dict[str, int]:
    """
    Orchestrates the scraping run for both sites:
    1. Fetches listings
    2. Performs deduplication checks
    3. Crawls descriptions and cleans text
    4. Saves pending items to staging
    """
    stats = {"HigherEdJobs": 0, "NACUA": 0, "Duplicates": 0, "Errors": 0}
    
    playwright_ctx = None
    browser = None
    
    try:
        from playwright.sync_api import sync_playwright
        print("Initializing Playwright browser for HigherEdJobs (context rotation)...")
        playwright_ctx = sync_playwright().start()
        browser = playwright_ctx.chromium.launch(headless=True)
        print("Playwright browser initialized successfully.")
    except Exception as pw_err:
        print(f"Warning: Failed to initialize Playwright: {pw_err}. Falling back to requests.")
        playwright_ctx = None
        browser = None
        
    try:
        with get_db_connection(db_path) as conn:
            # --- 1. Process HigherEdJobs ---
            try:
                print("Fetching HigherEdJobs listings...")
                hej_jobs = fetch_higheredjobs_list()
                print(f"Found {len(hej_jobs)} total listings on HigherEdJobs.")
                
                jobs_to_process = hej_jobs[:limit] if limit is not None else hej_jobs
                
                for job in jobs_to_process:
                    job_code = job.get("JobCode")
                    if not job_code:
                        continue
                        
                    source_url = f"https://www.higheredjobs.com/admin/details.cfm?JobCode={job_code}"
                    
                    if is_duplicate(conn, source_url):
                        stats["Duplicates"] += 1
                        continue
                    
                    try:
                        print(f"Scraping HigherEdJobs listing: {job.get('JobTitle')} - {job.get('InstName')}")
                        raw_html = fetch_higheredjobs_detail(job_code, browser_instance=browser)
                        cleaned_text = clean_description_text(raw_html)
                        
                        insert_staging_posting(
                            conn=conn,
                            institution_name_raw=job.get("InstName", "Unknown Institution"),
                            raw_scraped_text=f"Job Title: {job.get('JobTitle')}\n\n{cleaned_text}",
                            source_url=source_url,
                            job_board_source="HigherEdJobs",
                            status="Pending"
                        )
                        stats["HigherEdJobs"] += 1
                        time.sleep(2.0)
                    except Exception as e:
                        print(f"Error processing HigherEdJobs job {job_code}: {e}")
                        stats["Errors"] += 1
                        
            except Exception as e:
                print(f"Error fetching HigherEdJobs list: {e}")
                stats["Errors"] += 1
                
            # --- 2. Process NACUA ---
            for page in range(1, max_pages + 1):
                try:
                    print(f"Fetching NACUA listings (Page {page})...")
                    nacua_jobs = fetch_nacua_list(page)
                    if not nacua_jobs:
                        print("No more NACUA jobs found.")
                        break
                        
                    print(f"Found {len(nacua_jobs)} listings on NACUA Page {page}.")
                    
                    jobs_to_process = nacua_jobs[:limit] if limit is not None else nacua_jobs
                    
                    for job in jobs_to_process:
                        job_id = job.get("id")
                        source_url = job.get("url")
                        if not job_id or not source_url:
                            continue
                            
                        if is_duplicate(conn, source_url):
                            stats["Duplicates"] += 1
                            continue
                        
                        try:
                            inst_name = job.get("company", {}).get("name", "Unknown Institution")
                            print(f"Scraping NACUA listing: {job.get('title')} - {inst_name}")
                            job_detail = fetch_nacua_detail(job_id)
                            raw_html = job_detail.get("description", "")
                            cleaned_text = clean_description_text(raw_html)
                            
                            # Extract salary metadata from detail API
                            salary_info = ""
                            base_salary = job_detail.get("baseSalary", {})
                            if base_salary and isinstance(base_salary, dict):
                                val = base_salary.get("value", {})
                                if val:
                                    min_val = val.get("minValue")
                                    max_val = val.get("maxValue")
                                    unit = val.get("unitText", "YEAR")
                                    if min_val or max_val:
                                        salary_info = f"Salary/Compensation Info from API: Min: {min_val}, Max: {max_val} per {unit}\n"
                            
                            custom_fields = job_detail.get("customBlockBottom", [])
                            if custom_fields and isinstance(custom_fields, list):
                                for field in custom_fields:
                                    if isinstance(field, dict) and field.get("label") == "Salary":
                                        val = field.get("value")
                                        if val:
                                            salary_info += f"Salary/Compensation Text from API: {val}\n"
                                            
                            text_to_stage = f"Job Title: {job.get('title')}\n"
                            if salary_info:
                                text_to_stage += salary_info + "\n"
                            text_to_stage += cleaned_text
                            
                            insert_staging_posting(
                                conn=conn,
                                institution_name_raw=inst_name,
                                raw_scraped_text=text_to_stage,
                                source_url=source_url,
                                job_board_source="NACUA",
                                status="Pending"
                            )
                            stats["NACUA"] += 1
                            time.sleep(1.0)
                        except Exception as e:
                            print(f"Error processing NACUA job {job_id}: {e}")
                            stats["Errors"] += 1
                            
                except Exception as e:
                    print(f"Error fetching NACUA list on page {page}: {e}")
                    stats["Errors"] += 1
                    
    finally:
        if browser:
            try:
                browser.close()
            except Exception:
                pass
        if playwright_ctx:
            try:
                playwright_ctx.stop()
            except Exception:
                pass
                
    return stats

if __name__ == "__main__":
    # Test script locally
    import os
    if not os.path.exists(DEFAULT_DB_PATH):
        from src.db import init_db
        init_db(DEFAULT_DB_PATH)
    # Run full scrape (pages=3, limit=None, will only process non-duplicates)
    stats = run_scraper(DEFAULT_DB_PATH, max_pages=3, limit=None)
    print("Scraping results:", stats)
