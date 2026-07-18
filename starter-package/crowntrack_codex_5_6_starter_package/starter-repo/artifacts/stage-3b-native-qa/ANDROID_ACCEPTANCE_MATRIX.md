# Stage 3B Android acceptance matrix — 03N partial recovery

- Device: `emulator-5554` (`sdk_gphone64_x86_64`), 1080x2400, 420 dpi.
- Capture: Sky retried once and failed with `SetIsBorderRequired failed: No such interface supported (0x80004002)`; ADB screencap, UIAutomator, input, package inspection, and force-stop controls were used instead.
- Verified: signed Crew UI loaded through the native dev client; explicit identity creation; concealed manual-pairing Back dismissal; native schema repair to version 8; safe pairing persistence row-count check.
- Not accepted: the required group, consent/outbox, inbound/adversarial, restart, deletion, complete visual, and accessibility matrices must be rerun after the repair. No screenshots or raw UI/database material are committed.

## 03O continuation (sanitized)

- Direct ADB remains the approved native evidence path; Sky was not retried.
- Corrected and tested the signed snapshot `trusted_at AS paired_at` projection, a development-rider pairing fixture mismatch, and native deletion cleanup’s invalid zero-minute retention policy.
- Native UI evidence: complete reset produced `NOT CREATED`; explicit recreation produced `READY`; confirmation immediately showed `Pairing: confirmed`; a force-stop/relaunch followed by normal native dev-menu Reload retained confirmed pairing without a SQLite/safe-snapshot error.
- Still not accepted: membership, policy/outbox/ACK, inbound/adversarial, Map/revoked-state, complete deletion/relaunch, Back/scroll/a11y, all requested viewport sizes, tabs/SOS regression, and final command/audit refresh.
