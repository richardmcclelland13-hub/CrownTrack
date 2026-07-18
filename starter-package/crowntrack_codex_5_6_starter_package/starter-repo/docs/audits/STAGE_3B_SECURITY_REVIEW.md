# Stage 3B security/privacy review

- Date: 2026-07-16
- Result: No new code-level acceptance blocker found; Stage acceptance remains blocked by missing native evidence.

Reviewed canonical domain/signatures, SecureStore isolation, trust versus membership, epochs/tombstones, replay/sequence/TTL/future-skew, repository authority, retry consent, inbound buddy direction, relay bounds, deletion disclosure, and redaction. The corrected flow stores and presents the local endpoint’s verified inbound rider position; local outbound ACK success cannot create the buddy marker. Tests cover forged ACK, tamper, delayed epoch, duplicate, consent retry race, tombstone/reconstruction, and safe snapshots.

Residual risks are intentionally documented: no encryption, physical-truth guarantee, delivery guarantee, real transport, or recipient/backup deletion. Dependency advisories are recorded separately.
