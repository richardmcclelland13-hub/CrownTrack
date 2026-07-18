# Stage 3B QA and architecture report

- Date: 2026-07-16
- Decision: Blocked, no acceptance commit

Pure TypeScript CrewLink packages own protocol, coordination, migrations, and repository contracts. React owns only safe presentation and transient confirmation/pairing state. The native facade owns one SQLite authority store per ready identity; the primary hook owns one ref lifecycle and reconstructs a fresh facade on reload. Legacy v1 runtime code remains isolated and is not imported by the primary hook or Map.

Automated verification passed: typecheck, 67 unit tests, 13 relay tests, lint, Android export, Expo Doctor, and Expo install check. The new focused tests establish local inbound direction, outbound non-mislabelling, tamper/old-epoch rejection, duplicate observations, local repository reconstruction, tombstoned last-known treatment, and injected-clock freshness. Acceptance is blocked solely because native/visual matrix execution could not begin.
