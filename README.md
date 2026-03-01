# Greenspaces

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Part of PUMP (Pure Momentum Prompts)](https://img.shields.io/badge/ecosystem-PUMP-blue)](https://github.com/go-go-pump)
[![Components](https://img.shields.io/badge/status-bootstrapping-orange)]()

**The MilliPrime Co-Op Toolkit — shared components and services for indy founders.**

Greenspaces is the shared repository of reusable components and full services that power the MilliPrime ecosystem. Every new project starts with proven infrastructure instead of reinventing from scratch.

> **Open source.** Every MilliPrime who builds a project contributes reusable components back here. Every MilliPrime who starts a new project gets those components for free. The flywheel: **Use Case -> Reusable Module -> Product -> Revenue -> Reinvest.**

---

## Quick Start

```bash
git clone git@github.com:go-go-pump/greenspaces.git
```

Browse the catalog: [CATALOG.md](./CATALOG.md) | Browse services: [SERVICES.md](./SERVICES.md)

---

## Philosophy

Every project Paul builds shares DNA: auth flows, email pipelines, video generation, browser automation, campaign management, monitoring, deployment. Instead of rebuilding these each time — or worse, copy-pasting and diverging — Greenspaces maintains canonical versions that projects consume.

The goal: when 1KH v4 supercharges a PUMP for a new project, it can say "pull in `auth-otp`, `email-campaign-core`, `vidgen-pipeline`, and `monitoring-beacon`" and those components arrive ready to wire up. Deterministic. Tested. Documented.

## Structure

```
greenspaces/
├── README.md                              # This file
├── CATALOG.md                             # Master index of all shared components
├── SERVICES.md                            # Full services catalog
├── shared-components/                     # Reusable building blocks
│   └── (components listed in CATALOG.md)
└── services/                              # Full service suites
    ├── marketing-platform-suite/          # Video, social, email services
    ├── business-orchestration-suite/      # Testing, monitoring, deployment
    └── business-creation-exit-suite/      # Registration, vendor listing, exit
```

## Shared Components vs Services

**Shared Components** are discrete, composable building blocks — a single concern, well-tested, documented, and consumed by multiple projects. Think: `auth-otp`, `email-send`, `browser-watcher`, `metric-beacon`.

**Services** are orchestrated collections of components that deliver a complete business capability. Think: Marketing Platform Suite (vidgen + vidpub + vid-campaign + video-market-research), Business Orchestration Suite (testing dashboard + monitoring + deployment).

## Consumption Model

Projects don't fork Greenspaces. They reference it. When a PUMP triggers a new project build:

1. 1KH v4 spec identifies which Greenspaces components/services are needed
2. OpenClaw pulls the component definitions and wires them into the new project
3. The new project's `greenspaces.json` manifest tracks which components it consumes and at which version
4. Refactors to shared components propagate awareness to all consuming projects

## The Three Repos

| Repo | Purpose | Visibility |
|------|---------|-----------|
| [god-mode](https://github.com/go-go-pump/god-mode) | Entry point + PUMP master spec | Private |
| [1kh](https://github.com/go-go-pump/1kh) | Standards engine | Public |
| **greenspaces** (this repo) | Shared components + services | Public |

## For MilliPrimes

This repo is the shared toolkit of the MilliPrime Co-Op — a network of indy founders with the leverage of major corporations. Every MilliPrime who builds a project contributes reusable components back here. Every MilliPrime who starts a new project gets those components for free.

The flywheel: **Use Case → Reusable Module → Module Serves/Becomes Product → Revenue → Reinvest.**

The more people build, the faster everyone moves. That's the co-op advantage.

## Current State

See [CATALOG.md](./CATALOG.md) for the shared components index.
See [SERVICES.md](./SERVICES.md) for the full services catalog.
