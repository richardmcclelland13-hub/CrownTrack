# Codex Prompt — Stage 3A Offline Pack Registry

You are Codex acting as senior mobile/data engineer. Build the **offline map-pack registry** as pure TypeScript modules using mock data. This is the next stage after the UI shell and navigation core.

## Read first
- `FRESH_CHAT_BRIEF.md`
- `docs/PROJECT_STATE_PHASE6.md`
- `docs/MAP_PACK_PIPELINE_SPEC_PHASE6.md`
- `docs/MOBILE_OFFLINE_PACK_MANAGER_SPEC_PHASE6.md`
- `docs/DATA_INGEST_LEGAL_SOURCE_MATRIX_PHASE6.md`
- `docs/QA_GATES_PHASE6.md`
- `codex/AGENTS.md`

## Goal
Create the local data-contract and state-management foundation for offline packs.

## Required TypeScript models
Create or update models for:

```ts
OfflinePackManifest
OfflinePackInstallState
PackLayer
PackSource
AttributionBundle
PackQaSummary
PackHealthReport
RouteCoverageResult
SourceConfidence
LegalStatus
```

## Required logic
Implement pure functions/services for:

1. Validate a pack manifest.
2. Compute pack health.
3. Transition install state safely.
4. Check whether a route bbox is covered by installed packs.
5. Check whether required route layers are present.
6. Generate source/licence warnings.
7. Mark pack stale/corrupt/ready.
8. Prevent deleting active navigation pack.

## Required mock data
Add mock manifests:

- `ab-ghost-waiparous-v0.4` installed/ready.
- `ab-mclean-creek-v0.2` update available.
- `ab-bighorn-v0.1` not installed.
- One intentionally invalid/corrupt fixture for tests.

## UI integration
If UI shell exists, wire these models into the Packs screen and Route Audit panel using mock state. Keep the map itself mocked.

## Tests
Add unit tests for:

- Valid manifest passes.
- Missing source/licence fails audit.
- Route outside bbox fails coverage.
- Missing required layer fails coverage.
- Cannot delete active pack.
- Checksum mismatch marks corrupt/failure.

## Do not
- Do not integrate real MapLibre yet.
- Do not download real map files.
- Do not use network calls.
- Do not fetch Alberta data yet.
- Do not scrape any tile server.

## Output
Return:

- File tree of changed files.
- Commands run.
- Test results.
- Any assumptions.
- Any blockers.
- Next recommended stage.
