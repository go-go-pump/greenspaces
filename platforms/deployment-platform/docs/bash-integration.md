# Bash Integration Guide

> **Last Updated:** March 2, 2026

---

## Overview

The deployment platform integrates with existing `deploy.sh` scripts via a lightweight shell hook. No changes to your deploy logic — just source the hook and call one function at the end.

---

## Quick Start

```bash
#!/bin/bash
# Your existing deploy.sh

set -euo pipefail

# ... your deploy logic here ...
sst deploy --stage production

# Emit deploy event (add these 2 lines)
source ./scripts/deploy-hook.sh
emit_deploy_event "success"
```

That's it. The hook captures git context automatically.

---

## How It Works

The `deploy-hook.sh` template provides one function: `emit_deploy_event`.

It:

1. Reads `version.json` (or `package.json` version field) from project root
2. Captures `git rev-parse HEAD`, `git log -1 --pretty=%s`, `git branch --show-current`
3. Computes duration if `DEPLOY_START_TIME` was set
4. Constructs a `DeployEvent` JSON object
5. Appends it to the deploy history (SQLite or flat JSON file)

### Timing

To capture deploy duration, set `DEPLOY_START_TIME` at the top of your script:

```bash
#!/bin/bash
DEPLOY_START_TIME=$(date +%s%3N)

# ... deploy logic ...

source ./scripts/deploy-hook.sh
emit_deploy_event "success"
```

### Failure Handling

Use a trap to emit failure events:

```bash
#!/bin/bash
DEPLOY_START_TIME=$(date +%s%3N)

cleanup() {
  local exit_code=$?
  if [ $exit_code -ne 0 ]; then
    source ./scripts/deploy-hook.sh
    emit_deploy_event "failure"
  fi
}
trap cleanup EXIT

# ... deploy logic ...

source ./scripts/deploy-hook.sh
emit_deploy_event "success"
```

---

## Environment Variables

The hook reads these (all optional, with sensible defaults):

| Variable | Default | Description |
|----------|---------|-------------|
| `DEPLOY_PROJECT_ID` | Directory name | Project identifier |
| `DEPLOY_ENV` | `production` | Target environment |
| `DEPLOY_ACTOR` | `$(whoami)` | Who triggered the deploy |
| `DEPLOY_ACTOR_TYPE` | `human` | `human`, `ai`, or `ci` |
| `DEPLOY_HISTORY_DB` | `./data/deploy-history.sqlite` | SQLite path |
| `DEPLOY_HISTORY_JSON` | `null` | Flat JSON fallback path (if no SQLite) |
| `DEPLOY_START_TIME` | `null` | Epoch ms for duration calculation |

### AI Agent Detection

When OpenClaw or another AI agent runs your deploy script, set:

```bash
DEPLOY_ACTOR=openclaw DEPLOY_ACTOR_TYPE=ai ./deploy.sh
```

The deploy event will reflect that an AI agent performed the deploy.

---

## Flat JSON Fallback

If SQLite isn't available, the hook falls back to appending JSON lines to a file:

```bash
DEPLOY_HISTORY_JSON=./deploys/history.jsonl ./deploy.sh
```

Each line is a complete `DeployEvent` JSON object. The deploy-history component can import these into SQLite later.
