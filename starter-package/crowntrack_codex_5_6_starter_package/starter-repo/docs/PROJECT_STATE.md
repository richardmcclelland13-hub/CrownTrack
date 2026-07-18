# Project state

- Date: 2026-07-18
- Branch: `stage-3b-signed-membership-messages`
- Current accepted stage: 3A
- Stage 3B decision: Needs fixes; no acceptance commit exists.

## Verified Stage 3B state

Strict signed-v2 is the primary Crew path. The local repository owns group, membership, epoch, tombstone, policy, outbox, ACK, observation, rejection, and accepted inbound buddy state. A local outbound update is not a buddy position; only an accepted development-rider inbound update can control the fixed mock Map marker’s safe metadata.

Windows PowerShell validation on 2026-07-18 passed: typecheck; 74 unit tests; 13 relay tests; lint; Android export to `apps/mobile/dist` (641 modules, 2.3 MB); Expo Doctor 18/18; and Expo install check. Android emulator `emulator-5554` ran the current Metro/debug bundle through direct ADB/UIAutomator; iOS has static review only.

03Q proved the first reciprocal-trust failure was Hermes lacking `structuredClone`; the signed in-memory repository/harness uses the portable fallback. 03R then proved a distinct reconstruction-layer failure: persisted matching pairing state survived a fresh harness but its volatile local-trust guard did not. The guard now rehydrates from an unrevoked, key-matching persisted pairing before reciprocal grant, and a regression proves the fresh-runtime epoch-2 grant. Direct ADB verified repaired membership, consent/outbox/valid ACK, accepted/duplicate/tampered inbound behavior, forged-ACK and stale-epoch rejection, revocation, and complete deletion/two relaunches. The fresh Gradle build/install did not complete within the bounded run; Map/missing-key, short-TTL reconstruction, and the complete visual/accessibility matrix remain incomplete. Stage 3B remains unaccepted; see `STAGE_3B_03R_RECOVERY_CHECKPOINT.md`.

## Risks and non-goals

The Expo SDK 52 dependency graph reports 17 advisories (6 high, 11 moderate) in both full and production-omitted-dev audits; the normal reported remediation is a major Expo 57 upgrade, outside this milestone. No real GPS, background tracking, networking, radio transport, MapLibre, GPX, backend accounts, or encryption was added. Signatures do not encrypt content, guarantee delivery, or establish physical truth. Recipient devices/backups can retain previously delivered content after local deletion.

## Next bounded work

Complete the bounded fresh Android build/install diagnosis, then the remaining direct-ADB Map/missing-key and short-TTL reconstruction evidence plus the sanitized 360/390/412/768 visual/accessibility matrix on `emulator-5554`, before re-evaluating acceptance or beginning MapLibre/GPS work.
