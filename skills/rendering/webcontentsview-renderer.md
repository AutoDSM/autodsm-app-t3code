# WebContentsView Preview Renderer

## v1 Rendering Contract

AutoDSM v1 renders components through an invisible local Storybook server displayed in a sibling Electron `WebContentsView`.

## Topology

Renderer UI owns layout placeholders. Main process owns the actual preview view, loads Storybook story URLs, applies bounds, hides the view for overlays, and destroys it on shutdown.

## Storybook Integration

`StorybookOrchestrator` generates config and stories, starts the server, exposes render URLs, and reports health.

## Do Not

Do not render preview as a privileged iframe inside the main UI. Do not expose Node/preload powers to preview. Do not let preview navigate outside allowed local URLs.
