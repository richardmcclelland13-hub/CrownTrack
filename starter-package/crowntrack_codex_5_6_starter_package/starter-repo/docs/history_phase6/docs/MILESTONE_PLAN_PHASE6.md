# Milestone Plan — Phase 6+

## Completed design milestones
- UI direction: native-feeling, calm, field-readable, offline-first.
- Major tabs: Map / Packs / Plan / Builder or Crew / SOS.
- Navigation core state: route loaded → audit → ready → navigating → recording → export.

## Current milestone: Stage 3A — Offline Pack Registry
Build pure TypeScript modules for:

- `OfflinePackManifest`
- `OfflinePackInstallState`
- `PackSource`
- `LayerRegistry`
- `AttributionBundle`
- `RouteCoverageResult`
- `SourceConfidence`
- `PackHealthReport`

Acceptance:

- Pack can be installed/mock-installed.
- Pack can be marked stale, ready, corrupt, queued, downloading, verifying.
- Route can be checked against pack bbox and required layer list.
- Source warnings can be generated from metadata.
- UI shell can display these states.

## Stage 3B — MapLibre Local Pack Spike
After Stage 3A passes, create a tiny MapLibre screen using a local mock style/source.

Goal:
- Prove the app can mount MapLibre cleanly on Android/iOS.
- Do not attempt a full Alberta map yet.
- Test lifecycle, permissions, and render stability.

## Stage 3C — GIS Pipeline Scaffold
Create a non-production GIS tooling folder.

Goal:
- No actual Alberta scraping.
- Build CLI skeleton for source download placeholders, raw/source folders, normalization, tile generation, manifest output.
- Add strict licence/source checks.

## Stage 4 — Real GPS Track Recording
Only after map UI and registry are stable.

## Stage 5 — Real Alberta Pack v0.1
One small test area only. Build and install a legal offline pack.
