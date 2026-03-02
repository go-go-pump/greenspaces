/**
 * Testing Platform — Seed Script Template
 *
 * Copy as `test/seeds/seed-step-<N>.mjs` and customize.
 * Seeds the database to the state AFTER step N completes.
 *
 * Usage: node test/seeds/seed-step-1.mjs
 */

import Database from 'better-sqlite3';

const DB_PATH = process.env.DB_PATH || './data/app.sqlite';
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');

// ─── Step 1: Create Test User ───────────────────────────────────────────────
db.prepare(`
  INSERT OR REPLACE INTO users (id, email, name, created_at, is_test)
  VALUES ('test-user-001', 'test@example.com', 'Test User', datetime('now'), 1)
`).run();

// ─── Step 2: Create Test Configuration (uncomment for step 2+) ─────────────
// db.prepare(`
//   INSERT OR REPLACE INTO configurations (id, user_id, name, status, is_test)
//   VALUES ('test-config-001', 'test-user-001', 'Test Config', 'configured', 1)
// `).run();

// ─── Step 3: Create Test Execution (uncomment for step 3+) ─────────────────
// db.prepare(`
//   INSERT OR REPLACE INTO executions (id, config_id, status, completed_at, is_test)
//   VALUES ('test-exec-001', 'test-config-001', 'completed', datetime('now'), 1)
// `).run();

// ─── Step 4: Create Test Metrics (uncomment for step 4+) ───────────────────
// db.prepare(`
//   INSERT OR REPLACE INTO metrics (id, execution_id, metric_name, metric_value, is_test)
//   VALUES ('test-metric-001', 'test-exec-001', 'success_rate', 95.5, 1)
// `).run();

console.log('✅ Seeded to Step 1: User created');
db.close();
