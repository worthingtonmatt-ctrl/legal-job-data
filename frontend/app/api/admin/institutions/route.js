import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

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
    const database = getDatabase();

    const queryStr = `
      SELECT id, name, state_location, city_location
      FROM institutions
      ORDER BY name ASC
    `;
    const stmt = database.prepare(queryStr);
    const rows = stmt.all();
    database.close();

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching institutions:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
