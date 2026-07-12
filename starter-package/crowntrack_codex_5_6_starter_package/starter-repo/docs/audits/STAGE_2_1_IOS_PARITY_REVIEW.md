# Stage 2.1 iOS parity review

Status: static review only; no iOS build was run on Windows.

The adapter uses Expo SQLite's cross-platform async API, parameterized statements, and platform-neutral path name. Web is explicitly in-memory and has no SQLite claim. `SafeAreaProvider` and `SafeAreaView` remain active; no iOS-only permission, background location, Bluetooth, local-network, or encrypted-storage configuration was added.

Later macOS validation must cover Xcode simulator and physical iPhone startup, migration from legacy Stage 2 state, app termination/relaunch, group/peer deletion, retention pruning, safe areas, rotation, keyboard, background/foreground transitions, data protection/backups, and a future key-storage design.
