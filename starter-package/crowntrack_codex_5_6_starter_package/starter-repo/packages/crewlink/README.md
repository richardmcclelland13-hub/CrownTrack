# @crowntrack/crewlink

Pure TypeScript CrewLink entities, repository ports, local-first in-memory storage, migration SQL, simulated development transports, bounded retry, and coordination.

## Privacy and security boundary

Sharing defaults off and is scoped to explicit ride groups, precision, and retention. Consent is checked when a location is created, enqueued, and retried; revocation purges unsent locations. Emergency override is intentionally unsupported. Exact locations and device identifiers must not be logged.

The exported SQLite migrations are adapter-neutral SQL: a native adapter must execute each migration transactionally, bind all application values, prune retained rows after startup/writes, and keep native SQLite imports outside this package. SQLite is not encryption. Device compromise and backups may expose local data. Local deletion cannot recall recipient or backup copies.

Transports are untrusted delivery pipes. Mock transports are development-only and make no range, background-delivery, authentication, or encryption claim. Fresh data may still be inaccurate, delivery is not guaranteed, and CrewLink is not emergency-service or satellite communication. Android/iOS nearby, background-location, key verification, application end-to-end encryption, and real radio adapters remain native integration work.

## Threat model summary

- Malformed, impossible, expired, future-skewed, wrong-group, duplicate, and sequence-regressing messages are rejected or prevented from replacing newer state.
- Cross-transport duplicates retain delivery observations but only one location/history record.
- Retention collections and retries are bounded; group/all-data deletion is explicit and testable.
- Display names, device IDs, radio identifiers, and transport metadata are untrusted. `publicKeyId` is metadata, not proof of identity, until signatures and verified key pairing exist.
- A production relay must validate schema/size/rate, authenticate group membership, bind securely, avoid payload logging, and persist only under an approved retention model. This package does not provide a relay.
