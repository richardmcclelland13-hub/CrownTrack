# Stage 2.1 QA report

Status: needs fixes because native Android runtime validation is unavailable.

## Passing automated checks

- TypeScript typecheck.
- ESLint.
- 28 domain, protocol, migration, repository-contract, retention, deletion, restart-serialization, simulator, and coordinator tests.
- 9 relay tests.
- Android/Hermes export.
- Expo Doctor (18/18) and Expo dependency compatibility check.

## Persistence evidence

The shared migration runner covers empty schema upgrade, idempotent startup, interrupted migration rollback, invalid schema version rejection, and legacy-schema detection. The repository contract covers peers, groups, membership, policy, queue, inbound deduplication, acknowledgements, transport state, peer deletion, complete deletion, and diagnostics. Serialized in-memory state proves repository semantics survive a restart without React state; it is not native SQLite runtime proof.

## Blocking gaps

- No Android SDK/ADB/emulator/device/JDK 17, so no native SQLite migration or restart/deletion validation.
- No iOS build environment.
- Native system text scaling, rotation, keyboard, system-bar, and back-button behavior remain unverified.

## Independent security/QA review

The independent review completed. It initially found a legacy-bridge interruption risk and incomplete peer-metadata deletion. The implementation now creates a durable bridge backup before legacy table replacement, deletes that backup atomically after successful restoration, and clears position plus deduplication message IDs when revoking a peer. The reviewer follow-up passed both remediations with no remaining issue.
