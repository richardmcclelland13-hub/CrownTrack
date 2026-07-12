---
name: location-sharing-security
description: Threat-model and audit CrownTrack private location sharing, consent, revocation, pairing, replay protection, trust, retention, emergency overrides, logging, lost-device behavior, relay exposure, and deletion. Use whenever CrewLink identity, transport, storage, or UI changes expose rider location.
---

# Location-sharing security

1. Default sharing off and scope consent to a ride group, precision, and retention period.
2. Check consent at message creation, enqueue, and retry; revocation must stop new sends immediately.
3. Reject impossible, malformed, expired, duplicate, wrong-group, future-skewed, and sequence-regressing messages.
4. Keep exact coordinates, tokens, device IDs, and payloads out of logs, screenshots, analytics, and errors.
5. Treat display names and radio identifiers as untrusted. Do not claim authentication until verified keys and signatures exist.
6. Document that TLS/radio encryption is not application end-to-end encryption.
7. Keep emergency override false unless a deliberate, time-limited product flow is approved.
8. Bound retention and verify local deletion; disclose that recipients and backups may retain copies.
9. Bind the development relay to loopback by default, require a token, validate size/rate/schema, and persist nothing.
10. State residual risks: delivery is not guaranteed, a fresh fix may be wrong, and CrewLink is not emergency-service or satellite communication.

Completion requires a written threat model and tests for consent-off, revocation, replay, stale queues, deletion, and relay abuse.
