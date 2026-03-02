/**
 * YOMO Example — Seed Step 3: Video Rendered
 *
 * Seeds through campaign creation, asset generation, and video render.
 * Usage: node examples/yomo/seeds/seed-step-3.mjs
 */

import Database from 'better-sqlite3';

const DB_PATH = process.env.DB_PATH || './data/yomo.sqlite';
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Step 1: User + Campaign
db.prepare(`INSERT OR REPLACE INTO users (id, email, name, is_test) VALUES ('test-user-001', 'founder@yomo.test', 'Test Founder', 1)`).run();
db.prepare(`INSERT OR REPLACE INTO campaigns (id, user_id, name, topic, status, created_at, is_test) VALUES ('test-campaign-001', 'test-user-001', 'YOMO Launch Campaign', 'unique local experiences', 'rendered', datetime('now'), 1)`).run();
db.prepare(`INSERT OR REPLACE INTO keyword_targets (id, campaign_id, keyword, volume, is_test) VALUES ('test-kw-001', 'test-campaign-001', 'local experiences near me', 12000, 1)`).run();

// Step 2: Assets
db.prepare(`INSERT OR REPLACE INTO scripts (id, campaign_id, content, is_test) VALUES ('test-script-001', 'test-campaign-001', 'Discover unique local experiences that transform ordinary weekends into unforgettable adventures...', 1)`).run();
db.prepare(`INSERT OR REPLACE INTO assets (id, campaign_id, type, path, is_test) VALUES ('test-asset-001', 'test-campaign-001', 'slides', './test/output/slides/', 1)`).run();
db.prepare(`INSERT OR REPLACE INTO assets (id, campaign_id, type, path, is_test) VALUES ('test-asset-002', 'test-campaign-001', 'voiceover', './test/output/voiceover.mp3', 1)`).run();

// Step 3: Rendered video
db.prepare(`INSERT OR REPLACE INTO renders (id, campaign_id, mp4_path, thumbnail_path, duration_sec, rendered_at, is_test) VALUES ('test-render-001', 'test-campaign-001', './test/output/yomo-launch.mp4', './test/output/yomo-launch-thumb.jpg', 18, datetime('now'), 1)`).run();

console.log('✅ YOMO Seeded to Step 3: Video rendered');
db.close();
