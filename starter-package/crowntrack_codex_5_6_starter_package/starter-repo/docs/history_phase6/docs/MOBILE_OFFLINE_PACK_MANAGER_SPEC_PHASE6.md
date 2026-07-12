# Mobile Offline Pack Manager Spec — Phase 6

## UX goals
The rider must know before leaving service:

- Is the correct pack installed?
- Is it complete and verified?
- Is the route inside the pack boundary?
- Does the route require layers not installed?
- Is any data stale or source-weak?

## Install states

```ts
type PackInstallState =
  | 'not_installed'
  | 'queued'
  | 'downloading'
  | 'downloaded'
  | 'verifying'
  | 'ready'
  | 'stale'
  | 'corrupt'
  | 'failed'
  | 'deleting';
```

## Required behaviours
- Download can pause/resume.
- Verification must run before `ready`.
- Checksum failure marks `corrupt` or `failed`.
- Stale pack remains usable but shows warning.
- Route audit must fail if coverage is missing.
- User can delete packs to recover storage.
- App must not delete active pack while navigating.

## UI surfaces
- Pack list screen.
- Pack detail bottom sheet.
- Route pre-flight audit.
- Storage management.
- Source/attribution screen.
- Update prompt.

## Local storage
Initial implementation can use mock in-memory data. Later use SQLite/MMKV/file-system storage.
