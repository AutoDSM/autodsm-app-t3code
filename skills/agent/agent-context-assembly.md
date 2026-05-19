# Agent Context Assembly

## Goal

Assemble enough context for a high-quality component edit without handing the agent the whole workspace.

## Component Run Context

Include:

1. workspace metadata
2. active component source and metadata
3. component conversation history
4. active `BrandProfile`
5. explicit `@token` references
6. explicit `/` slash references
7. Modern Starter or shadcn/ui conventions
8. target write paths under `system/components/` and `storybook/stories/`

Exclude by default:

- unrelated component source
- production repo files
- provider credentials
- cloud-only metadata
- raw Supabase records

## Create Component Context

Include workspace source type, token profile, atomic-design guidance, file naming conventions, and instruction to generate a Storybook story.

## Anti-Patterns

Do not solve context problems by dumping the entire repo. Do not let component runs write outside the workspace. Do not bypass ChangeSet capture.
