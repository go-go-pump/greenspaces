# YOMO — Testing Platform Integration Example

This example shows how YOMO (experience listings platform) consumes the Testing Platform.

## Structure

```
examples/yomo/
├── README.md                    # This file
├── journey-map.json             # Campaign lifecycle as journey map
└── seeds/
    ├── step-1-create-campaign.mjs
    ├── step-2-add-experiences.mjs
    ├── step-3-publish.mjs
    ├── step-4-bookings.mjs
    └── reset.mjs
```

## Integration Pattern

1. **Journey map** defines the campaign lifecycle: create → add experiences → publish → bookings
2. **Seed scripts** populate YOMO's SQLite DB at each step with `is_test = 1`
3. **Dashboard** mounts at `/admin/testing` using the template HTML
4. **Playwright** runs the journey end-to-end against seeded state

## How YOMO Uses This

```javascript
// In YOMO's greenspaces.json:
{
  "platforms": {
    "testing-platform": {
      "version": "1.0.0",
      "journeys": ["test/journeys/campaign-lifecycle.json"],
      "seeds": ["test/seeds/*.mjs"],
      "dashboard": "public/admin/testing.html"
    }
  }
}
```

The key insight: YOMO didn't build any testing infrastructure. It consumed the Testing Platform's patterns, copied the templates, and filled in its domain-specific journeys and seeds.
