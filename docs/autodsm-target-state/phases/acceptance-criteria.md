# Phase Acceptance Criteria

## v1 Ship Checklist

- Clean macOS DMG launches to sign-in.
- GitHub/Google OAuth sign-in and beta gate work.
- Modern Starter workspace creates in under 10 seconds.
- shadcn/ui workspace creates in under 30 seconds.
- Workspace files live under `~/.autodsm/systems/<id>/`.
- Production repos are not written by AutoDSM.
- Storybook starts locally and renders workspace components.
- Sidebar groups components by Atomic Design with render health status.
- Home shows real metrics, activity, and suggestions.
- Create Component generates source/story, indexes it, renders it, and persists history.
- Design Tokens edits canonical tokens and derived CSS/Tailwind output.
- Token usage tracking shows affected components.
- Component Page supports live preview, props, variants, scoped composer, and history.
- Agent edit loop works: prompt → file change → Storybook update → ChangeSet.
- Diff slide-over shows real hunks with approve/reject/discard.
- Create PR creates a local PR record and activity entry.
- Publish produces a typed installable npm package.
- Exported package installs and renders in a fresh Vite project.
- T3 Code substrate tests still pass.
- App quit stops Storybook and agent subprocesses.
- Supabase telemetry/feedback work without sending source artifacts.
- Signed build passes Gatekeeper.

## Phase Gates

A phase is not complete until acceptance criteria pass, tests are listed in `build-progress.md`, regressions are documented, blockers are explicit, and the next phase is named.

## Hero Path Test

```txt
sign in
→ create shadcn workspace
→ render Button
→ ask AI to add a glass variant
→ see preview update
→ review diff
→ create local PR
→ publish package
→ install into fresh Vite app
→ render imported Button
```
