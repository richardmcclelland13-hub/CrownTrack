# Codex Prompt — Stage 3C GIS Pipeline Scaffold

Run this only after Stage 3A and Stage 3B are audited.

## Goal
Create a GIS/tooling scaffold that can later build offline packs, using mock/sample data only.

## Folder target
`tools/gis/`

## Build
- `sources/` folder convention: raw, normalized, output, manifests.
- Source metadata JSON schema.
- Licence audit script placeholder.
- Manifest generator from mock data.
- QA report generator from mock data.
- README with future GDAL/PostGIS/Tippecanoe/Planetiler options.

## Do not
- Do not download real Alberta data yet.
- Do not scrape OSM tiles.
- Do not include proprietary data.
