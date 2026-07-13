# Stage 2.2 Android native acceptance

Status: accepted — native Android persistence closure verified on `emulator-5554`.

## Build and launch

- Built the x86_64 debug APK using JDK 17, the Android SDK, external Gradle caches, and the short `X:` project mapping to avoid the Windows CMake path limit.
- Installed `com.crowntrack.adv` and launched the native React Native app with Metro on port 8081.
- The dev-client bundle was served through the Expo virtual Metro entry; no production network transport or GPS behavior was introduced.

## Native persistence matrix

| Gate | Result |
| --- | --- |
| Create simulator ride group | Passed |
| Confirm group-scoped reduced-precision consent and enable sharing | Passed |
| Simulate offline and queue an update | Passed: SQLite schema v3 reported one queued outbox item |
| Force-stop and relaunch | Passed: group, policy, and queued outbox item persisted |
| Delete local crew/location data | Passed after explicit confirmation |
| Database truth after delete | Passed: `crew_group`, `crew_share_policy`, `crew_outbox`, and `crew_peer` each contained 0 rows |
| Force-stop/relaunch after deletion | Passed: Crew screen reported `NO RIDE GROUP` |

## Regression evidence

- `npm run typecheck`: passed.
- `npm test` through the Windows Node runtime: 28 passing.
- The CodexPro Linux verification shell cannot run this workspace's Windows `esbuild` binary; this environment mismatch is not an application test failure.

## Evidence

Non-sensitive Gradle, Metro, UI XML, screenshot, and SQLite snapshots are in `artifacts/stage-2-2-native-qa/`.

## Deferred

Android Back, rotation, keyboard, and system-bar behavior were not part of this persistence closure.