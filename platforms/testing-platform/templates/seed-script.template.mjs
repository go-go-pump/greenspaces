/**
 * Testing Platform — Seed Script Template
 *
 * Copy this file for each journey step:
 *   seeds/step-1-signup.mjs
 *   seeds/step-2-configure.mjs
 *   seeds/step-3-action.mjs
 *   etc.
 *
 * Each seed is CUMULATIVE — step 3 includes all data from steps 1 and 2.
 * Each seed is IDEMPOTENT — safe to run multiple times.
 */

import Database from 'better-sqlite3';

// ─── Test Constants ─────────────────────────────────────────────
const TEST_USER = {
  email: 'test-user@testing.local',
  name: 'Test User',
};

const FIXED_TIMESTAMP = '2026-01-01T00:00:00Z';

// ─── Seed Function ──────────────────────────────────────────────
export default async function seed(dbPath) {
  const db = new Database(dbPath);

  try {
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Always reset test data first (idempotency)
    // Order: children before parents (respect FK constraints)
    // db.prepare('DELETE FROM child_table WHERE is_test = 1').run();
    db.prepare('DELETE FROM users WHERE is_test = 1').run();

    // ─── Step 1: Create test user ─────────────────────────────
    db.prepare(`
      INSERT INTO users (email, name, is_test, created_at)
      VALUES (?, ?, 1, ?)
    `).run(TEST_USER.email, TEST_USER.name, FIXED_TIMESTAMP);

    const userId = db.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).get(TEST_USER.email).id;

    // ─── Step 2: Add more data here ───────────────────────────
    // Uncomment and customize for your step:
    //
    // db.prepare(`
    //   INSERT INTO campaigns (name, user_id, status, is_test, created_at)
    //   VALUES (?, ?, 'draft', 1, ?)
    // `).run('Test Campaign', userId, FIXED_TIMESTAMP);

    db.close();
    return { userId, step: 1 };
  } catch (err) {
    db.close();
    throw err;
  }
}

// ─── CLI Support ────────────────────────────────────────────────
// Run directly: node seeds/step-1-signup.mjs ./data/app.db
const dbPath = process.argv[2];
if (dbPath) {
  seed(dbPath)
    .then((result) => console.log('Seeded:', result))
    .catch((err) => { console.error('Seed failed:', err); process.exit(1); });
}
