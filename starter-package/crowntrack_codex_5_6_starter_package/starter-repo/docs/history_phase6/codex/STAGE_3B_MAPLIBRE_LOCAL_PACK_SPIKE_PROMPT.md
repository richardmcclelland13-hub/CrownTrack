# Codex Prompt — Stage 3B MapLibre Local Pack Spike

Run this only after Stage 3A passes.

## Goal
Add a minimal MapLibre screen/spike using a local/mock style source. Prove lifecycle and rendering, not real Alberta data.

## Tasks
- Add MapLibre dependency appropriate for the current React Native setup.
- Create isolated `MapSpikeScreen` behind a feature flag/dev route.
- Use a local style JSON or simple style.
- Do not replace the mock product UI yet.
- Document platform setup steps.
- Document any Expo/bare React Native constraints.

## Acceptance
- App launches.
- Map screen mounts/unmounts without crash.
- Tab navigation still works.
- No real tile scraping.
- No production credentials.
