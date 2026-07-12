# ADR-0003: Location data at rest

- Status: Accepted for Stage 2.1 development storage
- Date: 2026-07-12

## Decision

CrownTrack stores CrewLink development data in the normal application sandbox through Expo SQLite. This is not described as encrypted storage and is not end-to-end encryption.

## Rationale

The sandbox plus OS lock screen is an appropriate short-term boundary for a simulator foundation. Enabling database encryption now would require platform key generation, Android Keystore/iOS Keychain wrapping, key rotation, backup behavior, recovery, device replacement, diagnostics policy, and deletion semantics that do not yet exist.

## Current controls

- Sharing defaults off; consent is group-, precision-, and retention-scoped.
- Location envelopes are validated before storage; stale data is pruned.
- Normal logs, migration errors, diagnostics, screenshots, and UI status avoid exact coordinates, payloads, tokens, and secrets.
- Explicit deletion removes locally controlled CrewLink rows. It cannot erase peer copies, screenshots, exports, backups, or data on a compromised device.

## Residual risk and future path

A rooted, unlocked, backed-up, or compromised phone can expose sandbox data. A later security stage should design authenticated pairing, platform key storage, encrypted database/key wrapping, rotation, backup exclusion/data-protection rules, lost-device recovery, and production diagnostics redaction before real rider location is enabled.
