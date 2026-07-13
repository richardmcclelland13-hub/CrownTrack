# Automated validation

Final Windows validation on 2026-07-12:

- `npm run typecheck`: pass
- `npm run lint`: pass
- `npm test`: 38 passed, 0 failed
- `npm run test:relay`: 9 passed, 0 failed
- `npx expo-doctor`: 18/18 checks passed
- `npx expo install --check`: dependencies up to date
- `npm run export:android`: pass; 633 modules, 2.15 MB Hermes bundle

Dependency audit:

- Full: 1,013 dependencies; 17 advisories (11 moderate, 6 high, 0 critical)
- Production scope: 868 dependencies; 17 advisories (11 moderate, 6 high, 0 critical)
- Selected Stage 3A packages: no reported advisories
- Residual advisories are the documented Expo SDK 52 CLI/config/build dependency paths; no forced SDK migration was performed.
