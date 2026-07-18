# Changelog

## Unreleased — Stage 3B: Signed membership and messages (blocked native acceptance)

- Added strict signed-v2 membership, epoch, tombstone, replay, sequence, TTL, and retry-time authorization handling.
- Corrected the development product flow so local outbound ACK/outbox state is independent from a locally persisted, accepted inbound development-rider position.
- Added runtime-time capture timestamps, safe signed presentation, confirmations, action gates, missing-key/crypto controls, manual pairing cleanup, truthful Map metadata, and expanded adversarial/reconstruction coverage.
- Rehydrated the development harness trust gate from a matching persisted pairing after runtime reconstruction, and exposed the nearby-duplicate action when its handler can establish the simulated transport.
- Windows verification passed with 74 unit tests and 13 relay tests; Android export passed. Direct ADB verified the repaired reciprocal grant, delivery/adversarial, and deletion paths. Acceptance remains blocked pending a completed fresh debug build/install plus the remaining lifecycle, Map/missing-key, and full visual/accessibility matrices.

## Unreleased — Stage 3A: Secure device identity and offline pairing

- Added explicit persistent Ed25519 device identity backed by Expo SecureStore private-seed storage and SQLite public metadata.
- Added signed offline invitations, canonical transcript comparison codes, explicit trust confirmation, cancellation, expiry, replay defense, key-change handling, persistent revocation, and complete deletion.
- Added Crew identity/pairing/trust UI and a clearly labelled local second-rider simulator.
- Added schema migrations v4/v5, focused identity/pairing tests, Android native acceptance evidence, threat model, ADRs, protocol, lifecycle, schema, dependency, security, and platform QA documentation.
- Android runtime was tested; iOS runtime remains unverified.
- Pairing authenticates identity and integrity but does not encrypt location content.

## Unreleased — Stage 2.1/2.2: Native persistence and QA closure

- Consolidated CrewLink schema ownership into the shared repository contract and versioned migration plan.
- Added deterministic migrations, the legacy bridge, canonical Expo SQLite adapter, diagnostics, retention pruning, and native deletion persistence.
- Added migration, rollback, repository, restart, retention, consent-scope, deletion, browser, and Android native evidence.

## Unreleased — Stage 2: Local-first CrewLink foundation

- Added strict CrewLink location/acknowledgement contracts, local-first storage, transport simulators, bounded retry, loopback relay, consent, freshness, queue, revocation, and deletion UI.

No real GPS, background service, Bluetooth, Nearby, Meshtastic, MapLibre, production authentication, end-to-end encryption, or production deployment was added.
