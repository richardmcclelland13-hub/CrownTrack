# Changelog

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
