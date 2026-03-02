# seed-engine — Interface Contract

## Input

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `dbPath` | `string` | Yes | Path to SQLite database |
| `journeyMap` | `JourneyMap` | Yes | Parsed journey map JSON |
| `targetStep` | `number` | Yes | Seed through this step (inclusive) |
| `fixtureDir` | `string` | No | Path to fixture JSON files |
| `testTag` | `string` | No | Column name for test flag (default: `is_test`) |

## Output

```jsonc
{
  "seedId": "string",
  "stage": "string",
  "entitiesCreated": { "<table>": "number" },
  "taggedWith": "is_test",
  "resetCommand": "node test/seeds/reset.mjs"
}
```

## Reset

```jsonc
// Input: just dbPath and list of tables
// Output:
{
  "tablesCleared": ["emails", "campaigns", "users"],
  "rowsDeleted": { "<table>": "number" }
}
```

## Dependencies

- `better-sqlite3` ^11.0.0 (peer dependency)
