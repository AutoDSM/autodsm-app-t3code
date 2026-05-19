# WebContentsView — AutoDSM Preview Contract

## Contract

The component preview is a sibling `WebContentsView` owned by the main process. It displays local Storybook story URLs for the active workspace.

## Responsibilities

- Renderer reports canvas bounds.
- Main process positions and toggles preview visibility.
- `StorybookOrchestrator` provides URLs.
- Security code blocks external navigation, popups, and privileged preload.

## Overlay Rule

Hide or lower the preview when diff slide-over, modals, or other UI overlays would otherwise conflict with z-order.
