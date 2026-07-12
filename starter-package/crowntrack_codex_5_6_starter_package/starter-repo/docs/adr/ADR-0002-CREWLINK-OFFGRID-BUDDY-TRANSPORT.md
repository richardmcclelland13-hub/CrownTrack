# ADR-0002: CrewLink off-grid buddy transport

- Status: Accepted for Stage 2 simulation; production trust and native transports deferred
- Date: 2026-07-11

## Decision

GPS position acquisition can work without cellular service. Sharing that position with another rider requires a separate communications transport. A hosted internet server cannot relay data when neither rider has internet connectivity.

CrownTrack will use a transport-independent subsystem named CrewLink:

```text
Location source
  -> versioned location envelope
  -> local consent, outbox, and retention
  -> CrewLink coordinator
      -> cloud relay adapter
      -> nearby peer adapter
      -> external mesh-radio adapter
  -> validation, deduplication, sequence, TTL, and trust checks
  -> local crew state
  -> Map/Crew UI projection
```

The wire envelope does not contain delivery metadata. One envelope may arrive over several transports and is stored once, while delivery observations are recorded separately. Presence comes from the newest accepted remote fix age; local GPS and transport connectivity do not make a buddy live.

## Stage 2 implementation

- Strict runtime-validated TypeScript protocol and ACK union.
- App-generated opaque device and stream identifiers; no hardware ID.
- Local repository interface and in-memory implementation for tests/web.
- Expo SQLite native adapter and forward-only migration plan.
- Deterministic mock cloud, nearby, and mesh-radio transports.
- Loopback local WebSocket relay with a development token, limits, and no persistence.

## Consequences

- Cloud relay is unavailable without internet.
- Nearby phone transport has variable foreground/background behavior and no promised range.
- External radio requires hardware and field validation; pairing is not connectivity.
- CrewLink is not satellite communication or an emergency-service contact path.
- Stage 2 does not claim cryptographic peer authentication or end-to-end encryption. Production messages must later be signed and group-encrypted above every transport.

## Future evidence

Evaluate Google Nearby Connections for the first cross-platform phone-to-phone spike and Meshtastic for the first external-radio spike. Physical Android/iPhone interoperability, background, process-death, terrain, congestion, and hardware tests are required before product support or range language.
