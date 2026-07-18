# CrewLink Stage 3B threat model

## Controls

- Explicit identity creation; private seed isolated in SecureStore.
- Canonical signature verification plus trusted-key, group, membership, epoch, tombstone, replay, TTL, future-skew, and stream checks before accepted persistence.
- Trust is distinct from authorization; pairing alone does not allow sharing.
- Consent defaults off and is rechecked at creation and retry. Policy change, consent revocation, sharing disable, or authorization loss removes unauthorized queued updates.
- Inbound buddy direction is local: accepted location and observation are persisted by the local endpoint before display.
- Relay defaults are loopback/token/size/rate/schema safety and no persistence.
- UI/evidence exclude exact coordinates, raw invitations, identifiers, keys, signatures, envelopes, and private material.

## Residual risk

Messages are signed, not encrypted. A signed location can still be inaccurate; delivery is not guaranteed. Simulated cloud/nearby/mesh and the in-process rider do not prove physical radio or device behavior. Local deletion cannot erase recipient or backup copies. CrewLink is not emergency or satellite communication.
