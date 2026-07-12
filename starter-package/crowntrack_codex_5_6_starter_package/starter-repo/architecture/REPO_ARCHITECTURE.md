# Repo Architecture

## Recommended stack

- React Native + TypeScript
- Expo Dev Client / prebuild is acceptable for early development if it does not block later native modules
- Pure TypeScript packages for navigation and offline pack logic
- MapLibre React Native later
- SQLite/local filesystem later

## Target structure

```text
crowntrack-adv/
  AGENTS.md
  README.md
  docs/
  apps/
    mobile/
      src/
        app/
        screens/
        components/
        navigation/
        mocks/
        theme/
        services/
  packages/
    core/
      src/navigation/
      src/rides/
      src/sos/
    ui/
      src/tokens/
      src/components/
    offline-packs/
      src/manifest/
      src/registry/
      src/audit/
    gpx/
      src/
  tools/
    gis-pipeline/
  skills/
```

## Dependency rules

- `packages/core` must stay pure TypeScript.
- `packages/offline-packs` must stay pure TypeScript at first.
- UI imports core models, not the other way around.
- Do not let map/native dependencies leak into domain packages.
- Keep mock services replaceable with real services later.

## First implementation target

Create a running mobile app shell with mock services:

- `MockMapScreen`
- `PacksScreen`
- `PlanScreen`
- `CrewScreen`
- `SosScreen`
- `useRideSession()` mock hook
- `useOfflinePacks()` mock hook
- `useRouteAudit()` mock hook

## Tests

Start with tests for pure domain logic:

- route progress math
- pack install state transitions
- route coverage audit
- rescue packet creation from mock track samples
- source/licence warning classification
