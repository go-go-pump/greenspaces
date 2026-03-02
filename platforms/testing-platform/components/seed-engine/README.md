# seed-engine

Deterministic data seeding engine for journey-stage-based test setup and teardown.

## Role

Reads journey maps and executes seed scripts that populate the database to a specific journey stage. All seeded data is tagged with `is_test = 1` for safe, total reset.

## Features

- Per-stage seeding (seed to step N includes steps 1 through N)
- Deterministic IDs (predictable, assertable)
- `is_test` tagging on every inserted row
- Total reset: `DELETE WHERE is_test = 1`
- Foreign key aware (seeds in dependency order, resets in reverse)
- Fixture file support (JSON data files for complex objects)
