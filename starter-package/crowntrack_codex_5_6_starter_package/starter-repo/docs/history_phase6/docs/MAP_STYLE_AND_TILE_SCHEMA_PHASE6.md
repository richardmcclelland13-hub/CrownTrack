# Map Style + Tile Schema — Phase 6

## Target renderer
Long-term target remains MapLibre Native through React Native.

## Style principle
The map should be legible outdoors, not decorative.

Layer order:

1. Background / landcover
2. Hillshade / terrain
3. Hydrography
4. Roads
5. Trails
6. PLUZ/public land overlays
7. Route line
8. Track breadcrumb
9. Waypoints/hazards/fuel/camp
10. Buddy positions
11. Labels

## Draft source layers

```text
base_land
hydro
roads_access
trails_official
trails_osm
trails_user_gpx
pluz_boundary
public_land_context
poi_fuel
poi_camp
poi_staging
hazards_user
contours
hillshade
```

## Feature metadata fields

Every feature should carry:

```ts
source_id: string
source_name: string
source_type: 'official' | 'osm' | 'user_gpx' | 'derived' | 'licensed'
source_date: string
licence_id: string
confidence: 'official' | 'verified' | 'user' | 'unknown'
legal_status: 'allowed' | 'restricted' | 'closed' | 'unknown' | 'not_applicable'
updated_at: string
notes?: string
```

## Visual design notes
- Official trails: strong green.
- OSM access roads: neutral light gravel.
- User GPX: dotted blue/amber depending confidence.
- PLUZ: amber/purple boundary overlay, never heavy enough to hide route.
- Closed/restricted: red line with clear label.
- Unknown: grey/amber; never use green for unknown.
