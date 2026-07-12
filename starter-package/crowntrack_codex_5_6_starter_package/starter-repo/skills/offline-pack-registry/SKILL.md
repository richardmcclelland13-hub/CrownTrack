---
name: offline-pack-registry
description: Offline map pack registry and source-aware manifest logic. Use for pack manifests, install states, attribution, source/licence warnings, route coverage audits, and pack health reports.
---


# offline-pack-registry

## Purpose

Build CrownTrack's offline pack model before real MapLibre/tile integration.

## Workflow

1. Keep it pure TypeScript first.
2. Model pack manifests, sources, layers, attribution, health, and install states.
3. Add warnings for stale, corrupt, missing, unknown, and licence-risk states.
4. Add route coverage checks against mock pack bounds/IDs.
5. Do not download real maps or call network APIs.

## Completion checklist

- Pack states are explicit.
- Source/licence warnings are not hidden.
- Route coverage can show missing/stale packs.
- Tests cover state transitions and audits.
