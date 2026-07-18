# ADR-0008: Ride-group membership epochs

## Decision

Use one immutable owner authority, one deterministic membership stream, epoch 1 group creation, and exactly-one-step grant/revocation transitions. Persist terminal revocation tombstones per identity.

## Consequences

Pairing remains separate from authorization, delayed old-epoch messages are rejected, and a tombstoned identity cannot be regranted during Stage 3B. Ownership transfer and self-revocation are intentionally unsupported.
