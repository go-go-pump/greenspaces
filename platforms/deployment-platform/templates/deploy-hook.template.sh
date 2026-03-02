#!/bin/bash
# deploy-hook.template.sh — Greenspaces Deployment Platform
# Source this in your deploy.sh to emit deploy events automatically.
#
# Usage:
#   source ./scripts/deploy-hook.sh
#   emit_deploy_event "success"   # or "failure" or "rollback"

emit_deploy_event() {
  local STATUS="${1:-success}"
  local PROJECT_ID="${DEPLOY_PROJECT_ID:-$(basename "$(pwd)")}"
  local ENV="${DEPLOY_ENV:-production}"
  local ACTOR="${DEPLOY_ACTOR:-$(whoami)}"
  local ACTOR_TYPE="${DEPLOY_ACTOR_TYPE:-human}"
  local DB_PATH="${DEPLOY_HISTORY_DB:-./data/deploy-history.sqlite}"
  local JSON_PATH="${DEPLOY_HISTORY_JSON:-}"

  # Git context
  local COMMIT_SHA
  COMMIT_SHA=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
  local SHORT_SHA="${COMMIT_SHA:0:7}"
  local COMMIT_MSG
  COMMIT_MSG=$(git log -1 --pretty=%s 2>/dev/null || echo "")
  local BRANCH
  BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")

  # Version (from version.json or package.json)
  local VERSION="unknown"
  if [ -f version.json ]; then
    VERSION=$(grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' version.json | head -1 | grep -o '"[^"]*"$' | tr -d '"')
  elif [ -f package.json ]; then
    VERSION=$(grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' package.json | head -1 | grep -o '"[^"]*"$' | tr -d '"')
  fi

  # Timestamp and event ID
  local TIMESTAMP
  TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  local DATE_PART
  DATE_PART=$(date -u +"%Y%m%d_%H%M%S")
  local EVENT_ID="deploy_${DATE_PART}_${SHORT_SHA}"

  # Duration (if DEPLOY_START_TIME was set)
  local DURATION="null"
  if [ -n "${DEPLOY_START_TIME:-}" ]; then
    local END_TIME
    END_TIME=$(date +%s%3N 2>/dev/null || date +%s)
    DURATION=$(( END_TIME - DEPLOY_START_TIME ))
  fi

  # Build JSON event
  local EVENT_JSON
  EVENT_JSON=$(cat <<EOF
{
  "eventId": "${EVENT_ID}",
  "timestamp": "${TIMESTAMP}",
  "projectId": "${PROJECT_ID}",
  "environment": "${ENV}",
  "version": "${VERSION}",
  "previousVersion": null,
  "status": "${STATUS}",
  "actor": "${ACTOR}",
  "actorType": "${ACTOR_TYPE}",
  "duration": ${DURATION},
  "commitSha": "${COMMIT_SHA}",
  "commitMessage": $(printf '%s' "${COMMIT_MSG}" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))' 2>/dev/null || echo "\"${COMMIT_MSG}\""),
  "branch": "${BRANCH}",
  "artifacts": {},
  "metadata": {}
}
EOF
)

  # Write to SQLite or flat JSON
  if [ -n "$JSON_PATH" ]; then
    mkdir -p "$(dirname "$JSON_PATH")"
    echo "$EVENT_JSON" >> "$JSON_PATH"
    echo "[deploy-hook] Event ${EVENT_ID} appended to ${JSON_PATH}"
  elif command -v sqlite3 &>/dev/null; then
    mkdir -p "$(dirname "$DB_PATH")"
    sqlite3 "$DB_PATH" "CREATE TABLE IF NOT EXISTS deploy_events (
      event_id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      project_id TEXT NOT NULL,
      environment TEXT NOT NULL,
      version TEXT NOT NULL,
      previous_version TEXT,
      status TEXT NOT NULL,
      actor TEXT NOT NULL,
      actor_type TEXT NOT NULL,
      duration_ms INTEGER,
      commit_sha TEXT,
      commit_message TEXT,
      metadata TEXT
    );"
    sqlite3 "$DB_PATH" "INSERT INTO deploy_events VALUES (
      '${EVENT_ID}', '${TIMESTAMP}', '${PROJECT_ID}', '${ENV}',
      '${VERSION}', NULL, '${STATUS}', '${ACTOR}', '${ACTOR_TYPE}',
      ${DURATION}, '${COMMIT_SHA}', $(printf '%s' "${COMMIT_MSG}" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))' 2>/dev/null || echo "'${COMMIT_MSG}'"),
      '{}'
    );"
    echo "[deploy-hook] Event ${EVENT_ID} saved to ${DB_PATH}"
  else
    echo "[deploy-hook] WARNING: No sqlite3 and no DEPLOY_HISTORY_JSON set. Event not persisted."
    echo "$EVENT_JSON"
  fi
}
