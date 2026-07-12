# CrownTrack ADV — Off-Grid Buddy Tracking Architecture Brief

## The core reality

A phone can calculate its GPS position without cell service. That does not automatically let another phone receive the position.

Location sharing always needs a transport:

1. Internet/cellular/Wi-Fi to a relay server.
2. Direct phone radios such as Bluetooth or peer-to-peer Wi-Fi, over limited nearby range.
3. A dedicated long-range radio such as a LoRa/Meshtastic device.
4. Satellite hardware/service.

A hosted server only works while at least one usable path to the internet exists.

## Why Garmin and Polaris can do it

Their off-grid group systems use radio hardware rather than a hidden internet trick:

- Garmin supports Group Ride through compatible navigation hardware and a Group Ride Radio accessory.
- Polaris documents both cellular-based Group Ride and a vehicle-to-vehicle antenna mode.

That is the model CrownTrack should follow: the app owns the map, rider experience, permissions, protocol, and transport coordination; an external radio provides long-range off-grid connectivity.

## Recommended CrownTrack design

Build one CrewLink system with three adapters:

### Cloud relay

Use when internet is available.

Benefits:

- broad range
- friend/account workflows
- easier acknowledgements and group management
- route/waypoint sync

Limit:

- unavailable with no connectivity

### Nearby peer

Use for close riders without internet.

Possible platform technologies must be researched and isolated behind native adapters.

Benefits:

- no extra hardware
- good for staging areas, camps, and close groups

Limits:

- short and variable range
- platform/background restrictions
- not reliable enough as the only ADV safety transport

### External mesh radio

Use a compatible LoRa/Meshtastic device connected to the phone over BLE/USB/Wi-Fi.

Benefits:

- purpose-built off-grid communication
- position packets and mesh relays are a natural fit
- inexpensive hardware compared with proprietary systems

Limits:

- each rider needs hardware
- terrain, antenna, power, regional radio settings, and packet rates matter
- integration and field testing are required
- not a substitute for satellite emergency communication

## Product UI rule

Never show a buddy as “Live” merely because their phone GPS is active.

The UI must distinguish:

- GPS fix state
- transport link state
- age of last received position
- transport source
- delivery acknowledgement
- stale/unknown state

## Recommended sequence

1. Build CrewLink protocol and simulations.
2. Build local persistence and consent.
3. Add local development cloud relay.
4. Implement real phone GPS and background location separately.
5. Spike Android nearby transport.
6. Spike Meshtastic client integration with test hardware.
7. Repeat on iOS behind the same interfaces.
8. Conduct controlled field tests.
9. Only then define production backend and supported hardware.
