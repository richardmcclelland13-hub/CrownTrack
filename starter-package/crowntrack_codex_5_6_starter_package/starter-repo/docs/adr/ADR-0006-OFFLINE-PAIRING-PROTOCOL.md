# ADR-0006: Offline pairing protocol

- Status: Accepted for Stage 3A
- Date: 2026-07-12

## Decision

Use a signed, ten-minute offline invitation containing protocol version, invitation ID, issue/expiry times, nonce, and issuer public identity. Sign a canonical UTF-8 payload with Ed25519. After successful signature and expiry checks, derive a six-digit comparison code from a canonical transcript containing both identities and the invitation.

Validation stages the invitation but creates no trust and does not consume it. The code appears only after verification. **Confirm pairing** atomically stores the trusted peer, marks the invitation used, and removes the complete staged payload. Cancel marks the invitation cancelled and removes its payload.

## Replay, replacement, and revocation

Used and cancelled invitation IDs cannot be staged again. Expired staged payloads are cleared during the next staging operation. A known device with an unexpected public key becomes `key_changed`. Revoked peers remain revoked after restart, and invitations from that identity cannot restore trust.

## Non-goals

Copy/paste and the local second-rider simulator are development flows, not production transport. Pairing authenticates identity and invitation integrity; it does not encrypt location content. Signed CrewLink messages and verified ride-group membership are Stage 3B.
