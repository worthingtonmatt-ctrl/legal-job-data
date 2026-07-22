import os
import sqlite3
import uuid
from contextlib import contextmanager
from typing import Generator

DEFAULT_DB_PATH = "university_legal_tracker.db"

@contextmanager
def get_db_connection(db_path: str = DEFAULT_DB_PATH) -> Generator[sqlite3.Connection, None, None]:
    """
    Context manager to manage a SQLite connection.
    Ensures foreign keys are enabled and handles commit/rollback on exit.
    """
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("PRAGMA foreign_keys = ON;")
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db(db_path: str = DEFAULT_DB_PATH) -> None:
    """
    Initializes the SQLite database with the required schema,
    including tables, check constraints, foreign keys, and indexes.
    """
    schema = """
    CREATE TABLE IF NOT EXISTS institutions (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        funding_type TEXT CHECK(funding_type IS NULL OR funding_type IN ('Public', 'Private Non-Profit', 'Private For-Profit')),
        carnegie_classification TEXT,
        athletic_conference TEXT,
        state_location TEXT CHECK(length(state_location) = 2) NOT NULL,
        city_location TEXT NOT NULL,
        estimated_enrollment INTEGER CHECK(estimated_enrollment IS NULL OR estimated_enrollment >= 0)
    );

    CREATE TABLE IF NOT EXISTS job_postings_staging (
        id TEXT PRIMARY KEY,
        institution_name_raw TEXT NOT NULL,
        raw_scraped_text TEXT NOT NULL,
        source_url TEXT NOT NULL,
        job_board_source TEXT NOT NULL,
        scrape_date TEXT DEFAULT (date('now')),
        status TEXT DEFAULT 'Pending' CHECK(status IN ('Pending', 'Processed', 'Failed')) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS job_postings (
        id TEXT PRIMARY KEY,
        institution_system_id TEXT,
        institution_id TEXT NOT NULL,
        job_title TEXT NOT NULL,
        JD_required INTEGER CHECK(JD_required IN (0, 1)) NOT NULL,
        standardized_level TEXT CHECK(standardized_level IN (
            'General Counsel',
            'Deputy General Counsel',
            'Associate General Counsel',
            'Assistant General Counsel',
            'Legal Counsel/Staff Attorney',
            'Title IX',
            'Intern',
            'Paralegal'
        )) NOT NULL,
        reports_to TEXT,
        salary_min REAL,
        salary_max REAL,
        is_commensurate_with_experience INTEGER CHECK(is_commensurate_with_experience IN (0, 1)) NOT NULL,
        min_years INTEGER CHECK(min_years IS NULL OR min_years >= 0),
        pref_years INTEGER CHECK(pref_years IS NULL OR pref_years >= 0),
        job_board_source TEXT NOT NULL,
        source_url TEXT NOT NULL,
        post_date TEXT NOT NULL CHECK(post_date LIKE '____-__-__'),
        FOREIGN KEY(institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
        UNIQUE(institution_id, job_title, post_date)
    );

    -- Indexes to speed up queries
    CREATE INDEX IF NOT EXISTS idx_job_postings_level_date ON job_postings(standardized_level, post_date);
    CREATE INDEX IF NOT EXISTS idx_institutions_state ON institutions(state_location);
    """
    with get_db_connection(db_path) as conn:
        conn.executescript(schema)

# Helper functions for database interaction
def insert_institution(
    conn: sqlite3.Connection,
    name: str,
    state_location: str,
    city_location: str,
    funding_type: str = None,
    carnegie_classification: str = None,
    athletic_conference: str = None,
    estimated_enrollment: int = None,
    inst_id: str = None
) -> str:
    """
    Inserts a new institution and returns its UUID.
    """
    if not inst_id:
        inst_id = str(uuid.uuid4())
    
    conn.execute(
        """
        INSERT INTO institutions (
            id, name, funding_type, carnegie_classification, 
            athletic_conference, state_location, city_location, estimated_enrollment
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (inst_id, name, funding_type, carnegie_classification, 
         athletic_conference, state_location, city_location, estimated_enrollment)
    )
    return inst_id

def insert_staging_posting(
    conn: sqlite3.Connection,
    institution_name_raw: str,
    raw_scraped_text: str,
    source_url: str,
    job_board_source: str,
    scrape_date: str = None,
    status: str = 'Pending',
    posting_id: str = None
) -> str:
    """
    Inserts a raw scraped posting into staging and returns its UUID.
    """
    if not posting_id:
        posting_id = str(uuid.uuid4())
        
    if scrape_date:
        conn.execute(
            """
            INSERT INTO job_postings_staging (
                id, institution_name_raw, raw_scraped_text, source_url, job_board_source, scrape_date, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (posting_id, institution_name_raw, raw_scraped_text, source_url, job_board_source, scrape_date, status)
        )
    else:
        conn.execute(
            """
            INSERT INTO job_postings_staging (
                id, institution_name_raw, raw_scraped_text, source_url, job_board_source, status
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            (posting_id, institution_name_raw, raw_scraped_text, source_url, job_board_source, status)
        )
    return posting_id

def update_staging_status(conn: sqlite3.Connection, staging_id: str, status: str) -> None:
    """
    Updates the processing status of a staging table entry.
    """
    conn.execute(
        "UPDATE job_postings_staging SET status = ? WHERE id = ?",
        (status, staging_id)
    )

def insert_job_posting(
    conn: sqlite3.Connection,
    institution_id: str,
    job_title: str,
    JD_required: int,
    standardized_level: str,
    is_commensurate_with_experience: int,
    job_board_source: str,
    source_url: str,
    post_date: str,
    institution_system_id: str = None,
    reports_to: str = None,
    salary_min: float = None,
    salary_max: float = None,
    min_years: int = None,
    pref_years: int = None,
    posting_id: str = None
) -> str:
    """
    Inserts a parsed job posting into the main job_postings table.
    """
    if not posting_id:
        posting_id = str(uuid.uuid4())
        
    conn.execute(
        """
        INSERT INTO job_postings (
            id, institution_system_id, institution_id, job_title, JD_required,
            standardized_level, reports_to, salary_min, salary_max,
            is_commensurate_with_experience, min_years, pref_years,
            job_board_source, source_url, post_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (posting_id, institution_system_id, institution_id, job_title, JD_required,
         standardized_level, reports_to, salary_min, salary_max,
         is_commensurate_with_experience, min_years, pref_years,
         job_board_source, source_url, post_date)
    )
    return posting_id
