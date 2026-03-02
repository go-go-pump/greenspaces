/**
 * YOMO Seed — Reset All Test Data
 * Deletes all is_test=1 rows in FK-safe order (children first).
 */
import Database from 'better-sqlite3';

const TABLES = ['bookings', 'experiences', 'campaigns', 'users'];

export default async function reset(dbPath) {
  const db = new Database(dbPath);
  db.pragma('foreign_keys = OFF'); // Disable FK checks during bulk delete

  let total = 0;
  for (const table of TABLES) {
    const result = db.prepare(`DELETE FROM ${table} WHERE is_test = 1`).run();
    total += result.changes;
  }

  db.pragma('foreign_keys = ON');
  db.close();
  return { deleted: total, tables: TABLES };
}

// CLI support
const dbPath = process.argv[2];
if (dbPath) {
  reset(dbPath)
    .then(r => console.log('Reset:', r))
    .catch(e => { console.error(e); process.exit(1); });
}
