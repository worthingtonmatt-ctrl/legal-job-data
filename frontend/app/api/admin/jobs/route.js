import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import crypto from 'crypto';

function checkAuth(request) {
  const authHeader = request.headers.get('X-Admin-Password');
  const expectedPassword = process.env.ADMIN_PASSWORD || 'legaljobs2026';
  return authHeader === expectedPassword;
}

export async function GET(request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const needingAttention = searchParams.get('needing_attention') === 'true';
    const id = searchParams.get('id');

    const database = getDatabase();

    if (id) {
      const stmt = database.prepare(`
        SELECT jp.*, inst.name AS inst_name, inst.state_location, inst.city_location
        FROM job_postings jp
        JOIN institutions inst ON jp.institution_id = inst.id
        WHERE jp.id = $id
      `);
      const row = stmt.get({ '$id': id });
      database.close();
      if (!row) {
        return NextResponse.json({ success: false, error: 'Job posting not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: row });
    }

    let queryStr = `
      SELECT jp.id, jp.job_title, jp.standardized_level, jp.reports_to,
             jp.JD_required, jp.salary_min, jp.salary_max, jp.is_commensurate_with_experience,
             jp.min_years, jp.pref_years, jp.job_board_source, jp.source_url, jp.post_date,
             jp.institution_id, inst.name AS inst_name, inst.state_location, inst.city_location
      FROM job_postings jp
      JOIN institutions inst ON jp.institution_id = inst.id
      WHERE 1=1
    `;

    const params = {};

    if (needingAttention) {
      queryStr += ` AND (jp.salary_min IS NULL AND jp.is_commensurate_with_experience = 0 OR jp.min_years IS NULL)`;
    }

    if (search.trim()) {
      queryStr += ` AND (jp.job_title LIKE $search OR inst.name LIKE $search OR jp.id LIKE $search)`;
      params['$search'] = `%${search.trim()}%`;
    }

    queryStr += ` ORDER BY jp.post_date DESC, jp.id DESC`;

    const stmt = database.prepare(queryStr);
    const rows = stmt.all(params);
    database.close();

    const formattedRows = rows.map(row => ({
      ...row,
      salary_min: row.salary_min !== null ? parseFloat(row.salary_min) : null,
      salary_max: row.salary_max !== null ? parseFloat(row.salary_max) : null,
      min_years: row.min_years !== null ? parseInt(row.min_years) : null,
      pref_years: row.pref_years !== null ? parseInt(row.pref_years) : null,
    }));

    return NextResponse.json({ success: true, data: formattedRows });
  } catch (error) {
    console.error('Error fetching jobs in admin API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      id,
      institution_id,
      job_title,
      JD_required,
      standardized_level,
      reports_to,
      salary_min,
      salary_max,
      is_commensurate_with_experience,
      min_years,
      pref_years,
      job_board_source,
      source_url,
      post_date
    } = body;

    if (!id || !institution_id || !job_title || !standardized_level || !job_board_source || !source_url || !post_date) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const validLevels = [
      'General Counsel',
      'Deputy General Counsel',
      'Associate General Counsel',
      'Assistant General Counsel',
      'Legal Counsel/Staff Attorney',
      'Title IX',
      'Intern',
      'Paralegal'
    ];

    if (!validLevels.includes(standardized_level)) {
      return NextResponse.json({ success: false, error: `Invalid standardized_level: ${standardized_level}` }, { status: 400 });
    }

    const database = getDatabase();

    const stmt = database.prepare(`
      UPDATE job_postings
      SET institution_id = $institution_id,
          job_title = $job_title,
          JD_required = $JD_required,
          standardized_level = $standardized_level,
          reports_to = $reports_to,
          salary_min = $salary_min,
          salary_max = $salary_max,
          is_commensurate_with_experience = $is_commensurate_with_experience,
          min_years = $min_years,
          pref_years = $pref_years,
          job_board_source = $job_board_source,
          source_url = $source_url,
          post_date = $post_date
      WHERE id = $id
    `);

    stmt.run({
      '$id': id,
      '$institution_id': institution_id,
      '$job_title': job_title,
      '$JD_required': JD_required ? 1 : 0,
      '$standardized_level': standardized_level,
      '$reports_to': reports_to || null,
      '$salary_min': salary_min !== '' && salary_min !== null && !isNaN(parseFloat(salary_min)) ? parseFloat(salary_min) : null,
      '$salary_max': salary_max !== '' && salary_max !== null && !isNaN(parseFloat(salary_max)) ? parseFloat(salary_max) : null,
      '$is_commensurate_with_experience': is_commensurate_with_experience ? 1 : 0,
      '$min_years': min_years !== '' && min_years !== null && !isNaN(parseInt(min_years)) ? parseInt(min_years) : null,
      '$pref_years': pref_years !== '' && pref_years !== null && !isNaN(parseInt(pref_years)) ? parseInt(pref_years) : null,
      '$job_board_source': job_board_source,
      '$source_url': source_url,
      '$post_date': post_date
    });

    database.close();

    return NextResponse.json({ success: true, message: 'Job posting updated successfully' });
  } catch (error) {
    console.error('Error updating job posting:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      institution_id,
      job_title,
      JD_required,
      standardized_level,
      reports_to,
      salary_min,
      salary_max,
      is_commensurate_with_experience,
      min_years,
      pref_years,
      job_board_source,
      source_url,
      post_date
    } = body;

    if (!institution_id || !job_title || !standardized_level || !job_board_source || !source_url || !post_date) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const newId = crypto.randomUUID();
    const database = getDatabase();

    const stmt = database.prepare(`
      INSERT INTO job_postings (
        id, institution_id, job_title, JD_required, standardized_level, reports_to,
        salary_min, salary_max, is_commensurate_with_experience, min_years, pref_years,
        job_board_source, source_url, post_date
      ) VALUES (
        $id, $institution_id, $job_title, $JD_required, $standardized_level, $reports_to,
        $salary_min, $salary_max, $is_commensurate_with_experience, $min_years, $pref_years,
        $job_board_source, $source_url, $post_date
      )
    `);

    stmt.run({
      '$id': newId,
      '$institution_id': institution_id,
      '$job_title': job_title,
      '$JD_required': JD_required ? 1 : 0,
      '$standardized_level': standardized_level,
      '$reports_to': reports_to || null,
      '$salary_min': salary_min !== '' && salary_min !== null && !isNaN(parseFloat(salary_min)) ? parseFloat(salary_min) : null,
      '$salary_max': salary_max !== '' && salary_max !== null && !isNaN(parseFloat(salary_max)) ? parseFloat(salary_max) : null,
      '$is_commensurate_with_experience': is_commensurate_with_experience ? 1 : 0,
      '$min_years': min_years !== '' && min_years !== null && !isNaN(parseInt(min_years)) ? parseInt(min_years) : null,
      '$pref_years': pref_years !== '' && pref_years !== null && !isNaN(parseInt(pref_years)) ? parseInt(pref_years) : null,
      '$job_board_source': job_board_source,
      '$source_url': source_url,
      '$post_date': post_date
    });

    database.close();

    return NextResponse.json({ success: true, message: 'Job posting created successfully', id: newId });
  } catch (error) {
    console.error('Error creating job posting:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Job posting ID required' }, { status: 400 });
    }

    const database = getDatabase();

    const stmt = database.prepare('DELETE FROM job_postings WHERE id = $id');
    stmt.run({ '$id': id });
    database.close();

    return NextResponse.json({ success: true, message: 'Job posting deleted successfully' });
  } catch (error) {
    console.error('Error deleting job posting:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
