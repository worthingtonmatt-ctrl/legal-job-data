import os
import sqlite3
import fitz  # PyMuPDF
from typing import Dict, Any, List
from src.db import get_db_connection, DEFAULT_DB_PATH

DATA_DIR = r"E:\AI_Projects\JobHunt\data"

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extracts all text from a PDF file page-by-page using PyMuPDF."""
    doc = fitz.open(pdf_path)
    text = []
    for page in doc:
        text.append(page.get_text())
    doc.close()
    return "\n".join(text)

def ingest_local_files(db_path: str = DEFAULT_DB_PATH):
    if not os.path.exists(DATA_DIR):
        print(f"Error: Data directory '{DATA_DIR}' does not exist.")
        return
        
    files = [f for f in os.listdir(DATA_DIR) if f.endswith(('.pdf', '.txt'))]
    print(f"Found {len(files)} files in '{DATA_DIR}' to process.")
    
    staged_count = 0
    duplicate_count = 0
    
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        
        for filename in files:
            file_path = os.path.join(DATA_DIR, filename)
            ext = os.path.splitext(filename)[1].lower()
            
            # 1. Generate a unique source_url based on the filename to enforce deduplication
            source_url = f"local://data/{filename}"
            
            # Check if this local file is already in staging
            cursor.execute("SELECT COUNT(*) FROM job_postings_staging WHERE source_url = ?", (source_url,))
            if cursor.fetchone()[0] > 0:
                duplicate_count += 1
                print(f"Skipping duplicate staged file: {filename}")
                continue
                
            # Check if this local file is already in main job_postings
            cursor.execute("SELECT COUNT(*) FROM job_postings WHERE source_url = ?", (source_url,))
            if cursor.fetchone()[0] > 0:
                duplicate_count += 1
                print(f"Skipping duplicate processed file: {filename}")
                continue
                
            # 2. Extract Text
            try:
                if ext == '.pdf':
                    raw_text = extract_text_from_pdf(file_path)
                    board_source = "Local PDF"
                else:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        raw_text = f.read()
                    board_source = "Local TXT"
            except Exception as e:
                print(f"Failed to read file {filename}: {e}")
                continue
                
            if not raw_text.strip():
                print(f"Warning: File {filename} is empty. Skipping.")
                continue
                
            # 3. Guess institution/title from filename for the raw field
            # E.g., "Assistant General Counsel - UNLV.pdf" -> "UNLV"
            base_name = os.path.splitext(filename)[0]
            if " _ National Association" in base_name:
                base_name = base_name.split(" _ National Association")[0]
                
            # Extract a guessed institution
            raw_inst = "Unknown Institution"
            if " in " in base_name:
                raw_inst = base_name
            elif " - " in base_name:
                parts = base_name.split(" - ")
                raw_inst = parts[-1].strip()
            else:
                raw_inst = base_name
                
            # 4. Insert into staging
            # Default posting date to March 15, 2026 since they were saved in March
            scrape_date = "2026-03-15"
            
            cursor.execute("""
                INSERT INTO job_postings_staging 
                (id, institution_name_raw, raw_scraped_text, source_url, job_board_source, scrape_date, status)
                VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, 'Pending')
            """, (raw_inst, raw_text, source_url, board_source, scrape_date))
            
            staged_count += 1
            print(f"Successfully staged: {filename} -> Guessed Inst: {raw_inst}")
    
    print("\nIngestion Summary:")
    print(f"  Successfully Staged: {staged_count}")
    print(f"  Skipped (Duplicates): {duplicate_count}")

if __name__ == "__main__":
    ingest_local_files()
