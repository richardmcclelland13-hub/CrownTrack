# CrewLink database schema — Stage 3A

Stage 3A advances the forward-only schema to version 5.

## Migration 4: secure device identity and pairing

- `crew_identity`: singleton public identity row; device ID, display name, public key, fingerprint, creation time.
- `crew_trusted_peer`: public peer identity, trust time, optional revocation time.
- `crew_pairing_invitation`: invitation ID, issuer device ID, expiry, cancellation time, use time.
- `crew_pairing_invitation_expiry_idx`: expiry lookup.

## Migration 5: staged confirmation boundary

- `status`: staged, used, or cancelled lifecycle value.
- `payload_json`: complete invitation only while confirmation is pending.

Confirmation writes the trusted peer, marks the invitation used, and nulls `payload_json` in one exclusive transaction. Cancellation and expiry pruning also null the payload. Complete identity reset deletes all three tables' rows. No column stores a private seed or private key.

Migration tests cover v4-to-v5 restart idempotence. Android database truth verified schema v5, no private-seed columns, persistence, revocation, and empty tables after deletion.
