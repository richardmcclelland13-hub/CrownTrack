# QA Gates — Phase 6

## Stage 3A offline registry QA
- TypeScript strict mode passes.
- Unit tests cover install state transitions.
- Route coverage checks pass/fail correctly.
- Pack manifest validation catches missing bbox, layers, sources, checksums.
- Source audit warns on missing licence or attribution.
- No real network calls.
- No real MapLibre dependency yet unless Stage 3B.

## Stage 3B MapLibre spike QA
- App launches on Android and iOS simulator/device.
- Map view mounts and unmounts cleanly.
- No crash on tab switching.
- Offline/local mock source strategy documented.
- Platform limitations documented.

## Stage 3C GIS scaffold QA
- Raw source folder is immutable by convention.
- Every source has metadata JSON.
- Pipeline can generate a manifest from mock data.
- No real data scraping.
- Licence audit blocks unknown sources.

## Product QA
- User can see pack readiness without reading docs.
- Warnings are clear but not panic-inducing.
- Controls stay 48dp+ target size.
- Offline state is visible.
- Legal/source confidence is visible.
