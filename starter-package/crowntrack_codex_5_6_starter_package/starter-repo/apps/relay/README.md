# CrownTrack local development relay

This is a loopback-only, in-memory WebSocket relay for CrewLink development. It stores no data and has no deployment configuration.

> **Warning:** authentication is development-only. `CREWLINK_DEV_TOKEN` is a shared local gate, not production authentication or authorization. Do not expose this service to a LAN or the public internet and do not use real safety-critical location data.

## Run

Set a random token of at least 16 characters, then run `npm run start` from this directory. The relay binds to `127.0.0.1:8787` by default.

The first client frame must be:

```json
{"type":"join","token":"your-development-token","rideGroupId":"ride-1","peerId":"rider-a"}
```

After `{ "type": "joined", "rideGroupId": "ride-1" }`, send a direct `CrewLinkMessage` (`location` or `ack`) from `@crowntrack/crew-protocol`. Messages are accepted only when their `groupId` matches the joined room. Frames are relayed only to other connected clients in that room.

Configuration: `CREWLINK_RELAY_HOST`, `CREWLINK_RELAY_PORT`, `CREWLINK_DEV_TOKEN`, `CREWLINK_RELAY_MAX_PAYLOAD_BYTES`, `CREWLINK_RELAY_MAX_CLIENTS`, `CREWLINK_RELAY_RATE_LIMIT_MESSAGES`, `CREWLINK_RELAY_RATE_LIMIT_WINDOW_MS`, `CREWLINK_RELAY_JOIN_TIMEOUT_MS`, and `CREWLINK_RELAY_HEARTBEAT_INTERVAL_MS`. Legacy `RELAY_*` names remain accepted for local compatibility. Keep the host at its loopback default unless you fully understand the development-only risk.

The service logs only its listener address. It does not log frames, identifiers, payloads, or coordinates. Errors returned to clients are intentionally generic.
