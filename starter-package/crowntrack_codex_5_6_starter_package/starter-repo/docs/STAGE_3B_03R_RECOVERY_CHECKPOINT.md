# Stage 3B 03R recovery checkpoint

- Date: 2026-07-18
- Branch: `stage-3b-signed-membership-messages`
- Decision: **Needs fixes — recovery checkpoint, not an acceptance commit**

## Source repair

Fresh native evidence isolated a second harness-level trust error after the Hermes clone repair. A persisted, valid development-rider pairing survived a runtime reconstruction, while the harness's volatile `localTrust` flag restarted false. The reciprocal grant gate therefore rejected a confirmed trust relationship. The harness now derives its local trust gate from the persisted, unrevoked pairing whose public key matches the deterministic development rider, in addition to reciprocal confirmation. A focused regression reconstructs a new harness over the same repository, reconfirms reciprocal trust, and proves the epoch-2 grant.

The nearby-duplicate control had a separate presentation gate mismatch: the action itself establishes the simulated nearby transport, but the safe snapshot hid the action while that transport was unavailable. The control is now exposed whenever a non-revoked inbound candidate exists. The existing action remains responsible for establishing the simulated transport, and focused coverage verifies the unavailable-to-delivery path.

## Verified direct-ADB evidence

`emulator-5554` (Pixel_8, API 35) ran the current Metro bundle from `apps/mobile/index.js`. The installed debug package loaded the repaired source after a normal development reload. Sanitized UI/UIAutomator evidence established:

- confirmed pairing plus reciprocal development trust leads to a signed epoch-2 rider membership; a second grant is gated;
- local membership survives force-stop/relaunch, while simulated reciprocal remote trust is intentionally process-local and must be reconfirmed;
- policy/consent/sharing gates, queued local outbound delivery, and a valid ACK clearing the queue operate on-device;
- accepted inbound delivery, nearby duplicate delivery, invalid-signature rejection, forged-ACK rejection, revocation, and stale-epoch rejection operate on-device;
- complete local deletion, followed by two separate relaunches, leaves identity uncreated until an explicit create action.

No raw frames, keys, coordinates, database rows, UI XML, screenshots, or logs are retained in the repository.

## Validation

Windows validation passed: `npm run typecheck`; `npm test` (74/74); `npm run test:relay` (13/13); `npm run lint`; `npm run export:android` (641 modules, about 2.3 MB); `npx expo-doctor` (18/18); and `npx expo install --check`. Both full and production-omitted-dev audits report 17 advisories (6 high, 11 moderate, 0 critical); the reported Expo 57 upgrade is a major, out-of-scope change.

A fresh `expo run:android` invocation reached Gradle only after setting the verified local Android SDK path, but did not produce a build/install result within the bounded run. Generated Android output remains untracked.

## Required continuation before acceptance

1. Obtain a completed, evidenced fresh debug build/install or a precise bounded deployment diagnosis.
2. Complete the native Map state proof and the missing-private-key simulation.
3. Re-run reconstruction while the development inbound position remains inside its short retention window.
4. Execute the required 360x800, 390x844, 412x915, and 768x1024 real-target visual/accessibility matrix, including all tabs, changed controls, consent and transport states, deletion modal/back path, scrolling, safe areas, text scaling, and touch-target review.

Stage 4A must not start from this checkpoint.
