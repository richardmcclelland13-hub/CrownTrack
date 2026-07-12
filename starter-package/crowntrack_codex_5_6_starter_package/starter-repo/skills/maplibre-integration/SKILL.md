---
name: maplibre-integration
description: MapLibre integration planning and implementation. Use only when adding real map rendering/offline packs after UI shell and registry contracts are stable.
---


# maplibre-integration

## Purpose

Add real map rendering only after the UI shell, navigation core, and offline pack registry are stable.

## Rules

- Do not use this skill in Stage 0/1.
- First MapLibre task must be a spike, not full production integration.
- Keep map rendering behind an adapter so mock map can still be used in tests.
- Do not download public OSM tiles for offline use.

## Completion checklist for future use

- Map adapter is isolated.
- Offline pack registry remains source of truth for pack state.
- Attribution is visible.
- Failure states are handled.
