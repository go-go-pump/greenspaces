# deploy-logger

> **Status:** AVAILABLE
> **Role:** Receives deploy events, validates schema, appends to history

---

## Overview

The deploy-logger is the entry point for all deploy events. It receives structured JSON from deploy hooks, validates against the deploy event schema, enriches with computed fields, and routes to storage (deploy-history) and tracking (version-tracker).

## Responsibilities

- Validate incoming deploy events against `deploy-event-schema.json`
- Enrich events with computed fields (duration, previous version)
- Append validated events to deploy-history (SQLite)
- Update version-tracker state
- Optionally forward to metric-beacon

## Non-Responsibilities

- Does NOT trigger deploys (Phase 1 = reflection only)
- Does NOT decide whether to deploy
- Does NOT modify the deploy process

## See Also

- [INTERFACE.md](./INTERFACE.md) — Input/output contract
- [deploy-event-schema.md](../../docs/deploy-event-schema.md) — Event schema reference
