# Core Features Inventory

## Four Pillars

### Library Forking & Starting

Users create isolated AutoDSM workspaces from Modern Starter or shadcn/ui. The fork is copied into `~/.autodsm/systems/<id>/system/` and production repos are not touched.

### AI-Isolated Component Engineering

Users create and edit components with a scoped composer. Each run includes active component source, component conversation history, active `BrandProfile`, token/slash references, library conventions, and atomic-design hint.

### Centralized Design Tokens

A visual table editor manages colors, typography, spacing, and motion. Token edits update canonical token artifacts and derived Tailwind/CSS outputs, then trigger Storybook preview updates.

### Live Previews & Sandboxed Rendering

Storybook runs invisibly in the background and renders components in a centered `WebContentsView` canvas. Users can cycle variants and edit props in real time.

## Four Product Surfaces

- **Home**: dashboard with workspace metadata, stats, recent activity, suggestions, and Publish CTA.
- **Create Component**: T3 Code-style composer for generating new components.
- **Design Tokens**: spreadsheet-style editor for brand foundation.
- **Component Page**: live preview, props/variants, scoped composer, conversation history, diff chip, and Create PR action.

## Tracking and Shipping

`DiffService` computes file/hunk diffs. `PRService` creates local PR records in v1. `PublishService` creates an installable typed npm package.

## v1 Feature Boundary

In v1: Modern Starter and shadcn/ui only, Storybook rendering only, local PR records only, local package publishing only.

v1.1+: additional fork providers, remote GitHub PRs, hosted registry/brand books, team sync, screenshot diff checks, DSM-1 data flywheel.
