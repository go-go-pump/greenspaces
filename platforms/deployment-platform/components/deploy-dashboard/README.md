# deploy-dashboard

> **Status:** AVAILABLE
> **Role:** Vanilla HTML dashboard for deploy visibility

---

## Overview

The deploy-dashboard renders a visual timeline of deployment events. Built with vanilla HTML/CSS/JS — no frameworks, no build step, no dependencies. Sunrise palette (#E8735A, #F4A261, #FFD166).

## Features

- **Deploy Timeline:** Chronological list of deploy events with color-coded status
- **Version Map:** Current version per environment with drift indicators
- **Deploy Metrics:** Deploys/day, mean time between deploys, success rate
- **Actor Breakdown:** Pie chart of human vs AI vs CI deploys
- **Filter/Search:** Filter by project, environment, status, date range

## Non-Responsibilities

- Does NOT trigger deploys
- Does NOT store data (reads from deploy-history SQLite)
- Does NOT require authentication (mounted behind `/admin/` which handles auth)

## See Also

- [INTERFACE.md](./INTERFACE.md) — Input/output contract
- [deploy-dashboard.template.html](../../templates/deploy-dashboard.template.html) — HTML template
