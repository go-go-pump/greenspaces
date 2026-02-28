# Contributing to Greenspaces

Greenspaces is the shared component and services catalog for the MilliPrime Co-Op. When you build something reusable, it belongs here.

## The Extraction Flow

Components don't start in Greenspaces — they start in projects:

1. You build something for your project (auth, email, monitoring, etc.)
2. You realize it's reusable — tag it `greenspaces:candidate` in your project
3. Extract it: generalize, document, test independently
4. Submit a PR to this repo with the component
5. Update [CATALOG.md](./CATALOG.md) with the new entry
6. Other projects can now consume it via `greenspaces.json`

## Adding a Shared Component

### Structure

```
shared-components/
└── your-component/
    ├── README.md          # What it does, how to use it, API surface
    ├── package.json       # Dependencies, version
    ├── src/               # Source code
    └── tests/             # Tests that run independently
```

### Requirements

- Single concern — one component, one job
- Documented API surface in README
- Tests that pass independently (not coupled to a specific project)
- No hardcoded project-specific config
- Semantic versioning

### PR Checklist

- [ ] Component has its own README
- [ ] Tests pass independently
- [ ] CATALOG.md updated with new entry
- [ ] No project-specific dependencies or config

## Adding a Service Suite

Services are orchestrated collections of components. They go in `services/`:

```
services/
└── your-suite/
    ├── README.md          # Architecture, components used, setup
    └── ...
```

Update [SERVICES.md](./SERVICES.md) when adding or modifying a service suite.

## Branch Naming

| Prefix | Use |
|--------|-----|
| `component/` | New shared component |
| `service/` | New or updated service suite |
| `fix/` | Bug fix to existing component |
| `docs/` | Documentation updates |

## Commit Messages

```
<type>(<scope>): <short description>
```

Types: `component`, `service`, `fix`, `docs`
Scope: component or service name (e.g., `component(auth-otp): initial extraction`)

## Code of Conduct

The co-op runs on trust. Contribute things that work. Document them honestly. Help others use them. That's it.
