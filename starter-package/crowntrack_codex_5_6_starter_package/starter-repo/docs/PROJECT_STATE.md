# Project state

- Date: 2026-07-18
- Branch: `stage-3b-signed-membership-messages`
- Current accepted stage: 3A
- Stage 3B decision: Needs fixes; no acceptance commit exists.

## Verified Stage 3B state

Strict signed-v2 is the primary Crew path. The local repository owns group, membership, epoch, tombstone, policy, outbox, ACK, observation, rejection, and accepted inbound buddy state. A local outbound update is not a buddy position; only an accepted development-rider inbound update can control the fixed mock Map marker’s safe metadata.

Windows PowerShell validation on 2026-07-16 passed: typecheck; 67 unit tests; 13 relay tests; lint; Android export to `apps/mobile/dist`; Expo Doctor 18/18; and Expo install check. Android emulator `emulator-5554` was available, but its Windows capture layer failed before interaction, so no Stage 3B Android lifecycle or visual evidence is claimed. iOS has static review only.

03O continues with direct ADB/UIAutomator as the approved native method; Sky remains unavailable and is not needed. It corrected three native defects: the signed snapshot projected nonexistent `paired_at` rather than `trusted_at`; development pairing accidentally trusted the local issuer rather than the signed rider; and signed-state cleanup attempted an invalid zero-minute SQLite policy. Native evidence now proves complete identity reset to `NOT CREATED`, identity recreation, immediate rider pairing refresh, and persisted pairing after force-stop/relaunch (after the ordinary dev-menu Reload). The forward-only v8 repair remains intact. The remaining group, policy/outbox, adversarial, Map, full deletion, visual, and accessibility matrix is not yet complete, so Stage 3B remains unaccepted.

## Risks and non-goals

The Expo SDK 52 dependency graph reports 17 advisories (6 high, 11 moderate) in both full and production-omitted-dev audits; the normal reported remediation is a major Expo 57 upgrade, outside this milestone. No real GPS, background tracking, networking, radio transport, MapLibre, GPX, backend accounts, or encryption was added. Signatures do not encrypt content, guarantee delivery, or establish physical truth. Recipient devices/backups can retain previously delivered content after local deletion.

## Next bounded work

Complete the remaining direct-ADB Android lifecycle and sanitized visual/accessibility matrix on `emulator-5554`, then run the full Windows PowerShell acceptance command set and re-evaluate acceptance before any MapLibre or GPS work.
