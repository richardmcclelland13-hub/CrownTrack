# Codex Workflow

## Use Codex like a team, not a magic button

For major stages, Codex should:

1. Read this package.
2. Produce a short plan.
3. Use relevant skills.
4. Use subagents for parallel read/review tasks.
5. Implement only the requested milestone.
6. Run tests/typechecks.
7. Self-review and report gaps.

## Subagents to use

### UI/UX subagent

Reads design docs and proposes native screen/component hierarchy.

### Architecture subagent

Checks repo structure, dependencies, boundaries, and test strategy.

### Data/legal subagent

Reviews offline pack/source/legal guardrails and flags risky assumptions.

### QA subagent

Builds acceptance checklist and reviews the final diff.

## Skills to use

- `$native-mobile-ui` for UI shell work
- `$navigation-core` for ride state/navigation logic
- `$offline-pack-registry` for offline packs and manifests
- `$maplibre-integration` only when real map rendering begins
- `$gpx-track-engine` only when GPX import/export begins
- `$source-licence-auditor` for data-source decisions
- `$qa-audit` before finishing any task
