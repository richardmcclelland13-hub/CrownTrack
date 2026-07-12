# CrownTrack ADV

This repository contains the Stage 0/1 native UI shell and the Stage 2 local-first CrewLink development foundation. CrewLink currently uses strict protocol validation, local persistence boundaries, simulators, and a local-only relay. It does not provide production authentication, real GPS, Bluetooth, Meshtastic, MapLibre, map tiles, or cloud deployment.

## Setup

```powershell
npm install
npm run typecheck
npm test
npm run test:relay
npm run lint
```

## Run the mobile shell

```powershell
npm run start
```

Then open the Expo development server in an Android emulator, iOS simulator, or Expo Go-compatible device. The five tabs are Map, Packs, Plan, Crew, and SOS.

### Native CrewLink development run

CrewLink SQLite persistence is active only in native Android/iOS builds; the web target intentionally uses the shared in-memory repository. After Android Studio, JDK 17, SDK Platform Tools, and an emulator or device are available:

```powershell
adb devices
npm --workspace apps/mobile exec expo -- start --android
```

The managed project has no committed `android/` directory. For a local generated-project check, run `npx expo prebuild --platform android --no-install` from `apps/mobile`, then build with Gradle. Do not commit generated native projects unless a later stage explicitly adopts that workflow.

`resetCrewLinkDevelopmentDatabase()` is a development-only helper for a disposable native simulator database. It must never be exposed in production; the normal user-facing deletion action clears locally controlled CrewLink rows without dropping the schema.

The relay is development-only and binds to loopback by default. Set an ephemeral `CREWLINK_DEV_TOKEN` before starting it; see `apps/relay/README.md`.

## Architecture

- `apps/mobile` owns screen composition, mock fixtures, tab state, and adapters.
- `packages/core` contains pure route, ride-session, and rescue-packet logic.
- `packages/offline-packs` contains pure pack state, coverage, health, and source-warning logic.
- `packages/ui` contains reusable field UI primitives and tokens.
- `packages/gpx` is a contract-only placeholder for a later GPX engine.
- `packages/crew-protocol` owns versioned wire schemas and freshness/replay helpers.
- `packages/crewlink` owns repository ports, simulators, retry, and coordination.
- `apps/relay` is an in-memory local development relay with no production authentication.

Unknown access/source states are intentionally shown as unknown. A route line never implies riding permission.
