---
name: native-mobile-ui
description: Native mobile UI shell for CrownTrack ADV. Use when designing or implementing React Native screens, components, themes, navigation, bottom sheets, field-mode UI, or accessibility for the app.
---


# native-mobile-ui

## Purpose

Create a premium native-feeling React Native UI for CrownTrack ADV.

## Workflow

1. Read `design/UI_DIRECTION_FOR_CODEX_5_6.md`.
2. Read `docs/PRODUCT_BRIEF.md`.
3. Identify current screen/component scope.
4. Produce a small component map before coding.
5. Implement with reusable tokens/components, not one-off styles.
6. Preserve field-use constraints: readability, 48dp touch targets, contrast, clear states.

## Design rules

- Build Map/Packs/Plan/Crew/SOS as top-level destinations.
- Use bottom sheets/panels for secondary map tools.
- Make status visible: GPS, offline, route audit, legal/source confidence.
- Use outdoor muted colours, not neon.
- Keep emergency actions distinct.
- Avoid emoji as primary UI.

## Completion checklist

- Screens are navigable.
- Components are reusable.
- Theme tokens exist.
- Mock data shows key states.
- UI can be tested on small and large phone sizes.
