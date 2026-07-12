---
name: gpx-track-engine
description: GPX import/export and track engine work. Use for parsing/exporting GPX, route conversion, recorded track persistence, and rescue GPX generation.
---


# gpx-track-engine

## Purpose

Implement GPX import/export after core models are stable.

## Rules

- Do not use this skill in Stage 0/1 except to understand boundaries.
- Keep parser/exporter deterministic and tested.
- Validate malformed GPX gracefully.
- Preserve original GPX metadata where practical.

## Completion checklist

- Import creates typed routes/tracks/waypoints.
- Export produces valid GPX.
- Tests include real sample strings and malformed cases.
