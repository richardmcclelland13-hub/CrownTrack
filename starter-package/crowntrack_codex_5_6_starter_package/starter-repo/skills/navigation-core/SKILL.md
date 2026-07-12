---
name: navigation-core
description: Navigation core and ride lifecycle logic for CrownTrack ADV. Use for route state machines, mock GPS samples, route progress, track recording state, waypoints, and rescue packet helpers.
---


# navigation-core

## Purpose

Build pure TypeScript ride/navigation logic before native GPS or map rendering.

## Workflow

1. Keep this code pure TypeScript.
2. Model ride states explicitly.
3. Add deterministic mock route/location data.
4. Test state transitions and route progress.
5. Keep UI and native APIs out of this package.

## Required concepts

- route loaded
- audit required
- ready
- navigating
- recording
- paused
- saved/exported
- warnings acknowledged
- waypoints created
- rescue packet created

## Completion checklist

- State transitions are explicit.
- Edge cases are handled.
- Tests cover core helpers.
- No native dependencies.
