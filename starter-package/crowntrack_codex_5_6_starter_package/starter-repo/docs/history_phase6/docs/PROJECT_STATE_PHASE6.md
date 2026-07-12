# Project State — Phase 6

## Current status
CrownTrack ADV has been iterated through:

- Phase 1: rough clickable prototype.
- Phase 2: native-style prototype and handoff package.
- Phase 3: product preview and initial build plan.
- Phase 4: field product prototype + data contract direction.
- Phase 5: navigation core preview and route/track lifecycle.
- Phase 6: offline map-pack registry + source/data pipeline planning.

## Phase 6 objective
Freeze the **offline pack and source metadata model** before real MapLibre or GIS work begins.

This prevents Codex from building an app that can display a map but cannot answer:

- Where did this trail data come from?
- Can this pack be used offline?
- What licence/attribution applies?
- Is this route inside an installed pack?
- Are any route segments user-GPX only?
- Is a pack stale or corrupted?
- Can the rescue GPX be exported without network?

## Immediate next implementation milestone
Build a pure TypeScript offline pack registry and data-contract layer.

Do not integrate real MapLibre or real geospatial data until this registry passes tests.

## Current product principle
The app earns trust by showing source confidence clearly. It must not pretend a GPX line is legal access.
