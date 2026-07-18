# Stage 3B implementation report

- Date: 2026-07-18
- Status: Needs fixes — recovery checkpoint pending remaining Android native and visual acceptance

## Delivered and verified

- Strict signed-v2 envelopes use the stable CrewLink domain and canonical verification before persistence.
- Membership uses stable authority streams, single-step epochs, and terminal per-identity revocation tombstones.
- The SQLite repository remains the transactional authority for replay, sequence, policy, outbox, ACK, location, observation, and rejection data.
- The development harness separates local outbound queue/ACK behavior from remote-to-local inbound buddy delivery. The safe snapshot and Map read the local accepted inbound record, never the simulated rider repository or local outbound location.
- Fresh runtime reconstruction is tested against the same local repository. Freshness uses stored capture time and injected clock: live at 60 seconds or less, recent through five minutes, stale thereafter, and tombstoned positions are last-known stale.
- Crew UI exposes safe status, action gates, confirmations, consent/sharing controls, manual pairing cleanup, missing-key simulation, crypto proof, and complete-deletion wording. The Map uses only fixed mock geometry with safe state metadata.

## Acceptance evidence

Windows PowerShell results: typecheck passed; unit tests 74/74; relay tests 13/13; lint passed; Android export passed (641 modules, 2.3 MB Hermes bundle); Expo Doctor 18/18; Expo install check up to date. Direct ADB/UIAutomator reproduced the Hermes clone error, then verified the portable-clone fix. It also exposed and repaired a fresh-harness trust-gate error: persisted matching pairing state now rehydrates local trust before reciprocal epoch-2 grant. Current device evidence covers membership, policy/outbox/valid ACK, inbound/duplicate/tamper, forged ACK, revocation/stale epoch, and complete deletion/two relaunches. The fresh Android build/install did not complete within the bounded Gradle run; Map/missing-key, short-TTL reconstruction, and full visual/accessibility evidence remain outstanding. No acceptance claim is made; see `STAGE_3B_03R_RECOVERY_CHECKPOINT.md`.
