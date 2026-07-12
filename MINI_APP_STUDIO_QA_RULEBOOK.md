# CrownTrack ADV — Mini App Studio QA Rulebook

Apply this to every future milestone.

## Required review lanes

- Architecture
- Implementation
- UI/UX
- QA/test
- Security/privacy when location, identity, network, files, or permissions are involved
- Android platform review
- iOS parity review

## Required checks

- inspect existing code before planning
- use a dedicated stage branch
- run baseline checks before edits
- add tests with every domain change
- test failure states
- run typecheck, lint, tests, and platform build/export
- interact with UI in Chrome/device
- inspect multiple phone sizes
- inspect font scaling
- check safe areas, scrolling, clipping, overlap, and keyboard behavior
- keep screenshots and a QA report
- do not mark a stage accepted; mark it Needs audit for Richard/ChatGPT review

## UI quality gate

A screen fails if:

- text is clipped or hidden
- controls overlap
- a required action is unreachable with one hand
- sheets cover critical navigation without a clear close path
- state depends only on color
- stale data appears live
- touch targets are too small for field use
- offline or legal/source uncertainty is hidden
- web-only success is presented as native success

## Dependency gate

- inspect audit details
- avoid force upgrades
- separate runtime and development exposure
- prefer minimal upgrades
- document temporary accepted risks
- do not trade stable architecture for a cosmetic zero-warning count

## Final report gate

Every Codex stage response must include:

- result
- summary
- files changed
- commands
- tests
- visual QA
- Android validation
- iOS parity status
- known gaps
- next stage recommendation
