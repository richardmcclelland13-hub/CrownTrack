# Prompt to paste into Codex 5.6

You are Codex 5.6 working as the senior implementation agent for CrownTrack ADV.

## Goal

Start this project properly. Create a clean React Native + TypeScript repo scaffold and implement the first high-quality native UI shell using mock data only.

## Context to read first

Read these files before coding:

1. `AGENTS.md`
2. `START_HERE.md`
3. `docs/PRODUCT_BRIEF.md`
4. `docs/MVP_SCOPE_LOCK.md`
5. `design/UI_DIRECTION_FOR_CODEX_5_6.md`
6. `architecture/REPO_ARCHITECTURE.md`
7. `data-contracts/TYPESCRIPT_CONTRACTS.md`
8. `docs/LEGAL_DATA_GUARDRAILS.md`
9. `docs/CODEX_WORKFLOW.md`

The HTML prototypes in `prototype/` are flow references only. Do not copy their visual design. Make something better and more native.

## Required skill usage

Use these local skills where relevant by reading their `SKILL.md` files:

- `skills/native-mobile-ui/SKILL.md`
- `skills/navigation-core/SKILL.md`
- `skills/offline-pack-registry/SKILL.md`
- `skills/qa-audit/SKILL.md`

Do not use `maplibre-integration` or `gpx-track-engine` yet except to understand future boundaries.

## Use subagents

Before implementation, delegate independent read/review work:

1. UI/UX subagent: propose screen layout, component hierarchy, and design tokens.
2. Architecture subagent: propose repo structure, dependency choices, and boundary rules.
3. Data/legal subagent: review data/legal docs and list constraints that affect the UI.
4. QA subagent: draft acceptance tests/checklist.

Wait for those summaries, then implement the best combined plan.

## Build target

Create a repo scaffold that can become production-quality:

```text
apps/mobile
packages/core
packages/ui
packages/offline-packs
packages/gpx
tools/gis-pipeline
docs
skills
```

Then implement `apps/mobile` as a React Native + TypeScript app shell with mock data.

Acceptable early approach:

- Expo Dev Client / prebuild is okay if it keeps setup simple.
- Keep the code structured so MapLibre/native modules can be added later.
- If you choose a different React Native setup, explain why before implementing.

## UI shell requirements

Implement these tabs/screens:

1. Map
2. Packs
3. Plan
4. Crew
5. SOS

Implement reusable UI pieces:

- App shell / navigation
- Theme tokens
- Status chips
- Field cards
- Bottom-sheet-like panels or native equivalent
- Big ride action buttons
- Mock map component
- Pack cards
- Route audit cards
- Crew status cards
- SOS coordinate/rescue packet card

Mock states to include:

- GPS good/poor
- Offline pack installed/stale/missing
- Route audit required/ready
- Recording idle/active/paused
- Crew member live/stale/offline
- SOS/rescue packet ready

## Domain/model requirements

Create pure TypeScript domain models and mock services for:

- `AdvRoute`
- `RideSessionState`
- `OfflinePackManifest`
- `RouteCoverageResult`
- `CrewMemberStatus`
- `RescuePacket`

Add small unit tests for pure functions if the scaffold supports it.

## Hard constraints

- No real GPS.
- No real MapLibre.
- No real network calls.
- No map tile downloads.
- No API keys.
- No scraping.
- Do not overbuild backend/auth.
- Do not hide unknown legal/source states.

## Done when

- The project has a clean scaffold.
- The mobile app shell runs locally or has clear run instructions.
- All five screens exist and are navigable.
- Mock data shows realistic ADV/offline/navigation states.
- TypeScript passes.
- Tests pass if created.
- README explains setup/run/test.
- You provide a final report with:
  - files changed
  - commands run
  - how to run it
  - tests/typecheck results
  - screenshots or screenshot instructions
  - what you intentionally deferred
  - risks and next recommended stage

## Important

This is a real product foundation. Prioritize clear architecture, maintainable code, and field-safe UI over flashy visuals.
