/**
 * YOMO Seed — Step 1: Create Campaign
 * Creates test admin user and a draft campaign.
 */
import Database from 'better-sqlite3';

const ADMIN = { email: 'test-admin@testing.local', name: 'Test Admin', role: 'admin' };
const TS = '2026-01-01T00:00:00Z';

export default async function seed(dbPath) {
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');

  // Reset
  db.prepare('DELETE FROM campaigns WHERE is_test = 1').run();
  db.prepare('DELETE FROM users WHERE is_test = 1').run();

  // Admin user
  db.prepare(`INSERT INTO users (email, name, role, is_test, created_at) VALUES (?, ?, ?, 1, ?)`).run(ADMIN.email, ADMIN.name, ADMIN.role, TS);
  const userId = db.prepare('SELECT id FROM users WHERE email = ?').get(ADMIN.email).id;

  // Draft campaign
  db.prepare(`INSERT INTO campaigns (id, name, description, region, status, user_id, is_test, created_at)
    VALUES ('test-campaign-001', 'Summer Adventures 2026', 'Curated summer experiences across the Northeast', 'northeast', 'draft', ?, 1, ?)`).run(userId, TS);

  db.close();
  return { userId, campaignId: 'test-campaign-001', step: 1 };
}
