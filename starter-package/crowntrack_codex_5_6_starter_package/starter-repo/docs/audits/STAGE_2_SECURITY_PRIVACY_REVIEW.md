# Stage 2 security and privacy review

## Result

Needs audit. Stage 2 implements defensive local/simulated controls but is not production-secure location sharing.

## Implemented requirements

- Sharing defaults off and is scoped to group, precision, and bounded retention.
- Consent is checked before creation, queueing, and retry; disabling purges unsent locations.
- Runtime validation rejects malformed coordinates/timestamps, expiry, wrong group, duplicates, and sequence regression.
- Presence derives from accepted remote-fix age and shows text age/source.
- Cross-transport copies store one position with delivery observations.
- Relay binds to loopback, requires a development token, limits payload/rate/clients, persists nothing, and does not log coordinates or payloads.
- Emergency override defaults false.
- Local deletion is explicit and states that remote copies cannot be recalled.

## Deferred production controls

- Device-backed identity keys and verified pairing.
- Signed envelopes, acknowledgements, membership epochs, and revocation tombstones.
- Application-layer end-to-end encryption and group-key rotation.
- Encrypted database/key management and verified backup exclusions.
- Remote device revocation, lost-phone recovery, and secure device replacement.
- Native redaction review across OS/radio/crash tooling.

Display names, relay connection IDs, radio IDs, and app-generated device IDs are not authenticated identities. TLS or radio encryption alone is not application end-to-end encryption.

## Residual risk

CrewLink cannot guarantee delivery, prove rider safety, instantly revoke an offline device, erase copies held by peers/backups, or replace satellite/emergency-service communication. A fresh authenticated fix could still be physically wrong; Stage 2 fixes are simulated and unauthenticated.
