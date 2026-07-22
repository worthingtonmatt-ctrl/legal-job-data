import sqlite3
from src.db import get_db_connection, DEFAULT_DB_PATH

def reset_llm_failed_postings(db_path: str = DEFAULT_DB_PATH):
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        
        # Select all failed staging rows
        cursor.execute("""
            SELECT id, institution_name_raw, source_url 
            FROM job_postings_staging 
            WHERE status = 'Failed'
        """)
        failed_rows = cursor.fetchall()
        
        reset_count = 0
        duplicate_count = 0
        
        for row in failed_rows:
            staging_id = row["id"]
            inst_raw = row["institution_name_raw"]
            source_url = row["source_url"]
            
            # Check if this job has actually been successfully inserted in the main table
            cursor.execute("SELECT COUNT(*) FROM job_postings WHERE source_url = ?", (source_url,))
            already_inserted = cursor.fetchone()[0] > 0
            
            if already_inserted:
                # It is a benign duplicate that failed staging insertion due to UNIQUE constraints.
                # Leave status as 'Failed' or mark as processed/duplicate if we want to clean up.
                duplicate_count += 1
            else:
                # It failed because of an LLM json format slip or database lookup error, and is NOT in the main table.
                # Reset to Pending so it can be retried!
                cursor.execute("""
                    UPDATE job_postings_staging 
                    SET status = 'Pending' 
                    WHERE id = ?
                """, (staging_id,))
                reset_count += 1
                print(f"Resetting failed posting to Pending: {inst_raw} (URL: {source_url})")
                
        conn.commit()
        print(f"\nReset Summary:")
        print(f"  Reset to Pending (LLM Format Failures): {reset_count}")
        print(f"  Kept as Failed (Unique/Deduplicated Jobs): {duplicate_count}")

if __name__ == "__main__":
    reset_llm_failed_postings()
