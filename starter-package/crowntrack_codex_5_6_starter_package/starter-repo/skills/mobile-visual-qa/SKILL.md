---
name: mobile-visual-qa
description: Interactively inspect CrownTrack mobile UI changes in a browser, simulator, or device across required viewports and states. Use for Map, Crew, consent, transport, modal, tab, safe-area, text-scaling, accessibility, clipping, overlap, scroll, and field-use validation.
---

# Mobile visual QA

1. Run the real Expo web target or native build; source inspection is insufficient.
2. Test 360x800, 390x844, 412x915, and 768x1024 viewports.
3. Interact with every changed control and all five tabs.
4. Exercise consent off/on, transport connected/unavailable, queued outbox, buddy live/recent/stale/unknown, deletion confirmation, and SOS regression.
5. Check safe areas, scrolling, clipping, overlap, hidden buttons, keyboard/modal close paths, and 48dp touch targets.
6. Check text scaling where practical; do not suppress scaling on field-critical text.
7. Require text labels in addition to status color.
8. Capture screenshots to the milestone artifact folder without exposing real coordinates.
9. Record each viewport, interaction, failure, fix, and limitation.
10. Treat browser success as supplemental; do not claim native lifecycle, radio, SQLite, or background validation.
