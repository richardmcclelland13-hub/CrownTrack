# UI Direction for Codex 5.6

## Design goal

Design CrownTrack like a premium native field tool, not like a generic dashboard or flashy generated mockup.

Reference vibe:

- Garmin seriousness
- Gaia GPS usefulness
- Apple/Android native calmness
- Alberta ADV ruggedness
- Not cyberpunk, not game UI, not oilfield SCADA

## Navigation model

Use 5 bottom tabs:

1. Map
2. Packs
3. Plan
4. Crew
5. SOS

Use bottom sheets/drawers for secondary actions from the map:

- Layers
- Active route
- Pack status
- Track controls
- Waypoint/hazard form
- Route warnings

## Visual language

### Palette

Use muted outdoor colours:

- Base: near-black charcoal
- Surface: dark slate/graphite
- Map land: deep muted green/grey
- Primary action: restrained trail green or GPS blue
- Warning: amber
- Danger/SOS: red/orange, used sparingly
- Legal unknown: amber/grey
- Offline good: green/blue

Avoid excessive glow. Elevation/terrain can have soft contrast, not neon.

### Typography

- Use a clean system font stack / platform default.
- High hierarchy: section label, important value, secondary caption.
- Do not use tiny captions for field-critical state.

### Controls

- 48dp minimum touch targets.
- Large one-hand action buttons.
- Emergency actions must be distinct and hard to mis-tap.
- Outdoor readability beats density.

## Map screen required layout

Top:

- App name or current pack
- Offline status
- GPS accuracy
- Active route/audit status

Center:

- Mock map canvas with route line, trails, hazards, buddy markers, pack boundary.

Bottom:

- Active route card / ride HUD
- Main actions: Start Track, Waypoint/Hazard, Layers
- Bottom tab bar

## UI challenge for Codex

Do **not** copy the HTML prototype. Treat it as a screen-flow reference. Create a better native UI system with reusable components and tokens.

Codex should produce:

- Design tokens
- Reusable cards/chips/buttons/sheets
- Mock map component
- Screen components
- State-driven examples
- Clear names and file organization
