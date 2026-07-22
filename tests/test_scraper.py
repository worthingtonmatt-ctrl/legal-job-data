import unittest
import sqlite3
import os
from unittest.mock import patch, MagicMock
from src.db import init_db, get_db_connection, insert_institution, insert_job_posting, insert_staging_posting
from src.scraper import clean_description_text, is_duplicate, fetch_higheredjobs_list, fetch_higheredjobs_detail, fetch_nacua_list, fetch_nacua_detail, run_scraper

TEST_DB_PATH = "test_scraper.db"

class TestScraper(unittest.TestCase):

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

    def test_clean_description_text_boilerplates(self):
        """Test that EEO and accessibility boilerplates are correctly cleaned out, while core text is kept."""
        sample_html = """
        <div>
            <h1>Associate General Counsel</h1>
            <p>The Associate General Counsel will represent the University in legal matters and advise on research contracts.</p>
            <p>Responsible for compliance with federal and state regulations, including advising on Clery Act and Title IX matters.</p>
            <p>We are an Equal Opportunity Employer. All qualified applicants will receive consideration for employment without regard to race, color, religion, sex, national origin, disability status, protected veteran status, gender identity, or sexual orientation.</p>
            <p>If you require reasonable accommodations due to a disability in order to apply, please contact Disability Services.</p>
            <p>All offers of employment are contingent upon a satisfactory criminal background check and fingerprinting in accordance with state guidelines.</p>
        </div>
        """
        cleaned = clean_description_text(sample_html)
        
        # Verify job details are kept
        self.assertIn("Associate General Counsel", cleaned)
        self.assertIn("represent the University in legal matters", cleaned)
        self.assertIn("compliance with federal and state regulations", cleaned)
        self.assertIn("advising on Clery Act and Title IX", cleaned)
        
        # Verify boilerplate disclaimers are removed
        self.assertNotIn("Equal Opportunity Employer", cleaned)
        self.assertNotIn("without regard to race", cleaned)
        self.assertNotIn("Disability Services", cleaned)
        self.assertNotIn("contingent upon a satisfactory criminal background check", cleaned)

    def test_is_duplicate(self):
        """Test duplicate URL detection across staging and main tables."""
        url_staging = "https://www.higheredjobs.com/admin/details.cfm?JobCode=1111"
        url_main = "https://careercenter.nacua.org/job/associate-attorney-2222"
        url_new = "https://careercenter.nacua.org/job/assistant-general-counsel-3333"

        with get_db_connection(TEST_DB_PATH) as conn:
            # Insert into staging
            insert_staging_posting(
                conn,
                institution_name_raw="Staging Univ",
                raw_scraped_text="Some text",
                source_url=url_staging,
                job_board_source="HigherEdJobs"
            )
            
            # Insert into main postings (requires an institution first)
            inst_id = insert_institution(
                conn, 
                name="Main Univ", 
                funding_type="Public", 
                state_location="NC", 
                city_location="Greenville"
            )
            insert_job_posting(
                conn,
                institution_id=inst_id,
                job_title="Associate Attorney",
                JD_required=1,
                standardized_level="Associate General Counsel",
                is_commensurate_with_experience=1,
                job_board_source="NACUA",
                source_url=url_main,
                post_date="2026-06-22"
            )
            
            # Run checks
            self.assertTrue(is_duplicate(conn, url_staging))
            self.assertTrue(is_duplicate(conn, url_main))
            self.assertFalse(is_duplicate(conn, url_new))

    @patch('requests.post')
    def test_fetch_higheredjobs_list(self, mock_post):
        """Test HigherEdJobs API list fetching with mock response."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "success": 1,
            "data": {
                "ARYSEARCHJOBS": [
                    {
                        "JobCode": 12345,
                        "JobTitle": "Assistant General Counsel",
                        "InstName": "State University",
                        "Salary": "$120,000",
                        "DatePosted": "2026-06-20T00:00:00Z"
                    }
                ]
            }
        }
        mock_post.return_value = mock_response

        jobs = fetch_higheredjobs_list()
        self.assertEqual(len(jobs), 1)
        self.assertEqual(jobs[0]["JobCode"], 12345)
        self.assertEqual(jobs[0]["JobTitle"], "Assistant General Counsel")

    @patch('requests.get')
    def test_fetch_higheredjobs_detail(self, mock_get):
        """Test HigherEdJobs details page HTML retrieval."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = '<html><body><div id="jobDesc">Clean job description text.</div></body></html>'
        mock_get.return_value = mock_response

        html = fetch_higheredjobs_detail(12345)
        self.assertIn('id="jobDesc"', html)
        self.assertIn("Clean job description text.", html)

    @patch('requests.get')
    def test_fetch_nacua_list(self, mock_get):
        """Test NACUA list retrieval with mock API response."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "data": [
                {
                    "id": 999,
                    "title": "Deputy General Counsel",
                    "url": "https://careercenter.nacua.org/job/deputy-gc-999",
                    "company": {"name": "College of Law"}
                }
            ]
        }
        mock_get.return_value = mock_response

        jobs = fetch_nacua_list(page=1)
        self.assertEqual(len(jobs), 1)
        self.assertEqual(jobs[0]["id"], 999)
        self.assertEqual(jobs[0]["title"], "Deputy General Counsel")

    @patch('requests.get')
    def test_fetch_nacua_detail(self, mock_get):
        """Test NACUA details API response mapping."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "data": {
                "description": "<p>Detailed description text from NACUA.</p>"
            }
        }
        mock_get.return_value = mock_response

        html = fetch_nacua_detail(999)
        self.assertEqual(html, "<p>Detailed description text from NACUA.</p>")

    @patch('src.scraper.fetch_higheredjobs_list')
    @patch('src.scraper.fetch_higheredjobs_detail')
    @patch('src.scraper.fetch_nacua_list')
    @patch('src.scraper.fetch_nacua_detail')
    def test_run_scraper_integration(self, mock_nacua_detail, mock_nacua_list, mock_hej_detail, mock_hej_list):
        """Verify the main orchestration loop processes list fetching, scraping, cleaning and database staging insertion."""
        # Setup mock returns
        mock_hej_list.return_value = [
            {
                "JobCode": 101,
                "JobTitle": "General Counsel",
                "InstName": "HEJ University"
            }
        ]
        mock_hej_detail.return_value = '<div id="jobDesc"><p>HEJ Job Details.</p><p>We are EEO.</p></div>'

        mock_nacua_list.return_value = [
            {
                "id": 202,
                "title": "Assistant GC",
                "url": "https://careercenter.nacua.org/job/assistant-gc-202",
                "company": {"name": "NACUA University"}
            }
        ]
        mock_nacua_detail.return_value = '<p>NACUA Job Details.</p><p>Equal Opportunity Employer.</p>'

        # Run scraper
        stats = run_scraper(db_path=TEST_DB_PATH, max_pages=1)

        # Check returned stats
        self.assertEqual(stats["HigherEdJobs"], 1)
        self.assertEqual(stats["NACUA"], 1)
        self.assertEqual(stats["Duplicates"], 0)
        self.assertEqual(stats["Errors"], 0)

        # Check database records
        with get_db_connection(TEST_DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM job_postings_staging")
            rows = cursor.fetchall()
            self.assertEqual(len(rows), 2)
            
            # Map by source
            sources = {r["job_board_source"]: r for r in rows}
            self.assertIn("HigherEdJobs", sources)
            self.assertIn("NACUA", sources)
            
            # Verify EEO text was filtered out of staging
            self.assertNotIn("We are EEO", sources["HigherEdJobs"]["raw_scraped_text"])
            self.assertNotIn("Equal Opportunity Employer", sources["NACUA"]["raw_scraped_text"])

if __name__ == "__main__":
    unittest.main()
