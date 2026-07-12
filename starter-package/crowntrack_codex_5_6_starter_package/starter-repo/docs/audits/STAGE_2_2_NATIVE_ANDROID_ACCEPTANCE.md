# Stage 2.2 Android native acceptance

Status: needs fixes — no Android runtime was available.

## Preflight recorded

- Branch: `stage-2-1-native-persistence-closure`.
- Git author: Richard McClelland `<richard.mcclelland13@gmail.com>`.
- Node `v24.12.0`; npm `11.7.0`.
- Java: JRE `1.8.0_491`; no JDK 17 or `JAVA_HOME`.
- Android Studio and SDK exist at `C:\\Users\\Rick\\AppData\\Local\\Android\\Sdk`.
- `ANDROID_HOME` and `ANDROID_SDK_ROOT` are unset; tools are not on `PATH`.
- Direct `adb.exe devices -l` found no connected device.
- Direct `emulator.exe -list-avds` found no AVD.
- SDK has platform `android-36.1` and no system images.
- SDK Build-Tools `36.1.0` and `37.0.0` are installed; command-line tools and `sdkmanager` are absent, so SDK license acceptance cannot be checked locally.

## Passing regression evidence

- `npm run typecheck`
- `npm run lint`
- `npm test`: 28 passing
- `npm run test:relay`: 9 passing
- `npx expo-doctor`: 18/18 passing
- `npx expo install --check`: dependencies up to date
- `npm run export:android`: Android Hermes bundle exported successfully (1.95 MB)

## Runtime acceptance matrix not executed

The current environment cannot build/install a native dev client or exercise the Expo SQLite module. Therefore no claim is made for fresh-launch persistence, migration on device, force-stop/relaunch persistence, deletion-after-restart, Android Back, rotation, keyboard, or system-bar behavior.

## Required closure procedure

1. Install JDK 17 and set `JAVA_HOME`.
2. Install Android command-line tools, accept required SDK licenses, and install a compatible system image if using an emulator.
3. Set `ANDROID_HOME` or `ANDROID_SDK_ROOT` to `C:\\Users\\Rick\\AppData\\Local\\Android\\Sdk`; add `platform-tools`, `emulator`, and command-line tools to `PATH`.
4. Provide an AVD with a system image or connect a physical device; verify with `adb devices -l`.
5. Run `npm --workspace apps/mobile exec expo -- run:android`.
6. Create a group and policy, queue an update, force-stop/relaunch, and verify persisted group, policy, outbox, and schema diagnostics.
7. Delete peer/group data, force-stop/relaunch, and verify affected records remain absent.
8. Capture non-sensitive screenshots and logs in `artifacts/stage-2-2-native-qa/`.
