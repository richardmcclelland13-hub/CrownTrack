# CrownTrack build tracker

| Stage | Scope | Status |
| --- | --- | --- |
| 0/1 | Expo/React Native shell, five tabs, mock ride/offline states, pure domain helpers | Needs audit |
| 2 | Local-first CrewLink protocol, persistence boundary, simulators, dev relay, Crew UI | Needs audit |
| 2.1 | Canonical native persistence and migration runner | Accepted through Stage 2.2 closure |
| 2.2 | Android native persistence and deletion acceptance | Accepted |
| 3A | Secure device identity and offline pairing | Accepted |
| 3B | Verified membership and signed CrewLink messages | Needs fixes — partial direct-ADB acceptance; build and visual matrices remain |
| 4A | MapLibre local-pack spike | Recommended next |

## Native build bookkeeping

- `apps/mobile/android/` is local Expo prebuild output, not source-controlled. It may contain generated files and a debug keystore.
- APKs, database snapshots, Metro/Gradle logs, build caches, debug keystores, raw invitations, and secret-bearing screenshots remain untracked.
- Redacted text evidence is stored under `artifacts/stage-3a-native-qa/`.
- Use `npm --workspace apps/mobile run android` for native launch/build. On Windows, build through the short `X:` mapping with external Gradle caches when CMake path lengths require it.
- Android Stage 3A runtime was tested. iOS Stage 3A runtime is unverified.

Stage 3A passed Android native acceptance and the independent final security/QA diff review. Stage 3B Windows validation on 2026-07-18 passed: typecheck, 74 unit tests, 13 relay tests, lint, Android export, Expo Doctor 18/18, and Expo dependency alignment. Direct ADB verified the current Metro/debug bundle and pivotal membership, delivery/adversarial, and deletion flows. A fresh Android build/install did not complete within the bounded run, and the required visual/accessibility and remaining lifecycle evidence is incomplete; native Stage 3B product acceptance is still required. See `STAGE_3B_03R_RECOVERY_CHECKPOINT.md`.
