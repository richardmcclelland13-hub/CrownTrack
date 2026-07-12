# Builder Console Spec — Phase 6

## Purpose
CrownTrack needs an internal builder/admin surface eventually, even if it starts as CLI scripts. This is where packs are created, audited, and published.

## MVP builder features

- List source snapshots.
- Add source metadata.
- Run source licence audit.
- Normalize source data.
- Generate pack manifest.
- Build vector tile artifact placeholder.
- Run QA gates.
- Publish draft pack to local folder.

## Console stages

1. Source intake
2. Licence audit
3. Geometry normalization
4. Layer schema validation
5. Tile build
6. Style validation
7. Manifest generation
8. QA report
9. Publish

## Recommended initial form
Start as command-line tools under `/tools/gis` before building a web dashboard.

## Do not
- Do not embed real API credentials.
- Do not download proprietary datasets.
- Do not publish packs missing attribution.
- Do not let user GPX become official legal data.
