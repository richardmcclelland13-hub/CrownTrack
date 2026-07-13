# Stage 3A implementation report

- Date: 2026-07-12
- Status: Accepted

## Delivered

- Portable Ed25519 identity package with canonical pairing transcripts.
- Expo Crypto secure randomness and Expo SecureStore private-seed adapter.
- SQLite migrations v4/v5 for public identity, trusted peers, invitation replay metadata, and staged payloads.
- Explicit create/reset/missing-key lifecycle with no startup generation.
- Signed offline invitations, post-verification comparison code, explicit confirmation, cancellation, replay/expiry enforcement, key-change state, persistent revocation, and complete deletion.
- Crew UI for device status, share/copy, concealed import, pending confirmation, trusted/revoked peers, and clearly labelled development scenarios.
- Focused state-transition, migration-restart, deletion, crypto, protocol, repository, and relay tests.

## Validation

- Typecheck and lint passed.
- Repository tests: 38/38.
- Relay tests: 9/9.
- Expo Doctor: 18/18.
- Expo dependency alignment: up to date.
- Android export: passed, 633 modules and 2.15 MB Hermes bundle.
- Android native acceptance: passed on `emulator-5554`.
- iOS: static parity review only; runtime unverified.

## Boundaries

Pairing authenticates identity and invitation integrity. It does not encrypt location content. Signed CrewLink location messages and verified ride-group membership are deferred to Stage 3B. Copy/paste and the second-rider simulator are development flows. No GPS, background tracking, networking, Bluetooth, Nearby, Meshtastic, MapLibre, production accounts, or production cloud authentication was added.
