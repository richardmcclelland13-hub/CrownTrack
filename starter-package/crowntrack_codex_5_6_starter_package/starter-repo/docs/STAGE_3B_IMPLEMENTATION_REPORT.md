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

Windows PowerShell results: typecheck passed; unit tests 73/73; relay tests 13/13; lint passed; Android export passed (641 modules, 2.3 MB Hermes bundle); Expo Doctor 18/18; Expo install check up to date. Direct ADB/UIAutomator reproduced the reciprocal-trust failure and its sanitized Hermes `structuredClone` error. The signed in-memory repository/harness now reuse the portable clone fallback, and a focused no-`structuredClone` test proves reciprocal trust plus epoch-2 grant. A fresh local release build bundles current source but cannot finish its Expo/Gradle monorepo embed pass because it resolves `index.js` from the repository root. No repaired native acceptance, screenshot, database inspection, or acceptance commit is claimed.
