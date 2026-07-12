# Data Ingest + Legal Source Matrix — Phase 6

## Rule
A map source cannot enter an offline pack until its source, licence, attribution, and offline-use status are recorded.

## Source matrix

| Source | Use | Risk | Required action |
|---|---|---:|---|
| Alberta public land recreation maps/data | PLUZ, trail/public land context | Medium | Preserve official source, date, disclaimers; do not overstate legality |
| Crown Land Trails dataset | Crown land trail linear features | Medium | Record dataset date and licence; validate geometries |
| OpenStreetMap data extract | Roads/access/trails/POI context | Medium | Attribute OSM/ODbL; generate own tiles; do not scrape public tile server |
| Natural Resources Canada elevation/topo | Contours, hillshade/topo context | Low/Medium | Preserve source metadata and licence |
| Private GPX | Personal route memory, hazards, ride history | Medium/High | Keep private by default; never mark as legal truth |
| Paid/commercial tiles | Satellite/terrain | High | Use only with explicit offline/redistribution licence |
| Gaia/Garmin/Google/Trailforks/BRMB/AllTrails data | Do not use | High | Do not scrape/copy/import proprietary content |

## Source confidence vocabulary

- `official`: official source explicitly supports the layer purpose.
- `verified`: user or team confirmed in field, but not necessarily official/legal.
- `user`: GPX or manually submitted.
- `unknown`: provenance incomplete.

## Legal status vocabulary

- `allowed`: official source explicitly permits route/use.
- `restricted`: official source indicates conditions or limits.
- `closed`: official source says closed/no motorized access.
- `unknown`: not enough information.
- `not_applicable`: fuel/camp/contour/etc.

## Product wording
Use “source confidence” and “verify access” rather than “legal/illegal” unless official source is specific.
