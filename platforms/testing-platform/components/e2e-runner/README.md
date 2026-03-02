# e2e-runner

Playwright test execution engine with trace capture, screenshot collection, and structured result output.

## Role

Runs Playwright specs against a live application, captures traces and screenshots on failure, and outputs structured JSON results consumable by the test dashboard and metric-beacon.

## Usage

```bash
TEST_MODE=true npx playwright test --config=playwright.config.ts
```

## Features

- Journey-driven test execution (one spec per journey)
- Automatic screenshot on failure
- Trace capture for debugging
- Structured JSON result output
- CI/CD compatible (exit code reflects pass/fail)
- Optional metric-beacon emission for monitoring integration
