# Prompt Budget

## Principle

Use small, scoped prompts. AutoDSM quality comes from precise component context, not maximal context.

## Default Budget Slices

- system/product rules: compact
- component source: highest priority
- active tokens: high priority
- conversation summary: medium priority
- library conventions: medium priority
- examples and nearby components: opt-in only

## Required Sections

Every component run prompt should include: workspace source type, target component, token summary, write boundaries, review contract, and Storybook/story expectations.
