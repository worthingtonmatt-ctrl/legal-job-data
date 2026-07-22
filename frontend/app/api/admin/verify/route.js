import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { password } = body;
    const adminPassword = process.env.ADMIN_PASSWORD || 'legaljobs2026';

    if (password === adminPassword) {
      return NextResponse.json({ success: true, message: 'Authenticated successfully' });
    } else {
      return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
