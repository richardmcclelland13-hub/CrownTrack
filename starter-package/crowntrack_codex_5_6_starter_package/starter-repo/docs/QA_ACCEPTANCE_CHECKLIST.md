# QA Acceptance Checklist

## UI shell

- All five tabs render.
- No critical control is smaller than 48dp equivalent.
- Offline/GPS/route/legal status is visible.
- SOS is visible but not easy to accidentally trigger.
- Dark mode/field mode is readable.
- Mock data includes good, stale, missing, warning, and unknown states.

## Engineering

- TypeScript passes.
- Tests pass where tests exist.
- Domain packages are pure TS.
- No secrets/API keys.
- No network calls in mock phase.
- No real map tile downloads.

## Final report

Codex must list files changed, commands run, results, known gaps, and next recommended stage.
