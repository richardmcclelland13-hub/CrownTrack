export type LatLng = { lat: number; lng: number };

export type GpsFix = LatLng & {
  timestamp: string;
  accuracyM: number;
  altitudeM?: number;
  speedKph?: number;
  headingDeg?: number;
  source: 'mock' | 'device' | 'imported';
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
export type TrackSample = GpsFix & { segmentId: string };
export type WaypointKind = 'camp' | 'fuel' | 'hazard' | 'gate' | 'water' | 'viewpoint' | 'help' | 'note';

export type Waypoint = LatLng & {
  id: string;
  kind: WaypointKind;
  title: string;
  note?: string;
  createdAt: string;
  source: 'user' | 'shared' | 'official' | 'mock';
};

/** @deprecated Use the CrewLink protocol entities, which separate fix source from transport. */
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
  riderCard: { displayName: string; emergencyContact?: string; bike?: string; notes?: string };
  exportFormats: ('gpx' | 'geojson' | 'text')[];
};

export type RouteProgress = { distanceM: number; percent: number; nextPoint?: RoutePoint };
export type RideEvent = 'load_audit' | 'audit_passed' | 'start' | 'pause' | 'resume' | 'stop' | 'save';

const distanceBetween = (a: LatLng, b: LatLng): number => {
  const latScale = 111_320;
  const lngScale = Math.cos(((a.lat + b.lat) / 2) * Math.PI / 180) * latScale;
  return Math.hypot((b.lat - a.lat) * latScale, (b.lng - a.lng) * lngScale);
};

export const calculateRouteProgress = (route: AdvRoute, fix: LatLng): RouteProgress => {
  if (route.points.length < 2 || route.distanceM <= 0) return { distanceM: 0, percent: 0, nextPoint: route.points[0] };
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;
  route.points.forEach((point, index) => {
    const distance = distanceBetween(point, fix);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });
  const fallbackDistance = route.distanceM * (nearestIndex / (route.points.length - 1));
  const distanceM = Math.max(0, Math.min(route.distanceM, route.points[nearestIndex].distanceFromStartM ?? fallbackDistance));
  return {
    distanceM,
    percent: Math.round((distanceM / route.distanceM) * 100),
    nextPoint: route.points[Math.min(nearestIndex + 1, route.points.length - 1)],
  };
};

export const transitionRideSession = (state: RideSessionState, event: RideEvent): RideSessionState => {
  const transitions: Record<RideSessionState, Partial<Record<RideEvent, RideSessionState>>> = {
    idle: { load_audit: 'audit_required', audit_passed: 'ready', start: 'recording' },
    audit_required: { audit_passed: 'ready' },
    ready: { start: 'recording', load_audit: 'audit_required' },
    navigating: { start: 'recording', stop: 'saved' },
    recording: { pause: 'paused', stop: 'saved', save: 'saved' },
    paused: { resume: 'recording', stop: 'saved', save: 'saved' },
    saved: { load_audit: 'audit_required' },
  };
  return transitions[state][event] ?? state;
};

export const createRescuePacket = (
  displayName: string,
  activeRoute: AdvRoute | undefined,
  currentFix: GpsFix | undefined,
  recentTrack: TrackSample[],
): RescuePacket => ({
  id: `rescue-${currentFix?.timestamp ?? 'unknown'}`,
  createdAt: currentFix?.timestamp ?? new Date(0).toISOString(),
  currentFix,
  recentTrack: recentTrack.slice(-30),
  activeRoute,
  riderCard: { displayName, bike: 'Yamaha Ténéré 700', notes: 'Mock rescue packet; verify source and location before sharing.' },
  exportFormats: ['gpx', 'geojson', 'text'],
});
