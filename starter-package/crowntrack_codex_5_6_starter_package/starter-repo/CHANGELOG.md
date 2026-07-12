# Changelog

## Unreleased - Stage 2.1: Native persistence and QA closure

- Consolidated CrewLink schema ownership into the shared repository contract and versioned migration plan.
- Added a deterministic migration runner, legacy Stage 2 snapshot bridge, canonical Expo SQLite adapter, diagnostics, retention pruning, and development reset helper.
- Added migration, rollback, invalid-schema, repository-contract, serialized-restart, retention, consent-scope, and deletion tests.
- Completed browser viewport evidence at 360x800, 390x844, 412x915, and 768x1024.
- Documented Android runtime blockers, iOS parity boundaries, data-at-rest risk, and the deferred Expo SDK migration plan.

## Unreleased — Stage 2: Local-first CrewLink foundation

- Added strict CrewLink location and acknowledgement protocol contracts.
- Added local-first repository and migration boundaries with an in-memory test implementation.
- Added cloud, nearby, and mesh-radio simulators plus bounded outbox retry.
- Added a loopback-only local development relay.
- Added explicit location-sharing consent, transport, freshness, queue, revocation, and deletion UI states.
- Added Stage 2 architecture, platform, dependency, security, visual QA, and implementation documentation.
- Added project-local storage, transport, security, visual QA, and dependency-audit skills.

No real GPS, background service, Bluetooth, nearby radio, Meshtastic, MapLibre, production authentication, or production deployment was added.
