# coverage-viewer

Visual coverage map showing which journey steps have tests and which don't.

## Role

Cross-references journey map definitions with existing Playwright specs to generate a coverage heatmap. Outputs static HTML that can be embedded in the test dashboard or viewed standalone.

## Features

- Parses journey maps and spec files
- Generates coverage percentage per journey
- Highlights uncovered steps in red
- Static HTML output (no server required)
- Embeddable in test-dashboard
