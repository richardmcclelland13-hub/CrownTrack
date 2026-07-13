# CrewLink offline pairing protocol

## Invitation

Version 1 invitations carry an opaque invitation ID, timestamps, a nonce, the issuer's public identity, and an Ed25519 signature. The canonical encoder fixes field order and UTF-8 representation before signing or verification.

## Receiver flow

1. Parse an untrusted copy/paste value.
2. Validate shape, expiry, future skew, and signature.
3. Reject used, cancelled, revoked-identity, or unexpected-key cases.
4. Persist the complete invitation only as a staged record.
5. Show the authentication comparison code.
6. Wait for explicit rider confirmation.
7. In one SQLite transaction, store trust, consume the invitation, and clear the staged payload.

Cancel creates no trust. Restart while staged creates no trust. Terminal invitation records retain only replay metadata. Complete deletion clears all pairing records.

The code must be compared with the other rider using an independent human channel. A matching code authenticates the transcript; it is not an encryption key. Pairing does not hide location data from relays or transports.
