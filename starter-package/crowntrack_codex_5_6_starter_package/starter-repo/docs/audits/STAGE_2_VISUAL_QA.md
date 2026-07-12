# Stage 2 visual QA

Status: needs fixes because the required viewport matrix is incomplete.

## Completed browser checks

- `360x800`: Map and CrewLink simulator interaction pass. No document-level horizontal overflow (`scrollWidth=360`). Tested all five tab controls, group creation, consent gating, sharing enablement, cloud/nearby/mesh simulator controls, queued outbox, live/recent/stale/unknown labels, peer revocation, two-step local deletion, hazard draft, and SOS separation.
- `390x844`: SOS screen rendered with no document-level horizontal overflow (`scrollWidth=390`). The first screenshot exposed a clipped header badge and an awkward three-column rescue metric. Both were fixed in `apps/mobile/src/screens.tsx` and the DOM was rechecked, but screenshot recapture failed when the in-app browser detached.
- Map safety text explicitly says the map is mock and uses no tiles or GPS.
- SOS text explicitly says the mock build does not contact emergency services.
- Hazard action opens a local, not-shared marker draft and does not route to SOS.

## Missing evidence

- Corrected `390x844` screenshot.
- Required `412x915` and `768x1024` viewport runs.
- Native font-scaling, keyboard, rotation, and screen-reader runs.

The in-app browser stopped attaching after the responsive fix. Per the browser workflow, no unrelated browser backend was substituted. Browser evidence is supplemental and does not establish native behavior.

## Artifacts

- `artifacts/stage-2-visual-qa/360x800-map.png`
- `artifacts/stage-2-visual-qa/360x800-crew-transports.png`
- `artifacts/stage-2-visual-qa/390x844-sos.png` (pre-fix defect evidence)
- `artifacts/expo-web.stdout.log`
- `artifacts/expo-web.stderr.log`
