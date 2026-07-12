# Stage 2 dependency audit

## Baseline

- Lockfile version: 3
- Baseline direct packages: Expo 52, React 18, React Native 0.76, Expo Asset, TypeScript/ESLint/tsx tooling
- Baseline `npm audit --json` observed: 17 findings (6 high, 11 moderate, 0 critical)
- A separate read-only agent run later reported 0 findings against the same lockfile. Because npm audit depends on registry advisory state, both observations are recorded and the final post-install audit is authoritative for this workspace session.

## Baseline classification

Direct packages flagged in the 17-finding result were `expo` and `expo-asset`. Transitive paths were primarily Expo CLI/config/build tooling:

- `@xmldom/xmldom` through `@expo/plist`
- `postcss` through `@expo/metro-config`
- `tar` through `cacache` and Expo CLI
- `uuid` through Expo configuration tooling and `xcode`

These paths are largely build/configuration exposure rather than CrewLink runtime message handling. `npm audit fix --force` proposes a major Expo upgrade and is prohibited for Stage 2. No force fix was run.

## Stage 2 additions

- `zod`: pure runtime schema validation.
- `ws` and `@types/ws`: confined to the local Node relay.
- `expo-sqlite`: native local persistence adapter.
- `react-native-safe-area-context`: inset-aware mobile layout.
- Expo web dependencies for visual QA.

React Native was aligned from `0.76.6` to Expo SDK 52's expected `0.76.9`; the UI workspace peer range was aligned to prevent a duplicate runtime. A normal install also refreshed compatible SDK 52 patch dependencies. No forced or major upgrade was used.

## Decision

Stay on SDK 52 for Stage 2 and schedule the next Expo SDK migration as a separate compatibility milestone. During this run, audit results were registry-state dependent: one explicit audit returned zero, while the immediately subsequent normal `npm install` and final audits reported 17 findings (11 moderate, 6 high, 0 critical) for both all and production dependency scopes. The final status is therefore 17 unresolved advisories. Do not use overrides or `npm audit fix --force` to obtain a cosmetic zero count; reproduce and triage against a stable registry snapshot before acceptance.
