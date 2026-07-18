# Stage 3B dependency audit

- Date: 2026-07-16
- `npm ls --depth=0`: healthy; direct mobile runtime includes Expo 52.0.49, React Native 0.76.9, Expo Crypto/SecureStore/SQLite, and local CrewLink workspaces.
- `npx expo-doctor`: 18/18 passed. `npx expo install --check`: dependencies up to date.
- `npm audit --json`: 17 advisories — 6 high, 11 moderate, 0 critical.
- `npm audit --omit=dev --json`: the same 17 advisories — 6 high, 11 moderate, 0 critical.

The advisories are primarily direct Expo 52 tooling/runtime dependency paths: Expo CLI/config/Metro/rudder, `tar`, `cacache`, `@xmldom/xmldom`, `uuid`, `postcss`, and related packages. The audit reports normal remediation through a major Expo 57 upgrade (with some transitive updates); that is not a bounded non-breaking Stage 3B correction. It is a documented temporary Expo risk, not evidence that the advisory is harmless. No audit fix was run.
