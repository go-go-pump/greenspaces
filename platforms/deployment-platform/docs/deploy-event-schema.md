# Deploy Event Schema

> **Version:** 1.0.0
> **Last Updated:** March 2, 2026

---

## JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "DeployEvent",
  "description": "A structured record of a deployment event",
  "type": "object",
  "required": ["eventId", "timestamp", "projectId", "environment", "version", "status", "actor", "actorType"],
  "properties": {
    "eventId": {
      "type": "string",
      "description": "Unique event identifier",
      "pattern": "^deploy_[0-9]{8}_[0-9]{6}_[a-f0-9]+$"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp of deploy completion"
    },
    "projectId": {
      "type": "string",
      "description": "Unique project identifier (e.g., 'mvh', 'yomo')"
    },
    "environment": {
      "type": "string",
      "enum": ["production", "staging", "local", "preview"],
      "description": "Target deployment environment"
    },
    "version": {
      "type": "string",
      "description": "Version deployed (semver, calver, or git SHA)"
    },
    "previousVersion": {
      "type": ["string", "null"],
      "description": "Version that was running before this deploy"
    },
    "status": {
      "type": "string",
      "enum": ["success", "failure", "rollback"],
      "description": "Outcome of the deployment"
    },
    "actor": {
      "type": "string",
      "description": "Who or what triggered the deploy (e.g., 'paul', 'openclaw', 'github-actions')"
    },
    "actorType": {
      "type": "string",
      "enum": ["human", "ai", "ci"],
      "description": "Category of the deploy actor"
    },
    "duration": {
      "type": ["integer", "null"],
      "description": "Deploy duration in milliseconds"
    },
    "commitSha": {
      "type": ["string", "null"],
      "description": "Git commit SHA that was deployed"
    },
    "commitMessage": {
      "type": ["string", "null"],
      "description": "Git commit message"
    },
    "branch": {
      "type": ["string", "null"],
      "description": "Git branch deployed from"
    },
    "artifacts": {
      "type": "object",
      "properties": {
        "logs": { "type": "string", "description": "Path to deploy log file" },
        "diff": { "type": "string", "description": "URL to commit diff" }
      }
    },
    "metadata": {
      "type": "object",
      "description": "Extensible key-value pairs for project-specific data"
    }
  }
}
```

---

## Field Notes

### eventId Convention

Format: `deploy_{YYYYMMDD}_{HHMMSS}_{shortSha}`

Generated automatically by `deploy-hook.sh`. The short SHA is the first 7 characters of the deployed commit.

### actorType

- `human` — A person ran `deploy.sh` manually
- `ai` — An AI agent (OpenClaw, 1KH executor) triggered the deploy
- `ci` — A CI/CD pipeline (GitHub Actions, etc.) triggered the deploy

### status

- `success` — Deploy completed without errors
- `failure` — Deploy failed (partial or complete)
- `rollback` — A previous version was deliberately re-deployed

### metadata

Extensible field for project-specific data. Examples:

```json
{
  "stackName": "mvh-prod",
  "region": "us-east-1",
  "deployTool": "sst",
  "changedFiles": 12
}
```
