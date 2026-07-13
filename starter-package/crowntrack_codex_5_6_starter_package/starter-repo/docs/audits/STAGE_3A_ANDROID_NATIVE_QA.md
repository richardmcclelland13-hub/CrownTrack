# Stage 3A Android native QA

- Date: 2026-07-12
- Device: `emulator-5554`
- Result: Passed

The installed x86_64 native APK ran with Hermes, Expo SQLite, Expo SecureStore, and Expo Crypto. TypeScript-only closure changes were delivered through Metro 8081; native dependencies/configuration were already present, so the APK was not rebuilt.

Verified on device:

- clean startup and explicit identity creation;
- same shortened fingerprint after force-stop/relaunch;
- SQLite contains no private seed; SecureStore contains the seed only while identity is ready;
- missing-key state and no silent regeneration;
- stage-without-trust, code-after-verification, explicit confirmation, and trust restart persistence;
- expiry, tamper, malformed input, cancellation replay, consumed replay, key change, revocation, and revoked-identity rejection;
- SecureStore and SQLite complete deletion, followed by two clean relaunches;
- copy through Android share sheet, paste keyboard, Back, scroll, long names, error text, confirmations, safe areas, navigation bars, and text-plus-color states.

The Expo app is intentionally portrait-locked; rotation requests preserved the portrait layout. Redacted evidence is under `artifacts/stage-3a-native-qa/`. No APK, database, build/runtime log, raw invitation, private material, or secret-bearing screenshot is tracked.
