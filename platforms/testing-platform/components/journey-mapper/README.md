# journey-mapper

Journey map definition, validation, and indexing engine.

## Role

Validates journey map JSON files against the schema, generates step indexes for seed-engine and e2e-runner consumption, and detects inconsistencies (missing seed scripts, orphaned specs).

## Features

- JSON schema validation for journey maps
- Step index generation (ordered list of all steps across all journeys)
- Cross-reference validation (journey → seed script → spec file)
- Inconsistency detection and reporting
