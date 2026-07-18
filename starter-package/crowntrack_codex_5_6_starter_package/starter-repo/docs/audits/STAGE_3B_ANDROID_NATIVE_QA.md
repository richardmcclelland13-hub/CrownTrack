# Stage 3B Android native QA

- Date: 2026-07-18
- Target device: `emulator-5554` (Pixel_8)
- Result: Needs fixes; direct ADB reproduced and diagnosed the reciprocal-trust failure, but post-fix device acceptance is blocked

Sky remains unavailable with `SetIsBorderRequired failed: No such interface supported (0x80004002)`. Direct ADB is the working replacement and verified the running `emulator-5554`, installed package, 1080x2400/420dpi display, launch, UIAutomator hierarchy, tab interaction, and the current signed Crew UI.

Native QA exposed a persisted schema-v7 database that omitted required signed record tables and the rejection-retention column; the current forward-only repair is schema v9. 03Q fresh UIAutomator evidence started from a confirmed local pairing and local-owned epoch-1 group, tapped the enabled reciprocal-trust action, and observed the unchanged disabled grant gate. The sanitized UI status identified `structuredClone` as unavailable under Hermes. The shared signed in-memory repository and harness now use the portable clone fallback, with a focused test that removes `structuredClone`, confirms reciprocal trust, and grants epoch-2 membership. A current 641-module Android export succeeded, but a fresh release install is blocked by the local Expo/Gradle monorepo embed pass resolving `index.js` from the repository root. The required repaired-on-device group, delivery, adversarial, final deletion, visual, and accessibility matrices remain incomplete. No native acceptance claim or commit is made.

Continue native acceptance through direct ADB; do not retry Sky. Do not track APKs, databases, logs, keys, invitations, or secret-bearing screenshots.
