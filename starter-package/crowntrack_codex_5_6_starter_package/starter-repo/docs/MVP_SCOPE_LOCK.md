# MVP Scope Lock

## Included in early MVP

- React Native TypeScript app shell
- Map/Packs/Plan/Crew/SOS navigation
- Mock map visualization
- Mock route following state
- Mock track recording state
- Mock waypoints/hazards
- Offline pack registry models
- Pack manifest/health/source warning UI
- GPX import/export UI placeholders
- SOS/rescue packet UI placeholder
- Local mock services
- Unit tests for pure TypeScript domain functions

## Excluded until later

- Real MapLibre map rendering
- Real background GPS tracking
- Real GPX parser/exporter
- Real offline tile download/storage
- Real Alberta GIS data ingestion
- Login/backend/sync
- Meshtastic Bluetooth integration
- Push notifications
- App Store/TestFlight distribution

## Why

If map rendering, GPS permissions, native background services, GIS data processing, and UI are all built at once, Codex will produce fragile code. The first phase needs stable product architecture and UI/data contracts.
