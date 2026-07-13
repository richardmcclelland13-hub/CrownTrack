# ADR-0005: Device identity and key storage

- Status: Accepted for Stage 3A
- Date: 2026-07-12

## Decision

Each installation creates an Ed25519 identity only after the rider presses **Create identity**. Expo Crypto supplies 32 bytes of secure randomness. `@noble/curves` derives the public key and signs data. The private seed is stored under a versioned Expo SecureStore key with `WHEN_UNLOCKED_THIS_DEVICE_ONLY`. SQLite stores only the device ID, display name, public key, fingerprint, and creation timestamp.

Startup never generates an identity. The four states are `not_created`, `ready`, `missing_private_key`, and `reset_required`. A missing or mismatched SecureStore value cannot silently replace a public identity.

## Deletion and failure behavior

Reset deletes SecureStore first, then transactionally clears identity, trust, and pairing tables. If SQLite cleanup fails after the secure key is removed, the UI reports a retry-required partial reset. Success is shown only after both layers complete. Repeating reset is safe.

## Consequences

SecureStore protects seed material using platform facilities, but a fully compromised unlocked device remains out of scope. Android runtime behavior was verified. iOS compatibility was reviewed statically; iOS runtime is unverified.
