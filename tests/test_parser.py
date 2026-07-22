import unittest
import sqlite3
import os
import json
from unittest.mock import patch, MagicMock
from src.db import init_db, get_db_connection, insert_staging_posting
from src.parser import (
    clean_llm_json_string,
    parse_job_with_llm,
    resolve_institution,
    process_staging_queue
)

TEST_DB_PATH = "test_parser.db"

class TestParser(unittest.TestCase):

    def setUp(self):
        if os.path.exists(TEST_DB_PATH):
            os.remove(TEST_DB_PATH)
        init_db(TEST_DB_PATH)

    def tearDown(self):
        if os.path.exists(TEST_DB_PATH):
            try:
                os.remove(TEST_DB_PATH)
            except PermissionError:
                pass

    def test_clean_llm_json_string(self):
        """Test markdown code block removal."""
        raw_md = "```json\n{\n  \"key\": \"value\"\n}\n```"
        cleaned = clean_llm_json_string(raw_md)
        self.assertEqual(cleaned, "{\n  \"key\": \"value\"\n}")

        raw_clean = "{\n  \"key\": \"value\"\n}"
        cleaned_clean = clean_llm_json_string(raw_clean)
        self.assertEqual(cleaned_clean, raw_clean)

    @patch('requests.post')
    def test_parse_job_with_llm(self, mock_post):
        """Test Ollama API integration and JSON parsing."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "response": "{\n  \"institution\": {\n    \"name\": \"Notre Dame\"\n  }\n}"
        }
        mock_post.return_value = mock_response

        res = parse_job_with_llm("raw text", "Notre Dame")
        self.assertEqual(res["institution"]["name"], "Notre Dame")

    def test_resolve_institution_existing(self):
        """Test lookup of existing institution."""
        with get_db_connection(TEST_DB_PATH) as conn:
            # First manually insert
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO institutions (id, name, state_location, city_location, funding_type)
                VALUES ('uuid-123', 'University of Denver', 'CO', 'Denver', 'Private Non-Profit')
                """
            )
            
            inst_data = {"name": "University of Denver", "state_location": "CO", "city_location": "Denver"}
            inst_id = resolve_institution(conn, inst_data)
            self.assertEqual(inst_id, "uuid-123")

    def test_resolve_institution_new(self):
        """Test inserting a new institution with default/null handling."""
        with get_db_connection(TEST_DB_PATH) as conn:
            inst_data = {"name": "New College", "state_location": "nc", "city_location": "Charlotte"}
            inst_id = resolve_institution(conn, inst_data)
            self.assertIsNotNone(inst_id)
            
            # Read from db
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM institutions WHERE id = ?", (inst_id,))
            row = cursor.fetchone()
            self.assertEqual(row["name"], "New College")
            self.assertEqual(row["state_location"], "NC")  # Normalized to uppercase
            self.assertEqual(row["city_location"], "Charlotte")
            self.assertIsNone(row["funding_type"])  # Allowed to be Null

    @patch('src.parser.parse_job_with_llm')
    def test_process_staging_queue_success(self, mock_parse):
        """Test successful parsing and transfer from staging to main tables."""
        # Mock LLM return
        mock_parse.return_value = {
            "institution": {
                "name": "East Carolina University",
                "state_location": "NC",
                "city_location": "Greenville"
            },
            "job_posting": {
                "job_title": "Associate University Attorney",
                "JD_required": 1,
                "standardized_level": "Associate General Counsel",
                "reports_to": "General Counsel",
                "salary_min": 120000.0,
                "salary_max": 140000.0,
                "is_commensurate_with_experience": 0,
                "min_years": 3,
                "pref_years": 5
            }
        }

        # Populate staging
        with get_db_connection(TEST_DB_PATH) as conn:
            insert_staging_posting(
                conn,
                institution_name_raw="ECU Raw",
                raw_scraped_text="Raw Description",
                source_url="http://example.com/job1",
                job_board_source="NACUA",
                scrape_date="2026-06-22",
                status="Pending"
            )

        # Run process
        stats = process_staging_queue(TEST_DB_PATH)
        self.assertEqual(stats["Processed"], 1)
        self.assertEqual(stats["Failed"], 0)

        # Verify DB updates
        with get_db_connection(TEST_DB_PATH) as conn:
            cursor = conn.cursor()
            
            # Staging row updated to Processed
            cursor.execute("SELECT status FROM job_postings_staging")
            self.assertEqual(cursor.fetchone()[0], "Processed")
            
            # Institution created
            cursor.execute("SELECT * FROM institutions")
            inst = cursor.fetchone()
            self.assertEqual(inst["name"], "East Carolina University")
            self.assertEqual(inst["state_location"], "NC")
            
            # Job posting created
            cursor.execute("SELECT * FROM job_postings")
            job = cursor.fetchone()
            self.assertEqual(job["institution_id"], inst["id"])
            self.assertEqual(job["job_title"], "Associate University Attorney")
            self.assertEqual(job["min_years"], 3)
            self.assertEqual(job["pref_years"], 5)
            self.assertEqual(job["salary_min"], 120000.0)
            self.assertEqual(job["salary_max"], 140000.0)
            self.assertEqual(job["post_date"], "2026-06-22")

    @patch('src.parser.parse_job_with_llm')
    def test_process_staging_queue_failure(self, mock_parse):
        """Verify that parsing failures (e.g. malformed LLM responses) mark staging as Failed and don't halt loop."""
        # Mock LLM to raise error (e.g. invalid JSON format)
        mock_parse.side_effect = json.JSONDecodeError("Expecting value", "", 0)

        # Populate staging with two pending items
        with get_db_connection(TEST_DB_PATH) as conn:
            insert_staging_posting(
                conn,
                institution_name_raw="Fail Univ 1",
                raw_scraped_text="Raw Description 1",
                source_url="http://example.com/fail1",
                job_board_source="NACUA",
                status="Pending"
            )
            insert_staging_posting(
                conn,
                institution_name_raw="Fail Univ 2",
                raw_scraped_text="Raw Description 2",
                source_url="http://example.com/fail2",
                job_board_source="NACUA",
                status="Pending"
            )

        # Run process
        stats = process_staging_queue(TEST_DB_PATH)
        self.assertEqual(stats["Processed"], 0)
        self.assertEqual(stats["Failed"], 2)

        # Verify DB updates
        with get_db_connection(TEST_DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT status FROM job_postings_staging")
            statuses = [row[0] for row in cursor.fetchall()]
            self.assertEqual(statuses, ["Failed", "Failed"])
            
            # No postings created
            cursor.execute("SELECT COUNT(*) FROM job_postings")
            self.assertEqual(cursor.fetchone()[0], 0)

if __name__ == "__main__":
    unittest.main()
