# ADR-0007: Signed CrewLink envelopes

## Decision

Use strict signed-v2 envelopes with canonical signing and the stable Stage 3B domain. Keep relay/transport delivery untrusted and persist accepted state only through repository commands.

## Consequences

Endpoints can establish origin/integrity and reject malformed, replayed, expired, future-skewed, wrong-group, unauthorized, or stale-epoch traffic. This does not add encryption, delivery guarantees, or physical-position proof.
