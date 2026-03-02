# test-dashboard

Vanilla HTML/JS dashboard for visual test management: seed data, run tests, reset state, view results.

## Role

Provides a founder-operable web interface at `/admin/testing` where you can:
- **Seed** — Pre-populate database to any journey stage with one click
- **Run** — Execute the full Playwright suite and watch progress
- **Reset** — Wipe all test data (is_test=1 rows only)
- **View** — See test results, screenshots, coverage heatmap

## Tech

- Vanilla HTML/CSS/JS — no framework, no build step
- Sunrise palette: `#E8735A` (coral), `#F4A261` (amber), `#FFD166` (gold)
- Communicates with backend via simple REST endpoints

## Mounting

```javascript
app.use('/admin/testing', express.static('testing-platform/components/test-dashboard/public'));
```
