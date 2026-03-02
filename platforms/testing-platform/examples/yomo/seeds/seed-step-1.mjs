/**
 * YOMO Example — Seed Step 1: Campaign Created
 *
 * Creates a test campaign with keyword targets.
 * Usage: node examples/yomo/seeds/seed-step-1.mjs
 */

import Database from 'better-sqlite3';

const DB_PATH = process.env.DB_PATH || './data/yomo.sqlite';
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Test user
db.prepare(`
  INSERT OR REPLACE INTO users (id, email, name, is_test)
  VALUES ('test-user-001', 'founder@yomo.test', 'Test Founder', 1)
`).run();

// Test campaign
db.prepare(`
  INSERT OR REPLACE INTO campaigns (id, user_id, name, topic, status, created_at, is_test)
  VALUES ('test-campaign-001', 'test-user-001', 'YOMO Launch Campaign', 'unique local experiences', 'created', datetime('now'), 1)
`).run();

// Keyword targets
db.prepare(`
  INSERT OR REPLACE INTO keyword_targets (id, campaign_id, keyword, volume, is_test)
  VALUES ('test-kw-001', 'test-campaign-001', 'local experiences near me', 12000, 1)
`).run();

console.log('✅ YOMO Seeded to Step 1: Campaign created');
db.close();
