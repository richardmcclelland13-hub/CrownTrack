# Stage 3B QA and architecture report

- Date: 2026-07-18
- Decision: Needs fixes; recovery checkpoint, no acceptance commit

Pure TypeScript CrewLink packages own protocol, coordination, migrations, and repository contracts. React owns only safe presentation and transient confirmation/pairing state. The native facade owns one SQLite authority store per ready identity; the primary hook owns one ref lifecycle and reconstructs a fresh facade on reload. Legacy v1 runtime code remains isolated and is not imported by the primary hook or Map.

Automated verification passed: typecheck, 74 unit tests, 13 relay tests, lint, Android export (641 modules, 2.3 MB), Expo Doctor 18/18, and Expo install check. The Hermes regression removes `structuredClone`; the added reconstruction regression proves persisted key-matching pairing state rehydrates the local trust guard before reciprocal epoch-2 grant. Direct ADB verified that repaired membership path and the main policy/outbox, delivery/adversarial, revocation, and complete-deletion flows. A fresh Android build/install did not complete within the bounded run. Acceptance remains blocked pending Map/missing-key, short-TTL reconstruction, and the complete visual/accessibility matrix.
