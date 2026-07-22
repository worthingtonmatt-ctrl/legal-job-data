import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

export function getDatabase() {
  const localDb = path.resolve(process.cwd(), 'university_legal_tracker.db');
  const parentDb = path.resolve(process.cwd(), '../university_legal_tracker.db');
  
  const dbPath = fs.existsSync(localDb) ? localDb : parentDb;
  return new DatabaseSync(dbPath);
}
