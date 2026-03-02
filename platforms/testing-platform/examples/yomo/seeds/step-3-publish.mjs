/**
 * YOMO Seed — Step 3: Publish Campaign
 * Builds on Step 2 + publishes the campaign.
 */
import Database from 'better-sqlite3';
import step2 from './step-2-add-experiences.mjs';

const PUBLISH_TS = '2026-01-03T12:00:00Z';

export default async function seed(dbPath) {
  const result = await step2(dbPath);
  const db = new Database(dbPath);

  db.prepare(`UPDATE campaigns SET status = 'published', published_at = ? WHERE id = 'test-campaign-001'`).run(PUBLISH_TS);

  db.close();
  return { ...result, status: 'published', step: 3 };
}
