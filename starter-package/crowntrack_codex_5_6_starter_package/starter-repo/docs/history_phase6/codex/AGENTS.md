# AGENTS.md — CrownTrack ADV

## Mission
Build CrownTrack ADV as a private Android/iOS offline GPS app for Alberta ADV motorcycle riding.

## Working rules
- Prefer staged, testable work over large rewrites.
- Do not invent production data sources.
- Do not scrape proprietary maps or public tile servers.
- Use mock data until a stage explicitly asks for real integrations.
- Keep TypeScript strict and data contracts explicit.
- Update docs/build tracker after each stage.
- Before adding dependencies, explain why.
- Protect offline-first behavior.

## Architecture direction
- React Native + TypeScript mobile app.
- MapLibre for map rendering later.
- Pure TypeScript state/data modules first.
- Local-first storage for packs, GPX, tracks, waypoints.
- Later: SQLite/file-system persistence and backend sync.

## UI direction
Native-feeling, calm, outdoor-field readable. Avoid neon/dribbble/vibe-coded styling. Use large touch targets and clear states.

## Data rules
Every trail/route/layer must have source/confidence metadata. User GPX is never legal truth.
