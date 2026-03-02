# Semantic Versioning Guide

> **Last Updated:** March 2, 2026

---

## Overview

The deployment platform tracks versions using **semantic versioning** (semver) by default. This document defines conventions for version bumping, pre-release tags, and version drift detection.

---

## Semver Rules

```
MAJOR.MINOR.PATCH[-prerelease][+build]
```

| Segment | Bump When | Example |
|---------|-----------|---------|
| MAJOR | Breaking change to user-facing behavior or API | `1.0.0` → `2.0.0` |
| MINOR | New feature, backward-compatible | `2.0.0` → `2.1.0` |
| PATCH | Bug fix, backward-compatible | `2.1.0` → `2.1.1` |

### Pre-release Tags

| Tag | Meaning | Example |
|-----|---------|---------|
| `-dev` | Local development | `2.2.0-dev` |
| `-rc.N` | Release candidate N | `2.2.0-rc.1` |
| `-beta.N` | Beta release N | `2.2.0-beta.1` |

---

## Version File

Each project maintains a `version.json` at its root:

```json
{
  "version": "2.4.1",
  "updatedAt": "2026-03-02T03:00:00Z",
  "updatedBy": "deploy-hook.sh"
}
```

The deploy hook reads this file to populate the `version` field in deploy events. The version-tracker component reads it to detect drift across environments.

---

## Version Drift

When the same project runs different versions across environments, that's **drift**. The version-tracker detects and reports drift:

- **Acceptable:** staging is 1 minor ahead of production (normal development flow)
- **Warning:** staging is 2+ minors ahead (deploys are backing up)
- **Critical:** production is ahead of staging (hotfix deployed without staging)

---

## Alternative Schemes

The deployment platform supports alternative version schemes via the `versionScheme` config:

| Scheme | Format | Use Case |
|--------|--------|----------|
| `semver` | `2.4.1` | Most projects (default) |
| `calver` | `2026.03.02` | Date-based releases |
| `git-sha` | `abc1234` | Continuous deployment, no release tagging |

Configure in `greenspaces.json`:

```jsonc
{
  "platforms": {
    "deployment-platform": {
      "config": {
        "versionScheme": "semver"  // or "calver" or "git-sha"
      }
    }
  }
}
```
