import os
import unittest
import sqlite3
from src.db import (
    init_db,
    get_db_connection,
    insert_institution,
    insert_staging_posting,
    update_staging_status,
    insert_job_posting
)

TEST_DB_PATH = "test_tracker.db"

class TestDatabaseSchema(unittest.TestCase):

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

    def test_database_initialization(self):
        """Verify tables are created and column definitions match expected names."""
        with get_db_connection(TEST_DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = [row[0] for row in cursor.fetchall()]
            self.assertIn("institutions", tables)
            self.assertIn("job_postings_staging", tables)
            self.assertIn("job_postings", tables)

            cursor.execute("SELECT name FROM sqlite_master WHERE type='index';")
            indexes = [row[0] for row in cursor.fetchall()]
            self.assertIn("idx_job_postings_level_date", indexes)
            self.assertIn("idx_institutions_state", indexes)

    def test_institutions_constraints(self):
        """Test CHECK constraints on institutions table."""
        # 1. Invalid funding type
        with self.assertRaises(sqlite3.IntegrityError):
            with get_db_connection(TEST_DB_PATH) as conn:
                insert_institution(
                    conn,
                    name="Test Univ 1",
                    state_location="CO",
                    city_location="Denver",
                    funding_type="Invalid Funding Type"  # CHECK failure
                )

        # 2. Invalid state location length (not length 2)
        with self.assertRaises(sqlite3.IntegrityError):
            with get_db_connection(TEST_DB_PATH) as conn:
                insert_institution(
                    conn,
                    name="Test Univ 2",
                    state_location="COL",  # CHECK length = 2 failure
                    city_location="Denver",
                    funding_type="Public"
                )

        # 3. Invalid estimated enrollment (negative)
        with self.assertRaises(sqlite3.IntegrityError):
            with get_db_connection(TEST_DB_PATH) as conn:
                insert_institution(
                    conn,
                    name="Test Univ 3",
                    state_location="CO",
                    city_location="Denver",
                    funding_type="Public",
                    estimated_enrollment=-10  # CHECK >= 0 failure
                )

        # 4. Valid insertion (with funding_type and enrollment)
        with get_db_connection(TEST_DB_PATH) as conn:
            inst_id = insert_institution(
                conn,
                name="University of Colorado",
                state_location="CO",
                city_location="Boulder",
                funding_type="Public",
                estimated_enrollment=35000
            )
            self.assertIsNotNone(inst_id)

        # 5. Valid insertion with optional/null funding_type and enrollment
        with get_db_connection(TEST_DB_PATH) as conn:
            inst_id_opt = insert_institution(
                conn,
                name="Colorado State University",
                state_location="CO",
                city_location="Fort Collins",
                funding_type=None,
                estimated_enrollment=None
            )
            self.assertIsNotNone(inst_id_opt)

        # 6. Unique name constraint violation
        with self.assertRaises(sqlite3.IntegrityError):
            with get_db_connection(TEST_DB_PATH) as conn:
                insert_institution(
                    conn,
                    name="University of Colorado",  # Duplicate name
                    state_location="CO",
                    city_location="Denver",
                    funding_type="Private Non-Profit"
                )

    def test_staging_constraints(self):
        """Test CHECK constraints on job_postings_staging table."""
        # 1. Invalid status
        with self.assertRaises(sqlite3.IntegrityError):
            with get_db_connection(TEST_DB_PATH) as conn:
                insert_staging_posting(
                    conn,
                    institution_name_raw="Raw Univ",
                    raw_scraped_text="Raw Description",
                    source_url="http://example.com/job",
                    job_board_source="NACUA",
                    status="Processing"  # CHECK status failure
                )

        # 2. Valid insertion and update status
        with get_db_connection(TEST_DB_PATH) as conn:
            staging_id = insert_staging_posting(
                conn,
                institution_name_raw="Raw Univ",
                raw_scraped_text="Raw Description",
                source_url="http://example.com/job",
                job_board_source="NACUA",
                status="Pending"
            )
            self.assertIsNotNone(staging_id)
            
            update_staging_status(conn, staging_id, "Processed")
            
            cursor = conn.cursor()
            cursor.execute("SELECT status FROM job_postings_staging WHERE id = ?", (staging_id,))
            self.assertEqual(cursor.fetchone()[0], "Processed")

    def test_job_postings_constraints_and_fk(self):
        """Test job_postings validation, foreign keys, unique constraint, and new experience fields."""
        # First insert a valid institution
        with get_db_connection(TEST_DB_PATH) as conn:
            inst_id = insert_institution(
                conn,
                name="Denver University",
                state_location="CO",
                city_location="Denver",
                funding_type="Private Non-Profit"
            )

        # 1. Foreign Key violation (non-existent institution_id)
        with self.assertRaises(sqlite3.IntegrityError):
            with get_db_connection(TEST_DB_PATH) as conn:
                insert_job_posting(
                    conn,
                    institution_id="non-existent-uuid",  # FK failure
                    job_title="General Counsel",
                    JD_required=1,
                    standardized_level="General Counsel",
                    is_commensurate_with_experience=1,
                    job_board_source="NACUA",
                    source_url="http://example.com",
                    post_date="2026-06-22"
                )

        # 2. Invalid JD_required (not 0 or 1)
        with self.assertRaises(sqlite3.IntegrityError):
            with get_db_connection(TEST_DB_PATH) as conn:
                insert_job_posting(
                    conn,
                    institution_id=inst_id,
                    job_title="General Counsel",
                    JD_required=2,  # CHECK failure
                    standardized_level="General Counsel",
                    is_commensurate_with_experience=1,
                    job_board_source="NACUA",
                    source_url="http://example.com",
                    post_date="2026-06-22"
                )

        # 3. Invalid standardized_level
        with self.assertRaises(sqlite3.IntegrityError):
            with get_db_connection(TEST_DB_PATH) as conn:
                insert_job_posting(
                    conn,
                    institution_id=inst_id,
                    job_title="General Counsel",
                    JD_required=1,
                    standardized_level="Super Lawyer",  # CHECK failure
                    is_commensurate_with_experience=1,
                    job_board_source="NACUA",
                    source_url="http://example.com",
                    post_date="2026-06-22"
                )

        # 4. Invalid post_date format (must be YYYY-MM-DD)
        with self.assertRaises(sqlite3.IntegrityError):
            with get_db_connection(TEST_DB_PATH) as conn:
                insert_job_posting(
                    conn,
                    institution_id=inst_id,
                    job_title="General Counsel",
                    JD_required=1,
                    standardized_level="General Counsel",
                    is_commensurate_with_experience=1,
                    job_board_source="NACUA",
                    source_url="http://example.com",
                    post_date="June 22 2026"  # CHECK failure
                )

        # 5. Invalid min_years (negative)
        with self.assertRaises(sqlite3.IntegrityError):
            with get_db_connection(TEST_DB_PATH) as conn:
                insert_job_posting(
                    conn,
                    institution_id=inst_id,
                    job_title="General Counsel",
                    JD_required=1,
                    standardized_level="General Counsel",
                    is_commensurate_with_experience=1,
                    min_years=-1,  # CHECK failure
                    job_board_source="NACUA",
                    source_url="http://example.com",
                    post_date="2026-06-22"
                )

        # 6. Invalid pref_years (negative)
        with self.assertRaises(sqlite3.IntegrityError):
            with get_db_connection(TEST_DB_PATH) as conn:
                insert_job_posting(
                    conn,
                    institution_id=inst_id,
                    job_title="General Counsel",
                    JD_required=1,
                    standardized_level="General Counsel",
                    is_commensurate_with_experience=1,
                    pref_years=-2,  # CHECK failure
                    job_board_source="NACUA",
                    source_url="http://example.com",
                    post_date="2026-06-22"
                )

        # 7. Valid insertion with min_years and pref_years
        with get_db_connection(TEST_DB_PATH) as conn:
            posting_id = insert_job_posting(
                conn,
                institution_id=inst_id,
                job_title="General Counsel",
                JD_required=1,
                standardized_level="General Counsel",
                is_commensurate_with_experience=1,
                min_years=3,
                pref_years=5,
                job_board_source="NACUA",
                source_url="http://example.com",
                post_date="2026-06-22",
                salary_min=150000.0,
                salary_max=200000.0
            )
            self.assertIsNotNone(posting_id)

        # 8. Unique constraint violation (duplicate institution_id + job_title + post_date)
        with self.assertRaises(sqlite3.IntegrityError):
            with get_db_connection(TEST_DB_PATH) as conn:
                insert_job_posting(
                    conn,
                    institution_id=inst_id,
                    job_title="General Counsel",  # Duplicate title
                    JD_required=1,
                    standardized_level="General Counsel",
                    is_commensurate_with_experience=1,
                    job_board_source="NACUA",
                    source_url="http://example.com/other",
                    post_date="2026-06-22"  # Duplicate date
                )

    def test_foreign_key_on_delete_cascade(self):
        """Test that deleting an institution cascades and deletes associated job postings."""
        with get_db_connection(TEST_DB_PATH) as conn:
            inst_id = insert_institution(
                conn,
                name="Cascading University",
                state_location="CO",
                city_location="Denver",
                funding_type="Public"
            )
            posting_id = insert_job_posting(
                conn,
                institution_id=inst_id,
                job_title="Assistant General Counsel",
                JD_required=1,
                standardized_level="Assistant General Counsel",
                is_commensurate_with_experience=1,
                job_board_source="NACUA",
                source_url="http://example.com",
                post_date="2026-06-22"
            )
            
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM job_postings WHERE id = ?", (posting_id,))
            self.assertEqual(cursor.fetchone()[0], 1)

            conn.execute("DELETE FROM institutions WHERE id = ?", (inst_id,))
            
            cursor.execute("SELECT COUNT(*) FROM job_postings WHERE id = ?", (posting_id,))
            self.assertEqual(cursor.fetchone()[0], 0)

if __name__ == "__main__":
    unittest.main()
