# Next Stage Prompt After UI Shell Exists

Use this only after the initial React Native UI shell exists and has been audited.

Goal: implement pure TypeScript navigation-core logic and connect it to the mock UI.

Read:

- `packages/core` current code
- `data-contracts/TYPESCRIPT_CONTRACTS.md`
- `skills/navigation-core/SKILL.md`
- `skills/qa-audit/SKILL.md`

Build:

- route loaded/audit required/ready/navigating/recording/paused/saved state machine
- mock location sample stream
- route progress helper
- waypoint save helper
- route warning acknowledgment helper
- rescue packet builder from recent samples
- tests for all pure helpers

Do not add real GPS or MapLibre yet.
