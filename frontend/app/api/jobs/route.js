import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level');
    const state = searchParams.get('state');
    const min_experience = searchParams.get('min_experience');
    const sort_by = searchParams.get('sort_by') || 'post_date';
    const sort_order = searchParams.get('sort_order') || 'desc';
    const include_non_jd = searchParams.get('include_non_jd') === 'true';

    const database = getDatabase();

    let queryStr = `
      SELECT jp.id, jp.job_title, jp.standardized_level, jp.reports_to, jp.JD_required,
             jp.salary_min, jp.salary_max, jp.is_commensurate_with_experience,
             jp.min_years, jp.pref_years, jp.job_board_source, jp.source_url, jp.post_date,
             inst.name AS inst_name, inst.state_location, inst.city_location
      FROM job_postings jp
      JOIN institutions inst ON jp.institution_id = inst.id
      WHERE 1=1
    `;

    if (!include_non_jd) {
      queryStr += ` AND jp.JD_required = 1`;
    }

    const params = {};

    if (state && state.trim() && state !== 'All') {
      queryStr += ` AND inst.state_location = $state`;
      params['$state'] = state.trim().toUpperCase();
    }

    if (min_experience && !isNaN(parseInt(min_experience))) {
      queryStr += ` AND (jp.min_years IS NULL OR jp.min_years <= $min_experience)`;
      params['$min_experience'] = parseInt(min_experience);
    }

    if (level && level.trim() && level !== 'All') {
      const levelsList = level.split(',').map(l => l.trim()).filter(Boolean);
      if (levelsList.length > 0) {
        queryStr += ` AND jp.standardized_level IN (${levelsList.map((_, i) => `$level_${i}`).join(', ')})`;
        levelsList.forEach((l, i) => {
          params[`$level_${i}`] = l;
        });
      }
    }

    // Safety checks for sorting options to avoid SQL injection
    const allowedSortBy = ['post_date', 'salary_min', 'min_years', 'job_title'];
    const allowedSortOrder = ['asc', 'desc'];
    
    const validSortBy = allowedSortBy.includes(sort_by) ? sort_by : 'post_date';
    const validSortOrder = allowedSortOrder.includes(sort_order.toLowerCase()) ? sort_order.toLowerCase() : 'desc';

    queryStr += ` ORDER BY jp.${validSortBy} ${validSortOrder}`;

    const stmt = database.prepare(queryStr);
    const rows = stmt.all(params);
    database.close();

    // Map float nulls and format response
    const formattedRows = rows.map(row => ({
      ...row,
      JD_required: row.JD_required !== null ? parseInt(row.JD_required) : 1,
      salary_min: row.salary_min !== null ? parseFloat(row.salary_min) : null,
      salary_max: row.salary_max !== null ? parseFloat(row.salary_max) : null,
      min_years: row.min_years !== null ? parseInt(row.min_years) : null,
      pref_years: row.pref_years !== null ? parseInt(row.pref_years) : null,
    }));

    return NextResponse.json({ success: true, data: formattedRows });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
