# AGENTS.md — CrownTrack ADV

## Mission

Build CrownTrack ADV: a private Android/iOS adventure-bike GPS app for Alberta. It must be offline-first, field-safe, native-feeling, and source/legal-aware.

## Product principles

- Map-first. The map and current ride state are the center of the app.
- Offline-first. A rider must be able to navigate, record, and export with no cell service.
- Field-safe. Big controls, clear states, readable outdoors, no tiny hit targets.
- Legal/source-aware. Every trail/map layer must know where it came from and what confidence applies.
- No fake certainty. Unknown legality/data confidence must be shown as unknown, not guessed.
- Private-group first. Build for the owner and buddies, not a public trail social network.

## Non-negotiables

- Do not scrape Gaia, Trailforks, Google Maps, Garmin, AllTrails, BRMB, or paid map sources.
- Do not bulk download public OpenStreetMap tiles.
- Do not add real API keys or secrets.
- Do not implement real GPS/background tracking until the UI shell and navigation-core contracts are stable.
- Do not implement real MapLibre until the offline pack registry contracts are stable.
- Do not add production dependencies without explaining why.
- Do not treat HTML prototypes as final visual design.

## First build strategy

1. Scaffold the repo.
2. Build a premium React Native UI shell using mock data only.
3. Add pure TypeScript domain contracts and mock services.
4. Add tests for the domain logic.
5. Only after review: MapLibre spike, GPX engine, offline pack registry, then real data pipeline.

## Preferred repo shape

- `apps/mobile` — React Native app
- `packages/core` — pure TypeScript domain models and state machines
- `packages/ui` — reusable UI tokens/components
- `packages/offline-packs` — pack manifests, registry, health checks
- `packages/gpx` — GPX import/export later
- `tools/gis-pipeline` — future GIS/map-pack builder
- `docs` — product/architecture/design docs
- `skills` — task-specific Codex skills

## Quality gate before completion

Every milestone must use independent architecture, QA, UI/UX, and security/privacy review when relevant. UI changes must be interacted with in a browser or device, inspected at multiple viewport sizes, and checked for clipping, overlap, safe-area, scroll, accessibility, and state clarity. Browser testing is supplemental to native platform validation.

Every Codex task must end with:

- Files changed summary
- Commands run
- Tests/typechecks/lint results
- Known gaps
- Screenshots or clear manual verification steps for UI tasks
- A short self-review: what could break, what was intentionally deferred

## UI expectations

Use native mobile patterns inspired by Android Material and iOS HIG, but do not make a generic default app. The app should feel like a serious Alberta ADV field tool: calm, rugged, readable, precise.

Avoid:

- Neon cyberpunk glow
- Emoji controls
- Tiny text/buttons
- Random gradients
- Overcomplicated dashboards
- Fake map detail that looks like a game

Prefer:

- Bottom navigation for Map / Packs / Plan / Crew / SOS
- Bottom sheets for secondary tasks
- Clear status chips: GPS, offline pack, route audit, legal confidence
- High-contrast field mode
- Large one-hand controls
- Distinct warning and emergency states

## CrewLink persistence rule

- `packages/crewlink` owns the canonical CrewLink repository contract and migration plan.
- Native adapters must implement that contract; screen state must not introduce a competing CrewLink schema or migration path.
- Migration configuration, execution, and errors must never log coordinates, tokens, or raw envelopes.
- Native runtime evidence is required before claiming persistence across a device restart.
