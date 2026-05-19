# Render Environment Profile

## v1 Position

Rendering environment data is internal support for Storybook orchestration, not the primary user-facing artifact.

For v1, prefer `WorkspaceMetadata`, `BrandProfile`, `ComponentRegistry`, generated stories, and Storybook health over a broad imported-repo profile.

## Use REP Only When Needed

Use a render profile to cache Storybook configuration inputs, dependency assumptions, CSS entrypoints, providers, and invalidation keys.
