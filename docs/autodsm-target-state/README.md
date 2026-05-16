# AutoDSM — Target State Documentation

> **A local-first AI workspace for editing, governing, and shipping real component libraries inside React codebases.**

## Quick Navigation

| Document | Description |
|----------|-------------|
| [Architecture Diagram](./diagrams/architecture.html) | Interactive HTML diagram of the complete system |
| [System Architecture](./architecture/system-overview.md) | Detailed technical architecture |
| [Core Features](./features/core-features.md) | Feature inventory and specifications |
| [Roadmap Phases](./phases/roadmap.md) | Implementation phases and milestones |

---

## What is AutoDSM?

AutoDSM is a **macOS Electron desktop application** that provides:

```
Cursor's agentic loop + Storybook's component browser + Mintlify's published-docs polish
                                    ↓
              Fused into one local-first macOS desktop app
```

### The Core Loop

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   SELECT          REQUEST         PREVIEW         REVIEW        │
│   COMPONENT  →    CHANGE     →    RENDER     →    DIFF     →   │
│                                                                 │
│                     VALIDATE        MERGE                       │
│                 →   AGAINST    →    SAFELY                      │
│                     SCAN                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Three DNA Strands

| Strand | Source | What it brings |
|--------|--------|----------------|
| **Cursor DNA** | Agentic editing loop | Prompt → preview → diff → merge |
| **Storybook DNA** | Component browser | Persistent workspace, prop controls, visual inspection |
| **Mintlify DNA** | Published docs | Brand books as byproduct, not primary output |

---

## The Problem AutoDSM Solves

### Economic Problem
Modern web teams ship UI through **shared React component libraries**. As libraries grow:
- Shared components **calcify** (too risky to change)
- Design system **drift** occurs (each squad recreates locally)
- Documentation **rots** (stories go stale within weeks)
- Generic AI tools are **unsafe** (no system-level context)

### User Problems

| User | Pain Point |
|------|------------|
| **Design Engineers** | Want to change a Button and see all 47 places it's used instantly |
| **Platform Leads** | Want governance: tokens-of-record, violations report, merge gates |
| **Solo Founders** | Want to set up a library quickly with AI and publish brand docs |

---

## Target Users (ICP)

### Primary
**In-house teams owning reusable React component systems** used across multiple product squads.

Titles:
- Design Engineer
- Frontend Platform Engineer
- Staff Frontend Engineer
- Design System Lead
- Senior Product Designer (code-fluent)

### Secondary
**Fast-moving startups using shadcn/ui + Tailwind + AI coding tools** who accumulate shared components organically.

### Anti-ICP (Not For)
- Design-only teams (no code workflow)
- Teams whose library isn't actually shared infrastructure
- Teams that don't use PRs
- Anyone seeking docs polish without code workflow

---

## Key Differentiators

| vs. Competitor | AutoDSM's Edge |
|----------------|----------------|
| **Storybook** | No `.stories` files required. AI editing loop. Real-repo fidelity. |
| **Chromatic** | Generates changes, not just detects them |
| **Zeroheight/Mintlify** | Docs are downstream output, not the product |
| **Cursor/Copilot** | System-level component context, ChangeSet-validated, merge-safe |
| **Knapsack** | Local-first trust, broader ICP, free tier |
| **Anima/v0** | Edits *existing* shared components in real repo |

---

## Core Principles

### Local-First (Non-Negotiable)
- Source code never leaves the machine unless explicitly published
- No secrets sent to AutoDSM servers
- AST scans stay local

### Artifact-Driven
Every feature reads or writes one of seven canonical artifacts:
1. **ProjectProfile** — Framework, package manager, config detection
2. **BrandProfile** — Tokens, fonts, colors, palettes
3. **ComponentRegistry** — Components, props, usage maps
4. **RenderManifest** — Per-render state
5. **ScanArtifact** — Violations, severity, fixes
6. **ChangeSet** — Agent-proposed changes
7. **PublishedSnapshot** — Immutable brand books

### Merge-Safe
- Every write is mediated by a ChangeSet
- Every commit is the user's commit
- Every merge is the user's merge
- Branch-per-session (never edit default branch directly)

---

## Pricing Tiers

| Tier | Price | For |
|------|-------|-----|
| **Free** | $0 | Solo engineers, OSS, evaluation |
| **Pro** | $29/mo | Power individuals, freelancers |
| **Team** | $49/seat/mo | Shared libraries, governance |
| **Enterprise** | $40-80K/yr | SSO, audit, compliance, on-prem |

---

## View the Architecture

Open the [Interactive Architecture Diagram](./diagrams/architecture.html) to explore the complete system visually.

---

## Document Index

### Architecture
- [System Overview](./architecture/system-overview.md)
- [Process Model](./architecture/process-model.md)
- [Security Model](./architecture/security-model.md)

### Features
- [Core Features](./features/core-features.md)
- [Provider Integration](./features/providers.md)
- [Git Integration](./features/git-integration.md)

### Phases
- [Roadmap Overview](./phases/roadmap.md)
- [Phase Acceptance Criteria](./phases/acceptance-criteria.md)

---

*This documentation represents the target state for AutoDSM v1.0*
