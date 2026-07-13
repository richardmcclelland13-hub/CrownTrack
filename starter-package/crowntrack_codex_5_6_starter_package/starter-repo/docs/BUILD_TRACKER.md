# CrownTrack build tracker

| Stage | Scope | Status |
| --- | --- | --- |
| 0/1 | Expo/React Native shell, five tabs, mock ride/offline states, pure domain helpers | Needs audit |
| 2 | Local-first CrewLink protocol, persistence boundary, simulators, dev relay, Crew UI | Needs audit |
| 2.1 | Canonical native persistence, migration runner, browser QA, Android/iOS boundary closure | Needs fixes |
| 2.2 | Android native acceptance closure | Accepted |
| 3 | Secure device identity, pairing, verified membership, and signed CrewLink | In progress |

## Native build bookkeeping

- `apps/mobile/android/` is local Expo prebuild output, not source-controlled. It may contain generated files and a debug keystore.
- Native QA evidence, APKs, database snapshots, Metro/Gradle logs, and caches remain local and ignored.
- Use `npm --workspace apps/mobile run android` for native launch/build. On Windows, build through the short `X:` mapping with external Gradle caches when CMake path lengths require it.

`Needs audit` means implementation evidence exists but Richard/ChatGPT has not accepted the milestone. `Needs fixes` means one or more required acceptance gates are incomplete. Browser validation is supplemental to native validation.
