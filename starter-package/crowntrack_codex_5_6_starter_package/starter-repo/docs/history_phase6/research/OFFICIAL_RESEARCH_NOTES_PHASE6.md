# Official Research Notes — Phase 6

These notes guide implementation decisions. Re-verify before production because docs and platform requirements can change.

## MapLibre / offline packs
- MapLibre React Native `OfflineManager` manages offline packs asynchronously and maintains a collection of offline packs.
- MapLibre Android supports PMTiles as a data source using `pmtiles://` in supported versions.
- PMTiles is a single-file tiled-data archive suitable for serverless/static hosting and offline-style packaging.

## OSM
- OSM public tile servers must not be bulk downloaded or used to create offline archives.
- Use OSM data extracts with proper ODbL attribution and generate/host your own tiles or use a licensed provider.

## Alberta data
- Alberta provides public land recreation maps and an Interactive Recreation Map.
- Alberta PLUZ pages describe Public Land Use Zones and note 18 PLUZs currently designated.
- Crown Land Trails dataset describes linear trail features on Crown land administered under Alberta public land legislation.

## Mobile location
- iOS background location requires proper background mode configuration.
- Android foreground service types and permissions must be declared correctly for location tracking.

## Implementation consequence
Do not build real GPS or real map packs until pure data contracts and registry states are stable.
