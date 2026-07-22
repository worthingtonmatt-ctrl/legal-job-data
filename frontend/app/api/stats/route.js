import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const include_non_jd = searchParams.get('include_non_jd') === 'true';

    const database = getDatabase();

    // Query 1: Aggregate stats by standardized level
    const statsQuery = `
      SELECT 
        standardized_level,
        AVG(salary_min) AS avg_salary_min,
        AVG(salary_max) AS avg_salary_max,
        AVG(
          CASE 
            WHEN salary_min IS NOT NULL AND salary_max IS NOT NULL THEN (salary_min + salary_max) / 2.0 
            WHEN salary_min IS NOT NULL THEN salary_min 
            WHEN salary_max IS NOT NULL THEN salary_max 
            ELSE NULL 
          END
        ) AS avg_salary_mid,
        AVG(min_years) AS avg_min_years,
        AVG(pref_years) AS avg_pref_years,
        COUNT(*) AS total_postings,
        SUM(CASE WHEN salary_min IS NOT NULL OR salary_max IS NOT NULL THEN 1 ELSE 0 END) AS postings_with_salary
      FROM job_postings
      WHERE 1=1 ${include_non_jd ? '' : 'AND JD_required = 1'}
      GROUP BY standardized_level
      ORDER BY 
        CASE standardized_level
          WHEN 'General Counsel' THEN 1
          WHEN 'Deputy General Counsel' THEN 2
          WHEN 'Associate General Counsel' THEN 3
          WHEN 'Assistant General Counsel' THEN 4
          WHEN 'Legal Counsel/Staff Attorney' THEN 5
          WHEN 'Title IX' THEN 6
          WHEN 'Paralegal' THEN 7
          WHEN 'Intern' THEN 8
          ELSE 9
        END
    `;

    // Query 2: Distinct states for filtering dropdown
    const statesQuery = `
      SELECT DISTINCT state_location 
      FROM institutions 
      WHERE state_location IS NOT NULL AND state_location != ''
      ORDER BY state_location
    `;

    const statsStmt = database.prepare(statsQuery);
    const statsRows = statsStmt.all();

    const statesStmt = database.prepare(statesQuery);
    const statesRows = statesStmt.all();

    database.close();

    // Map float nulls and format values properly
    const formattedStats = statsRows.map(row => ({
      standardized_level: row.standardized_level,
      avg_salary_min: row.avg_salary_min !== null ? Math.round(parseFloat(row.avg_salary_min)) : null,
      avg_salary_max: row.avg_salary_max !== null ? Math.round(parseFloat(row.avg_salary_max)) : null,
      avg_salary_mid: row.avg_salary_mid !== null ? Math.round(parseFloat(row.avg_salary_mid)) : null,
      avg_min_years: row.avg_min_years !== null ? Math.round(parseFloat(row.avg_min_years) * 10) / 10 : null,
      avg_pref_years: row.avg_pref_years !== null ? Math.round(parseFloat(row.avg_pref_years) * 10) / 10 : null,
      total_postings: parseInt(row.total_postings),
      postings_with_salary: parseInt(row.postings_with_salary)
    }));

    const states = statesRows.map(row => row.state_location);

    return NextResponse.json({
      success: true,
      data: {
        stats: formattedStats,
        states: states
      }
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
