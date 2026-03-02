# version-tracker

> **Status:** AVAILABLE
> **Role:** Tracks semantic versions per project/environment, detects drift

---

## Overview

The version-tracker maintains a map of current versions across all projects and environments. It detects version drift (e.g., staging 2 minors ahead of production) and reports it to the dashboard.

## Responsibilities

- Maintain `version.json` state per project per environment
- Detect and classify drift (acceptable, warning, critical)
- Expose version map for dashboard consumption

## See Also

- [INTERFACE.md](./INTERFACE.md) — Input/output contract
- [semantic-versioning.md](../../docs/semantic-versioning.md) — Version scheme reference
