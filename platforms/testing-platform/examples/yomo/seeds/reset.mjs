/**
 * YOMO Example — Reset All Test Data
 *
 * Usage: node examples/yomo/seeds/reset.mjs
 */

import Database from 'better-sqlite3';

const DB_PATH = process.env.DB_PATH || './data/yomo.sqlite';
const db = new Database(DB_PATH);

const tables = ['analytics', 'renders', 'assets', 'scripts', 'keyword_targets', 'campaigns', 'users'];

for (const table of tables) {
  try {
    const result = db.prepare(`DELETE FROM ${table} WHERE is_test = 1`).run();
    console.log(`🗑️  ${table}: ${result.changes} rows removed`);
  } catch (e) {
    // Table may not exist yet — that's fine
  }
}

console.log('✅ YOMO test data reset');
db.close();
