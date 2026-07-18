# Stage 3B Android native QA

- Date: 2026-07-18
- Target device: `emulator-5554` (Pixel_8)
- Result: Needs fixes; direct ADB recovery and 03O repair validation completed a partial matrix

Sky remains unavailable with `SetIsBorderRequired failed: No such interface supported (0x80004002)`. Direct ADB is the working replacement and verified the running `emulator-5554`, installed package, 1080x2400/420dpi display, launch, UIAutomator hierarchy, tab interaction, and the current signed Crew UI.

Native QA exposed a persisted schema-v7 database that omitted required signed record tables and the rejection-retention column. A forward-only v8 repair was added and the emulator then reported schema 8. 03O additionally corrected the trusted-peer projection, shared the actual development-rider key between pairing and runtime, and corrected zero-minute cleanup policy persistence. Native UI proved identity reset, explicit recreation, immediate pairing confirmation, and pairing persistence after force-stop/relaunch. The required group, delivery, adversarial, final deletion, visual, and accessibility matrices remain incomplete. No native acceptance claim or commit is made.

Continue native acceptance through direct ADB; do not retry Sky. Do not track APKs, databases, logs, keys, invitations, or secret-bearing screenshots.
