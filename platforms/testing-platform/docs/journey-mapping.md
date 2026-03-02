# Journey Mapping Guide

---

## What Is a Journey Map?

A journey map defines the **step-by-step path a user takes** through your application. Each step has:

- A name and description
- The state the system should be in before the step
- The actions the user performs
- The expected state after the step
- Artifacts produced (records created, files generated, etc.)

Journey maps drive everything in the testing platform: seed scripts know what data to create at each stage, E2E tests know what to assert, and the coverage viewer knows what's tested.

---

## Schema

See `templates/journey-map.template.json` for the full schema. Key fields:

```jsonc
{
  "journeyId": "campaign-lifecycle",        // Unique identifier
  "name": "Campaign Lifecycle",             // Human-readable name
  "description": "Full campaign from creation to results",
  "domain": "cold-email",                   // Which platform/business domain
  "steps": [
    {
      "step": 1,
      "name": "Onboarding",
      "description": "Business profile created, email domain configured",
      "preconditions": [],                  // What must be true before this step
      "actions": [                          // What the user does
        "Navigate to /onboarding",
        "Fill business profile form",
        "Verify email domain"
      ],
      "postconditions": [                   // What must be true after this step
        "Business record exists in DB",
        "Email domain verified"
      ],
      "artifacts": ["business_record", "domain_verification"],
      "seedScript": "seed-step-1.mjs",     // Script that creates this state
      "testSpec": "onboarding.spec.ts"      // Playwright spec that tests this step
    }
  ]
}
```

---

## How to Define a Journey Map

### 1. Identify the Core User Flow

What's the **happy path** from first touch to goal completion? Write it as a numbered list first:

1. User signs up
2. User configures their account
3. User creates their first [thing]
4. User triggers the [action]
5. User sees results

### 2. Define State Boundaries

For each step, what's the **minimum database state** needed to start that step? This becomes your seed script.

### 3. Map Actions to Assertions

For each step, what **observable outcomes** prove it worked? These become your Playwright assertions.

### 4. Create the JSON

Use the template. One file per journey. Store in `test/journeys/`.

---

## Naming Conventions

| Pattern | Example |
|---------|---------|
| Journey file | `campaign-lifecycle.journey.json` |
| Seed script | `seed-step-3.mjs` (seeds state through step 3) |
| Test spec | `campaign-lifecycle.spec.ts` |
| Step names | Verb-noun: "Create Campaign", "Send Email", "View Results" |

---

## Multi-Journey Projects

Most projects have multiple journeys:

- **Happy path** — The ideal user flow
- **Error recovery** — What happens when things fail
- **Edge cases** — Unusual but valid paths
- **Admin flows** — Founder/admin-specific operations

Start with the happy path. Add others as the project matures.

---

## Journey Map → Seed Script → E2E Test

The relationship is mechanical:

```
journey-map.json (step 3)
    → seed-step-3.mjs inserts data matching step 3 postconditions
    → step-4.spec.ts starts from step 3 state and tests step 4 actions/assertions
```

This means: **to test step N, seed to step N-1 and execute step N.**
