---
name: dependency-audit
description: Audit CrownTrack npm dependencies and advisories, classify direct versus transitive and runtime versus development exposure, identify safe remediation, and document temporary risk. Use before milestones, dependency additions, Expo upgrades, or security acceptance.
---

# Dependency audit

1. Record package manifests, lockfile version, and `npm ls --depth=0`.
2. Run `npm audit --json` and `npm audit --omit=dev --json`; preserve exact counts and paths.
3. Classify direct/transitive and runtime/build/dev exposure.
4. Identify whether a normal non-breaking update resolves each advisory.
5. Do not run `npm audit fix --force` or mix a major Expo upgrade into an unrelated milestone.
6. If audit results differ between runs, record both timestamps/results and treat the result as advisory-database instability.
7. Re-run typecheck, tests, lint, and platform export after dependency changes.
8. Document accepted temporary risk, affected paths, user-controlled inputs, and next remediation milestone.
