import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const jsonPath = path.resolve(process.cwd(), 'app/api/regression/model.json');
    const data = await fs.readFile(jsonPath, 'utf-8');
    const modelData = JSON.parse(data);
    return NextResponse.json({ success: true, model: modelData });
  } catch (error) {
    console.error('Error loading regression model.json:', error);
    return NextResponse.json(
      { success: false, error: 'Regression model data not found or failed to parse.' },
      { status: 404 }
    );
  }
}
