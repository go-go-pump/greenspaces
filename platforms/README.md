# Greenspaces — Platforms

**Last Updated:** March 1, 2026

---

## What Is a Platform?

A **platform** is a curated collection of Greenspaces shared components assembled for a specific domain. It's a **loose abstraction** — glue that houses heavy-hitting components together under a common purpose.

Platforms are **not** standalone applications. They're reference architectures that document:
- Which shared components combine to serve a domain
- How those components wire together
- What the end-to-end workflow looks like
- What persistence schema the consuming project needs

### Key Principle: Businesses Create Their Own Instances

Platforms are **not** onboarded into Greenspaces as shared components. Instead:

1. Greenspaces documents the **reference platform** (which components, how they connect)
2. Each business creates its **own platform instance** in its own codebase
3. The business wires the shared components together with its own domain logic
4. The platform definition in Greenspaces serves as a blueprint, not a product

This is important because **every business uses these capabilities differently:**

| Business | Video Platform Instance |
|----------|----------------------|
| Man vs Health | Videos loosely tied to health coaching topics, published on a schedule |
| YOMO Store | Product listing videos — the video IS the listing, they're created together |
| Generic Channel | Pure content play — keyword-driven, volume-optimized |

Same components, different glue. The platform captures the shared pattern. The business owns the instance.

---

## Platforms vs Services vs Components

| Concept | Scope | Owned By | Example |
|---------|-------|----------|---------|
| **Shared Component** | Single concern, one job | Greenspaces | `vidgen-pipeline`, `vidpub`, `auth-otp` |
| **Service Suite** | Orchestrated group of components for a business capability | Greenspaces (in `services/`) | Marketing Platform Suite |
| **Platform** | Curated component collection for a domain — a reference architecture | Greenspaces (docs only) | Video Platform, Social DM Platform |
| **Platform Instance** | A business's own wiring of platform components | The business project | MVH's video workflow, YOMO's product video pipeline |

### When to Use Each

- **Need a reusable building block?** → Shared Component
- **Need to document how a group of components delivers a capability?** → Service Suite
- **Need to define a domain-level blueprint that businesses instantiate?** → Platform
- **Building a business that uses these components?** → Platform Instance (in your project)

---

## Platform Index

| Platform | Domain | Core Components | Reference Doc |
|----------|--------|----------------|---------------|
| `video-platform` | YouTube video content | vidgen-pipeline, vidpub, vid-campaign | [video-platform/](./video-platform/) |

### Future Platforms (Not Yet Documented)

| Platform | Domain | Core Components | Status |
|----------|--------|----------------|--------|
| `social-dm-platform` | Facebook group engagement + DM outreach | fb-auth, fb-graphql-scraper, browser-watcher | Components are CANDIDATE |
| `cold-email-platform` | Multi-tenant email campaigns | email-campaign-core, contact-store, email-send | Components are CANDIDATE |
| `testing-platform` | E2E testing + seed data | e2e-test-runner, seed-manager | Components are PLANNED |
| `deployment-platform` | CI/CD + deployment orchestration | deploy-script | Components are PLANNED |
| `monitoring-platform` | Health checks + business metrics | metric-beacon, metric-snapshot | Components are CANDIDATE |

---

## How a Platform Gets Created

1. **Identify the pattern.** Multiple projects use the same set of components in the same domain.
2. **Extract the components.** Each heavy-hitting piece becomes a shared component in `shared-components/`.
3. **Document the platform.** Create a README in `platforms/<name>/` describing the component assembly, wiring, and workflow.
4. **Businesses instantiate.** Each project pulls the components and wires them with its own logic.

A platform is ready to document when **at least 2 of its core components are AVAILABLE** in the catalog.

---

## Relationship to SERVICES.md

`SERVICES.md` documents service suites from the perspective of **what capability is delivered**. Platforms document the same assemblies from the perspective of **what domain they serve**. They're complementary views:

- **SERVICES.md:** "The Marketing Platform Suite delivers video, social, and email capabilities."
- **platforms/video-platform/:** "Here's exactly how to assemble a video platform using vidgen-pipeline + vidpub + vid-campaign."

Service suites can span multiple platform domains. Platforms focus on one domain's complete workflow.
