# Seed Strategy

---

## Principles

1. **Every test row is tagged.** All seeded data carries `is_test = 1` (or your configured tag column). Production data is never touched.
2. **Seeds are deterministic.** Same script → same data → same IDs. Use fixed UUIDs or sequential IDs with a known offset.
3. **Seeds are incremental.** `seed-step-3.mjs` creates the state that exists after step 3 completes. It includes steps 1 and 2's data.
4. **Reset is total.** `reset.mjs` deletes ALL rows where `is_test = 1`. No partial resets. Clean slate.
5. **Seeds respect constraints.** Foreign keys, unique indexes, enum values — seeds must produce valid relational state.

---

## The `is_test` Flag

Every table that receives test data needs a boolean column:

```sql
ALTER TABLE users ADD COLUMN is_test INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN is_test INTEGER DEFAULT 0;
ALTER TABLE emails ADD COLUMN is_test INTEGER DEFAULT 0;
```

**Why not a separate database?**
- Same schema guaranteed
- Same queries work
- Same indexes apply
- No drift between test and production schemas
- Simpler setup for new projects

**The tradeoff:** Production queries should filter `WHERE is_test = 0` or `WHERE is_test IS NULL`. This is a convention your project enforces.

---

## Seed Script Pattern

```javascript
// test/seeds/seed-step-2.mjs
import Database from 'better-sqlite3';

const db = new Database(process.env.DB_PATH || './data/app.sqlite');

// Step 1: Create test user
db.prepare(`
  INSERT OR REPLACE INTO users (id, email, name, is_test)
  VALUES ('test-user-001', 'test@example.com', 'Test User', 1)
`).run();

// Step 2: Create campaign
db.prepare(`
  INSERT OR REPLACE INTO campaigns (id, user_id, name, status, is_test)
  VALUES ('test-campaign-001', 'test-user-001', 'Test Campaign', 'configured', 1)
`).run();

console.log('✅ Seeded to Step 2: Campaign configured');
db.close();
```

---

## Reset Script Pattern

```javascript
// test/seeds/reset.mjs
import Database from 'better-sqlite3';

const db = new Database(process.env.DB_PATH || './data/app.sqlite');

const tables = ['emails', 'campaigns', 'users']; // reverse dependency order

for (const table of tables) {
  const result = db.prepare(`DELETE FROM ${table} WHERE is_test = 1`).run();
  console.log(`🗑️  ${table}: ${result.changes} rows removed`);
}

console.log('✅ All test data reset');
db.close();
```

---

## ID Strategy

Use predictable IDs for test data so assertions are deterministic:

| Pattern | Example |
|---------|---------|
| Prefixed strings | `test-user-001`, `test-campaign-001` |
| High-offset integers | `900001`, `900002` (assumes production IDs are lower) |
| Fixed UUIDs | `00000000-0000-0000-0000-000000000001` |

Pick one pattern per project and stick with it.

---

## Fixture Data

For complex objects (email templates, video configs, conversation threads), store fixtures as JSON files:

```
test/
├── seeds/
│   ├── seed-step-1.mjs
│   ├── seed-step-2.mjs
│   ├── seed-step-3.mjs
│   ├── reset.mjs
│   └── fixtures/
│       ├── test-user.json
│       ├── test-campaign.json
│       └── test-metrics.json
```

Seed scripts import fixtures rather than hardcoding data inline.

---

## Environment Isolation

When `TEST_MODE=true`:
- External API calls are mocked (no real emails, no real API hits)
- Mock adapters return deterministic responses
- File outputs go to `./test/output/` instead of production paths
- Logging includes `[TEST]` prefix for easy filtering
