# CrewLink platform boundaries

## Shared TypeScript

- Protocol schemas, TTL, sequence, deduplication, reduced precision, presence, and ACK rules.
- Repository and transport interfaces.
- Coordinator, retry policy, simulators, and UI-ready snapshots.
- No React, Expo, SQLite, WebSocket server, Node filesystem, hardware IDs, or platform permission objects.

## Mobile native adapters

- Expo SQLite repository for Android and iOS.
- Future `LocationSource` for device GPS and background recording.
- Future Android nearby adapter; Google Nearby Connections is the first research candidate.
- Future iOS nearby adapter with proven Android/iPhone interoperability.
- Future external-radio adapter for a Meshtastic-class BLE/USB/Wi-Fi accessory.
- Future secure identity/key adapter backed by Android Keystore and iOS Keychain/Secure Enclave.

## Permissions deferred

Stage 2 adds no location, Bluetooth, nearby Wi-Fi, local-network, Bonjour, or foreground/background permissions. They must be added only with the corresponding native adapter and user-facing flow.

Future Android work may require fine/coarse location, Bluetooth scan/connect, nearby Wi-Fi, foreground-service declarations, and a visible notification. Future iOS work may require location usage descriptions, background location capability, Bluetooth usage, local-network and Bonjour declarations. Exact requirements depend on the selected adapter.

## Lifecycle truth

JavaScript execution and radio sessions may be suspended or terminated. Adapters must report capability, permission, suspension, pairing, link state, payload limit, and actionable failure reason. Pairing is not a current connection; a connected link is not a fresh buddy position.

## Validation limits

Expo web validates UI and shared logic only. Expo Android export validates bundling, not Gradle, manifests, native migrations, permissions, background behavior, or radios. Windows cannot validate an iOS build. Native dependency changes require a development/Gradle build; nearby/BLE work requires physical devices.
