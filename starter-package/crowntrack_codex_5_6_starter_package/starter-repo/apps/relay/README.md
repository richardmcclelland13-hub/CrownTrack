# CrownTrack local development relay

This is a loopback-only, in-memory WebSocket relay for CrewLink development. It stores no data and has no deployment configuration.

> **Warning:** authentication is development-only. `CREWLINK_DEV_TOKEN` is a shared local gate, not production authentication or authorization. Do not expose this service to a LAN or the public internet and do not use real safety-critical location data.

## Run

Set a random token of at least 16 characters, then run `npm run start` from this directory. The relay binds to `127.0.0.1:8787` by default.

The first client frame must be:

```json
{"type":"join","token":"your-development-token","rideGroupId":"ride-1","peerId":"rider-a"}
```

After `{ "type": "joined", "rideGroupId": "ride-1" }`, send a strict signed-v2 `SignedCrewLinkEnvelope` (`location`, `ack`, `membership_grant`, or `membership_revocation`) from `@crowntrack/crew-protocol`. The relay accepts only structural framing: its `groupId` must match the joined room and its `senderDeviceId` must match the joined `peerId`. It forwards the parsed envelope unchanged to the other clients in that room. It deliberately does not verify signatures or decide membership authorization; receiving CrewLink endpoints must do both.

Configuration: `CREWLINK_RELAY_HOST`, `CREWLINK_RELAY_PORT`, `CREWLINK_DEV_TOKEN`, `CREWLINK_RELAY_MAX_PAYLOAD_BYTES`, `CREWLINK_RELAY_MAX_CLIENTS`, `CREWLINK_RELAY_RATE_LIMIT_MESSAGES`, `CREWLINK_RELAY_RATE_LIMIT_WINDOW_MS`, `CREWLINK_RELAY_JOIN_TIMEOUT_MS`, and `CREWLINK_RELAY_HEARTBEAT_INTERVAL_MS`. `CREWLINK_RELAY_ALLOW_LEGACY_V1` is an explicit, exact `true`/`false` development migration switch and defaults to `false`; do not enable it for signed-v2 testing. Legacy `RELAY_*` names remain accepted for local compatibility. Keep the host at its loopback default unless you fully understand the development-only risk.

The service logs only its listener address. It does not log frames, identifiers, payloads, or coordinates. Errors returned to clients are intentionally generic.
