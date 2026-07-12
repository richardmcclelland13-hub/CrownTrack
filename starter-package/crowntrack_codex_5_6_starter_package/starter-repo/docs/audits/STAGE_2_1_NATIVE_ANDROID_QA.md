# Stage 2.1 native Android QA

Status: superseded by Stage 2.2 preflight; native runtime acceptance remains incomplete.

## Available evidence

- Expo Doctor: 18/18 checks pass.
- Expo dependency compatibility check: pass.
- Android/Hermes export: pass.
- Expo SQLite 15.1.4 is installed and the native adapter uses `openDatabaseAsync`, exclusive transactions, `PRAGMA foreign_keys`, WAL where supported, canonical migrations, and parameterized statements.

## Missing runtime prerequisites

Stage 2.2 found Android Studio and the Android SDK at `C:\\Users\\Rick\\AppData\\Local\\Android\\Sdk`; `adb.exe` and `emulator.exe` exist there but are not configured on `PATH`. There are no connected devices, AVDs, or installed system images. Only JRE 8 is present; a modern Android Gradle path needs JDK 17. This managed Expo repository has no generated Android project or merged manifest.

## Required later procedure

Install JDK 17 and either an AVD/system image or connect a physical device. Configure `ANDROID_HOME`/`ANDROID_SDK_ROOT` and add SDK tools to `PATH`. Then run `npm --workspace apps/mobile exec expo -- run:android`, create a group, enable consent, queue an update, force-stop/relaunch, verify state, delete data, force-stop/relaunch, and verify deletion. Capture non-sensitive screenshots/logs under `artifacts/stage-2-2-native-qa/`.

No native restart, SQLite migration, system-bar, rotation, keyboard, back-button, permission, or deletion-after-restart claim is made by this stage.
