# Stage 3A iOS parity review

- Date: 2026-07-12
- Result: Static review passed; iOS runtime unverified

The Stage 3A adapter uses Expo SDK 52 APIs that are cross-platform at the source level: SecureStore, Crypto random bytes, SQLite async transactions, and the React Native share sheet. `WHEN_UNLOCKED_THIS_DEVICE_ONLY` maps to an iOS Keychain accessibility class and prevents migration to a different device. The portable Noble Ed25519 provider has no Node-only runtime dependency in the app path.

Expected iOS behaviors match Android: explicit identity creation, Keychain seed persistence, SQLite public metadata, staged confirmation, revocation, and two-layer reset. The UI uses shared React Native components, concealed paste input, text-plus-color trust states, safe-area-aware screen layout, and the system share sheet.

Not verified on iOS runtime:

- Keychain persistence across termination/reinstall/backup variations;
- SQLite migration and exclusive-transaction behavior on a simulator/device;
- copy/paste keyboard, VoiceOver, rotation policy, safe areas, and destructive confirmations;
- native sign/verify performance and error behavior.

No claim of iOS runtime acceptance is made. These checks remain a future platform gate.
