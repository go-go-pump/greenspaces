# deploy-history

> **Status:** AVAILABLE
> **Role:** SQLite-backed deploy event storage and query API

---

## Overview

The deploy-history component provides persistent storage for deploy events using SQLite. Append-only writes, flexible queries, and a simple HTTP API for dashboard consumption.

## Responsibilities

- Store deploy events in SQLite (append-only)
- Provide query API (filter by project, environment, status, date range)
- Support pagination and sorting
- Import from flat JSON files (migration from JSONL fallback)

## Storage

- SQLite database at configurable path (default: `./data/deploy-history.sqlite`)
- Schema defined in [architecture.md](../../docs/architecture.md)
- Append-only — no update or delete operations

## See Also

- [INTERFACE.md](./INTERFACE.md) — Input/output contract
- [architecture.md](../../docs/architecture.md) — SQLite schema definition
