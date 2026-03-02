/**
 * YOMO Seed — Step 2: Add Experiences
 * Builds on Step 1 + adds 3 experience listings.
 */
import Database from 'better-sqlite3';
import step1 from './step-1-create-campaign.mjs';

const EXPERIENCES = [
  { id: 'test-exp-001', title: 'Sunset Kayaking on Lake Champlain', price: 75.00, capacity: 12 },
  { id: 'test-exp-002', title: 'Vermont Farm-to-Table Dinner', price: 95.00, capacity: 20 },
  { id: 'test-exp-003', title: 'White Mountains Sunrise Hike', price: 45.00, capacity: 15 },
];

const TS = '2026-01-02T00:00:00Z';

export default async function seed(dbPath) {
  const { userId, campaignId } = await step1(dbPath);
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');

  db.prepare('DELETE FROM experiences WHERE is_test = 1').run();

  for (const exp of EXPERIENCES) {
    db.prepare(`INSERT INTO experiences (id, campaign_id, title, price, capacity, is_test, created_at)
      VALUES (?, ?, ?, ?, ?, 1, ?)`).run(exp.id, campaignId, exp.title, exp.price, exp.capacity, TS);
  }

  db.close();
  return { userId, campaignId, experienceCount: EXPERIENCES.length, step: 2 };
}
