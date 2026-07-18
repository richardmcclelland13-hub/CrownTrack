# Project state

- Date: 2026-07-18
- Branch: `stage-3b-signed-membership-messages`
- Current accepted stage: 3A
- Stage 3B decision: Needs fixes; no acceptance commit exists.

## Verified Stage 3B state

Strict signed-v2 is the primary Crew path. The local repository owns group, membership, epoch, tombstone, policy, outbox, ACK, observation, rejection, and accepted inbound buddy state. A local outbound update is not a buddy position; only an accepted development-rider inbound update can control the fixed mock Map marker’s safe metadata.

Windows PowerShell validation on 2026-07-18 passed: typecheck; 73 unit tests; 13 relay tests; lint; Android export to `apps/mobile/dist` (641 modules, 2.3 MB); Expo Doctor 18/18; and Expo install check. Android emulator `emulator-5554` is available and direct ADB/UIAutomator replaces Sky; iOS has static review only.

03Q reproduced a reciprocal-trust failure from a confirmed pairing and local-owned epoch-1 group. The sanitized native status proved the action failed because Hermes does not provide `structuredClone`; pairing, SQLite, and UI wiring were not the failing layer. Signed in-memory repository/harness cloning now uses the existing portable fallback, proven by a focused no-`structuredClone` reciprocal-trust and grant test. The forward-only schema-v9 repair remains intact. A release rebuild bundled current source but could not install because the Expo/Gradle embed pass resolves `index.js` from the monorepo root. The remaining repaired-on-device group, policy/outbox, adversarial, Map, full deletion, visual, and accessibility matrix is not yet complete, so Stage 3B remains unaccepted.

## Risks and non-goals

The Expo SDK 52 dependency graph reports 17 advisories (6 high, 11 moderate) in both full and production-omitted-dev audits; the normal reported remediation is a major Expo 57 upgrade, outside this milestone. No real GPS, background tracking, networking, radio transport, MapLibre, GPX, backend accounts, or encryption was added. Signatures do not encrypt content, guarantee delivery, or establish physical truth. Recipient devices/backups can retain previously delivered content after local deletion.

## Next bounded work

Complete the remaining direct-ADB Android lifecycle and sanitized visual/accessibility matrix on `emulator-5554`, then run the full Windows PowerShell acceptance command set and re-evaluate acceptance before any MapLibre or GPS work.
