# AGENTS.md — CrownTrack ADV

## Mission

Build CrownTrack ADV as a private, offline-first, field-safe Android/iOS adventure-bike application for Alberta.

## Product principles

- Map-first, offline-first, field-safe, source-aware, and private-group first.
- Show unknown legality, freshness, source, and trust as unknown; never invent certainty.
- Use large controls, readable outdoor contrast, native patterns, and text-plus-color states.

## Non-negotiables

- Do not scrape or bulk-download restricted/paid map sources or public OpenStreetMap tiles.
- Do not add real API keys, secrets, production accounts, or production cloud services.
- Do not implement real GPS/background tracking or MapLibre before their staged contracts and acceptance gates.
- Do not commit generated native projects, APKs, database snapshots, logs, debug keystores, raw invitations, or private material.
- Do not claim signatures encrypt location content.

## Repository ownership

- `apps/mobile` owns screen composition and native adapters.
- `packages/crew-identity` owns portable identity, cryptography, canonical pairing, and platform-neutral lifecycle behavior.
- `packages/crew-protocol` owns wire schemas.
- `packages/crewlink` owns the canonical repository contract and forward-only migration plan.
- React state must not become a competing persistence layer.

## Identity and pairing rules

- Create device identity only after explicit user action.
- Generate private seeds from platform secure randomness and store them only in platform secure storage.
- SQLite may store public identity, trust, revocation, and replay metadata; never private seeds.
- Missing or mismatched private material must produce a visible reset state, never silent replacement.
- Validate signature/expiry before showing the comparison code.
- Validation creates no trust and consumes nothing; only explicit confirmation creates trust.
- Enforce cancellation, expiry, consumed replay, unexpected-key, and revocation checks before trust writes.
- Clear complete staged payloads on confirmation, cancellation, expiry pruning, or deletion.
- Complete reset/deletion must cover both secure storage and SQLite, report partial failure, and be safe to retry.
- Copy/paste and the second-rider simulator are development flows and must not claim to be a physical phone or production transport.

## Quality gates

Every milestone requires proportionate architecture, QA, UI/UX, security/privacy, automated, and native runtime review. UI work must be interacted with on a device and checked for clipping, scrolling, safe areas, accessibility, keyboard/Back, destructive states, and state clarity. Browser checks supplement but never replace native acceptance.

Every task handoff must include files changed, commands/tests, known gaps, evidence/manual checks, and a concise self-review.
