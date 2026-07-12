# TypeScript Data Contracts

These are product contracts. Codex can adjust exact shapes during implementation, but the concepts must remain.

```ts
export type LatLng = {
  lat: number;
  lng: number;
};

export type GpsFix = LatLng & {
  timestamp: string;
  accuracyM: number;
  altitudeM?: number;
  speedKph?: number;
  headingDeg?: number;
  source: 'mock' | 'device' | 'mesh' | 'imported';
};

export type RoutePoint = LatLng & {
  id: string;
  label?: string;
  distanceFromStartM?: number;
};

export type RouteWarning = {
  id: string;
  severity: 'info' | 'warning' | 'danger';
  category: 'offline_coverage' | 'legal_unknown' | 'source_confidence' | 'route_gap' | 'fuel_range' | 'weather' | 'closure';
  title: string;
  detail: string;
  acknowledged: boolean;
};

export type AdvRoute = {
  id: string;
  name: string;
  source: 'user_gpx' | 'planned' | 'shared' | 'official' | 'mock';
  points: RoutePoint[];
  distanceM: number;
  estimatedMovingMinutes?: number;
  warnings: RouteWarning[];
  requiredPackIds: string[];
};

export type RideSessionState = 'idle' | 'audit_required' | 'ready' | 'navigating' | 'recording' | 'paused' | 'saved';

export type TrackSample = GpsFix & {
  segmentId: string;
};

export type WaypointKind = 'camp' | 'fuel' | 'hazard' | 'gate' | 'water' | 'viewpoint' | 'help' | 'note';

export type Waypoint = LatLng & {
  id: string;
  kind: WaypointKind;
  title: string;
  note?: string;
  createdAt: string;
  source: 'user' | 'shared' | 'official' | 'mock';
};

export type PackInstallState = 'not_installed' | 'queued' | 'downloading' | 'verifying' | 'installed' | 'stale' | 'corrupt' | 'failed';

export type PackSource = {
  id: string;
  name: string;
  type: 'osm_data' | 'alberta_open_data' | 'nrcan' | 'user_gpx' | 'manual' | 'licensed_provider';
  licenceName: string;
  attributionRequired: boolean;
  offlineUseAllowed: 'yes' | 'no' | 'unknown' | 'licensed_only';
  sourceUrl?: string;
  checkedAt: string;
  notes?: string;
};

export type OfflinePackManifest = {
  id: string;
  name: string;
  version: string;
  regionName: string;
  bounds: [number, number, number, number];
  sizeMb: number;
  generatedAt: string;
  expiresAt?: string;
  sources: PackSource[];
  layers: LayerRegistryItem[];
  attributionText: string[];
  installState: PackInstallState;
};

export type LayerRegistryItem = {
  id: string;
  name: string;
  category: 'base' | 'trail' | 'boundary' | 'safety' | 'poi' | 'terrain' | 'user';
  minZoom?: number;
  maxZoom?: number;
  sourceIds: string[];
  visibleByDefault: boolean;
  confidence: 'official' | 'community' | 'user_verified' | 'unknown';
};

export type RouteCoverageResult = {
  routeId: string;
  requiredPackIds: string[];
  missingPackIds: string[];
  stalePackIds: string[];
  percentCovered: number;
  warnings: RouteWarning[];
};

export type CrewMemberStatus = {
  id: string;
  displayName: string;
  vehicle?: string;
  status: 'live' | 'stale' | 'offline' | 'sos' | 'unknown';
  lastFix?: GpsFix;
  lastSeenAt?: string;
  source: 'cell' | 'mesh' | 'manual' | 'mock';
};

export type RescuePacket = {
  id: string;
  createdAt: string;
  currentFix?: GpsFix;
  recentTrack: TrackSample[];
  activeRoute?: AdvRoute;
  riderCard: {
    displayName: string;
    emergencyContact?: string;
    bike?: string;
    notes?: string;
  };
  exportFormats: ('gpx' | 'geojson' | 'text')[];
};
```
