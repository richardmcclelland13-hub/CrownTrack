# Stage 3B Android native QA

- Date: 2026-07-18
- Target device: `emulator-5554` (Pixel_8)
- Result: Needs fixes; direct ADB verified pivotal repaired paths, but Stage 3B is not accepted

Sky remains unavailable with `SetIsBorderRequired failed: No such interface supported (0x80004002)`. Direct ADB is the working replacement and verified the running `emulator-5554`, installed package, 1080x2400/420dpi display, launch, UIAutomator hierarchy, tab interaction, current Metro/debug bundle, and signed Crew UI.

Native QA first exposed Hermes lacking `structuredClone`; the portable clone fallback repaired that path. Fresh evidence then isolated a reconstruction-level trust-gate defect: a valid persisted pairing survived a new harness but its volatile local-trust guard did not. The guard now derives local trust from the matching unrevoked stored pairing before reciprocal grant, and focused tests prove a fresh-runtime epoch-2 grant plus unavailable-nearby duplicate delivery. Direct device evidence verified the repaired grant, policy/consent/sharing, queued outbound plus valid ACK, inbound/duplicate/tamper, forged-ACK, revocation/stale epoch, and complete deletion followed by two relaunches. A fresh `expo run:android` reached Gradle with the verified Android SDK path but did not complete a build/install within the bounded run. Native Map/missing-key, short-TTL reconstruction, and 360/390/412/768 visual/accessibility evidence remain incomplete. No native acceptance claim is made; see `../STAGE_3B_03R_RECOVERY_CHECKPOINT.md`.

Continue native acceptance through direct ADB; do not retry Sky. Do not track APKs, databases, logs, keys, invitations, or secret-bearing screenshots.
