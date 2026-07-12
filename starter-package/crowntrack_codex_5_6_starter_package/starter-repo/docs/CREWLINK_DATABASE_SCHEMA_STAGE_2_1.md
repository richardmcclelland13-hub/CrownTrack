# CrewLink database schema - Stage 2.1

`packages/crewlink/src/migrations.ts` is the sole canonical schema owner. The Expo adapter in `apps/mobile/src/crew/repository.ts` implements the shared `CrewRepository` contract and runs that plan before any repository operation.

## Versioning and startup

- Current schema version: 3, stored in `PRAGMA user_version`.
- Migration 1 creates peers, groups, memberships, policies, positions, latest-position projection, deduplication, outbox, delivery observations, acknowledgements, transport state, and migration log.
- Migration 2 adds local diagnostic metadata. Migration 3 adds peer identity to deduplication metadata so peer revocation can remove it.
- Foreign keys are enabled per connection. WAL is requested before migrations and falls back to SQLite's normal journal mode if unsupported.
- Each migration runs in one exclusive transaction. The migration log is parameterized and the version is updated only in that transaction.
- A known Stage 2 snapshot-only v1 shape is identified by the `crew_group.payload` column. Before its noncanonical tables are replaced, its snapshot is committed to a durable `crew_legacy_bridge_backup` record. The backup remains through canonical migrations and idempotent restoration, then is deleted in the same restoration transaction. Interruption therefore preserves the bridge record without retaining legacy data after success. Recoverable group, peer, policy, and transport data is bridged into canonical rows. Opaque queued snapshot counts cannot safely be re-created as location messages and are not replayed.

## Data lifecycle

- Expired positions, deduplication IDs, acknowledgements, and outbox items are pruned at startup and through `pruneExpired`.
- Deleting a group cascades group-scoped positions, observations, deduplication rows, acknowledgements, memberships, and outbox entries. Policies remove the deleted group from their scope.
- Deleting a peer's group data removes membership, positions, latest projection, deduplication, delivery observations, and matching acknowledgements. Complete local deletion clears every locally controlled CrewLink table while retaining the database schema.

## Boundaries

The adapter stores opaque validated envelopes as JSON through parameterized statements. It does not log rows, coordinates, tokens, or secrets. Native migration execution remains unverified until Android/iOS runtime testing is available.
