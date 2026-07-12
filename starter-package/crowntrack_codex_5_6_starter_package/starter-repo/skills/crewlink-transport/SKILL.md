---
name: crewlink-transport
description: Design, implement, or review CrownTrack CrewLink protocol, transport ports, coordinator logic, simulators, relay framing, retries, deduplication, freshness, and acknowledgements. Use for cloud, nearby, mesh-radio, or simulated buddy-location delivery work.
---

# CrewLink transport

1. Separate location acquisition from communications transport.
2. Keep the wire protocol strict, versioned, runtime-validated, and platform-neutral.
3. Validate coordinates, timestamps, group, TTL, message ID, stream, and sequence before persistence.
4. Treat transports as untrusted delivery pipes. Record transport metadata outside the immutable envelope.
5. Deduplicate the same message across transports while preserving delivery observations.
6. Derive presence from the newest accepted remote fix age; local GPS or link connectivity alone never means a buddy is live.
7. Require explicit sharing consent before creation, enqueue, and retry.
8. Use bounded, event-driven retry with persisted next-attempt state. Avoid uncontrolled timers.
9. Keep cloud, nearby, and external-radio adapters independent. Do not claim range or background reliability.
10. Label simulators and the local relay as development-only.

Completion requires failure-mode tests for expired, duplicate, out-of-order, wrong-group, disconnected, queued, reconnected, and revoked states.
