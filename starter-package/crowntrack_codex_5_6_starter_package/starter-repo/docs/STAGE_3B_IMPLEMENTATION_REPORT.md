# Stage 3B implementation report

- Date: 2026-07-18
- Status: Blocked pending Android native and visual acceptance

## Delivered and verified

- Strict signed-v2 envelopes use the stable CrewLink domain and canonical verification before persistence.
- Membership uses stable authority streams, single-step epochs, and terminal per-identity revocation tombstones.
- The SQLite repository remains the transactional authority for replay, sequence, policy, outbox, ACK, location, observation, and rejection data.
- The development harness separates local outbound queue/ACK behavior from remote-to-local inbound buddy delivery. The safe snapshot and Map read the local accepted inbound record, never the simulated rider repository or local outbound location.
- Fresh runtime reconstruction is tested against the same local repository. Freshness uses stored capture time and injected clock: live at 60 seconds or less, recent through five minutes, stale thereafter, and tombstoned positions are last-known stale.
- Crew UI exposes safe status, action gates, confirmations, consent/sharing controls, manual pairing cleanup, missing-key simulation, crypto proof, and complete-deletion wording. The Map uses only fixed mock geometry with safe state metadata.

## Acceptance evidence

Windows PowerShell results: typecheck passed; unit tests 67/67; relay tests 13/13; lint passed; Android export passed (639 modules, 2.29 MB Hermes bundle); Expo Doctor 18/18; Expo install check up to date. Native acceptance was attempted on `emulator-5554`, but Windows capture returned `SetIsBorderRequired failed: No such interface supported (0x80004002)` before UI observation or interaction. No native claim, screenshot, database inspection, or commit is made.
