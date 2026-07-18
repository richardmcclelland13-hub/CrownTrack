# Stage 3B QA and architecture report

- Date: 2026-07-18
- Decision: Blocked, no acceptance commit

Pure TypeScript CrewLink packages own protocol, coordination, migrations, and repository contracts. React owns only safe presentation and transient confirmation/pairing state. The native facade owns one SQLite authority store per ready identity; the primary hook owns one ref lifecycle and reconstructs a fresh facade on reload. Legacy v1 runtime code remains isolated and is not imported by the primary hook or Map.

Automated verification passed: typecheck, 73 unit tests, 13 relay tests, lint, Android export (641 modules, 2.3 MB), Expo Doctor 18/18, and Expo install check. The focused Hermes regression removes `structuredClone`, then proves reciprocal trust, epoch-2 grant, and safe snapshot state. Native direct-ADB evidence proves the pre-fix failure and sanitized error routing; release installation of the repaired bundle is blocked by Expo/Gradle resolving the embed entrypoint from the monorepo root. Acceptance remains blocked because repaired native lifecycle, adversarial, deletion, visual, and accessibility matrices have not been executed.
