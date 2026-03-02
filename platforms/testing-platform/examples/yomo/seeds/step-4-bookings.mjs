/**
 * YOMO Seed — Step 4: Bookings
 * Builds on Step 3 + adds 5 mock bookings across experiences.
 */
import Database from 'better-sqlite3';
import step3 from './step-3-publish.mjs';

const BOOKINGS = [
  { id: 'test-booking-001', expId: 'test-exp-001', customer: 'alice@testing.local', amount: 75.00 },
  { id: 'test-booking-002', expId: 'test-exp-001', customer: 'bob@testing.local', amount: 75.00 },
  { id: 'test-booking-003', expId: 'test-exp-002', customer: 'carol@testing.local', amount: 95.00 },
  { id: 'test-booking-004', expId: 'test-exp-003', customer: 'dave@testing.local', amount: 45.00 },
  { id: 'test-booking-005', expId: 'test-exp-002', customer: 'eve@testing.local', amount: 95.00 },
];

const TS = '2026-01-05T00:00:00Z';

export default async function seed(dbPath) {
  const result = await step3(dbPath);
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');

  db.prepare('DELETE FROM bookings WHERE is_test = 1').run();

  for (const b of BOOKINGS) {
    db.prepare(`INSERT INTO bookings (id, experience_id, customer_email, amount, is_test, created_at)
      VALUES (?, ?, ?, ?, 1, ?)`).run(b.id, b.expId, b.customer, b.amount, TS);
  }

  db.close();
  return { ...result, bookingCount: BOOKINGS.length, totalRevenue: 385.00, step: 4 };
}
