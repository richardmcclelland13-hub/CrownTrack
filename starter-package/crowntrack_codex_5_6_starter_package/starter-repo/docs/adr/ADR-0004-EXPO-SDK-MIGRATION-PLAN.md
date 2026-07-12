# ADR-0004: Expo SDK migration plan

- Status: Deferred
- Date: 2026-07-12

## Current state

Stage 2.1 remains on Expo SDK 52.0.49 with React Native 0.76.9. `npm audit` reports 17 advisories (11 moderate, 6 high) in both full and production scopes. Direct paths include `expo` and `expo-asset`; most affected paths are Expo CLI/configuration/build tooling through `@expo/cli`, `tar`, `cacache`, `@xmldom/xmldom`, `postcss`, `uuid`, and related configuration packages.

## Decision

Do not use `npm audit fix --force` and do not upgrade to Expo SDK 57 during native-persistence closure. The audit fix is a major SDK migration with native compatibility risk and would make persistence/runtime evidence harder to interpret.

## Recommended future stage

Create a dedicated Expo migration stage. Record lockfile paths, upgrade Expo/RN using Expo's supported compatibility matrix, regenerate native projects only in a disposable worktree, then run typecheck, lint, protocol/repository/relay tests, Android Gradle/emulator/device persistence checks, browser visual QA, and iOS simulator/device checks. Roll back by restoring the prior lockfile and SDK-compatible package set if a native or persistence regression appears.
