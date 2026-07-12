# Map Pack Pipeline Spec — Phase 6

## Purpose
CrownTrack offline packs must be generated, versioned, audited, and installed like real product artifacts, not random downloaded tiles.

## Pipeline stages

1. **Source snapshot**
   - Save raw files with date, URL, licence, checksum, and notes.
   - Never mutate raw files.

2. **Source audit**
   - Validate licence.
   - Validate attribution requirement.
   - Mark whether the source can be redistributed.
   - Mark whether it can be used offline.

3. **Normalize**
   - Convert source geometries into common schema.
   - Apply layer names.
   - Add source IDs, confidence, timestamps, and disclaimers.

4. **Validate geometries**
   - Check empty geometries.
   - Check invalid lines/polygons.
   - Check coordinate reference system.
   - Check duplicate features.

5. **Tile/build**
   - Generate vector tile output for the app.
   - Candidate formats: PMTiles, MBTiles, MapLibre offline pack database, or app-specific bundle.

6. **Style**
   - Generate/validate MapLibre Style JSON.
   - Ensure layers map to known source-layer names.

7. **Manifest**
   - Create JSON manifest.
   - Include bbox, version, sources, hashes, layers, attribution, date, QA status.

8. **Publish**
   - Place artifact in local/server storage.
   - App fetches manifest first, then pack artifact.

9. **Install on device**
   - Download.
   - Verify checksum.
   - Store pack.
   - Index local search if needed.
   - Mark ready.

## Pack manifest draft

```ts
export type OfflinePackManifest = {
  packId: string;
  title: string;
  region: 'alberta' | string;
  version: string;
  format: 'pmtiles' | 'mbtiles' | 'maplibre-offline-pack' | 'bundle';
  bbox: [number, number, number, number];
  minZoom: number;
  maxZoom: number;
  sizeBytes: number;
  layers: PackLayer[];
  sources: PackSource[];
  attribution: AttributionBundle[];
  checksums: Record<string, string>;
  legalConfidence: 'official' | 'mixed' | 'user' | 'unknown';
  generatedAt: string;
  expiresAt?: string;
  qa: PackQaSummary;
};
```

## Important rule
Do not build offline packs by scraping public web map tiles. Build from legal source data or a licensed provider.
