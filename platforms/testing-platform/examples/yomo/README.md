# YOMO — Testing Platform Example

Demonstrates the testing platform wired into a YOMO (experience listing) campaign lifecycle.

## Journey

The YOMO campaign lifecycle: create a campaign → generate video assets → render video → publish to YouTube → view analytics.

## Files

- `journey-map.json` — Full journey map for YOMO campaign lifecycle
- `seeds/` — Per-stage seed scripts

## Usage

```bash
# Seed to step 3 (video rendered)
node examples/yomo/seeds/seed-step-3.mjs

# Run YOMO-specific tests
TEST_MODE=true npx playwright test --grep "yomo"

# Reset
node examples/yomo/seeds/reset.mjs
```
