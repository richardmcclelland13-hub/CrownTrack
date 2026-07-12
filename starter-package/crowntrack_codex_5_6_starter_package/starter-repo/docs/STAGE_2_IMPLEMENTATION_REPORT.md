# Stage 2 implementation report

Status: implemented; needs fixes before milestone acceptance.

## Delivered

- Transport-neutral CrewLink wire schemas, validation, ACKs, TTL/future-skew checks, deduplication, sequencing, freshness, reduced precision, retention, and aggregation.
- Repository port, in-memory development repository, forward-only SQLite migrations, coordinator, bounded retry, outbox, consent/revocation/deletion, and cloud/nearby/external-mesh simulators.
- Loopback-only, in-memory WebSocket development relay with a namespaced development token, room isolation, strict validation, payload/client/rate limits, heartbeat, and payload-free logs.
- CrewLink simulator UI with group-scoped explicit consent, precision/retention choices, transport states, queue visibility, live/recent/stale/unknown freshness, peer revocation, and two-step local deletion.
- Map buddy state, safe-area support, a local hazard draft, and explicit mock/SOS limitations.
- Five validated project-local workflows for storage, transport, location security, visual QA, and dependency audit.
- Architecture, platform-boundary, data-model, dependency, security/privacy, QA, and visual-QA documentation.

## Architecture outcome

The protocol and repository are independent of transport and UI. Cloud, nearby-phone, and external-radio paths implement the same development transport contract. Position freshness derives from the accepted remote fix age, never transport connectivity. Local persistence is behind a migration-capable boundary; the Expo SQLite adapter currently stores a development snapshot and has not been native-runtime validated. Its mobile snapshot migration and the normalized CrewLink domain migration are still separate definitions and must be consolidated before the database becomes a production source of truth.

## Non-goals preserved

No real GPS, background location, MapLibre, map tiles, nearby/Bluetooth implementation, Meshtastic connection, production account/authentication, production relay deployment, satellite claim, or guaranteed range was added.

## Acceptance blockers

- Complete browser evidence at 390x844, 412x915, and 768x1024 after the responsive fix.
- Run Android Gradle/emulator/device validation, including SQLite migration/deletion tests.
- Run iOS Xcode/simulator/device parity and privacy review on macOS.
- Consolidate the mobile snapshot schema and normalized CrewLink migrations into one versioned native repository implementation.
- Obtain the independent final QA review that the usage limit prevented.
- Resolve or formally accept the current dependency advisory set before production work.
- Design authenticated pairing, signatures, end-to-end encryption, membership epochs, key rotation, and secure local key/database handling before any real location sharing.

See `docs/audits/STAGE_2_QA_REPORT.md`, `docs/audits/STAGE_2_VISUAL_QA.md`, and `docs/audits/STAGE_2_SECURITY_PRIVACY_REVIEW.md`.
