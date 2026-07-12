import type { AdvRoute, CrewMemberStatus, GpsFix, TrackSample } from '@crowntrack/core';
import type { OfflinePackManifest } from '@crowntrack/offline-packs';

export const mockFix: GpsFix = { lat: 53.533, lng: -115.281, timestamp: '2026-07-11T18:32:00.000Z', accuracyM: 8, altitudeM: 1_220, speedKph: 34, headingDeg: 82, source: 'mock' };

export const mockRoute: AdvRoute = {
  id: 'route-sundance-ridge', name: 'Sundance Ridge Loop', source: 'user_gpx', distanceM: 86_400, estimatedMovingMinutes: 178,
  points: [
    { id: 'start', lat: 53.48, lng: -115.38, label: 'Staging area', distanceFromStartM: 0 },
    { id: 'fuel', lat: 53.51, lng: -115.34, label: 'Fuel check', distanceFromStartM: 21_600 },
    { id: 'ridge', lat: 53.55, lng: -115.30, label: 'Ridge crossing', distanceFromStartM: 43_200 },
    { id: 'exit', lat: 53.57, lng: -115.23, label: 'North exit', distanceFromStartM: 64_800 },
    { id: 'finish', lat: 53.48, lng: -115.38, label: 'Return to staging', distanceFromStartM: 86_400 },
  ],
  warnings: [
    { id: 'legal-unknown', severity: 'warning', category: 'legal_unknown', title: 'Verify access at ridge crossing', detail: 'The route line is user-owned GPX data. Riding permission is unknown from geometry alone.', acknowledged: false },
    { id: 'fuel-range', severity: 'info', category: 'fuel_range', title: 'Fuel stop planned', detail: 'Fuel check waypoint is 21.6 km from the staging area.', acknowledged: false },
  ],
  requiredPackIds: ['pack-yellowhead', 'pack-sundance'],
};

const sharedSources = [{ id: 'alberta-pluz', name: 'Alberta open land data', type: 'alberta_open_data' as const, licenceName: 'Confirm before production use', attributionRequired: true, offlineUseAllowed: 'unknown' as const, checkedAt: '2026-07-09', notes: 'Mock source: licence status intentionally unresolved.' }];

export const mockPacks: OfflinePackManifest[] = [
  { id: 'pack-yellowhead', name: 'Yellowhead East', version: '0.8.2', regionName: 'Yellowhead County', bounds: [-115.7, 53.2, -114.8, 53.9], sizeMb: 482, generatedAt: '2026-07-02T00:00:00.000Z', expiresAt: '2026-09-30T00:00:00.000Z', sources: sharedSources, layers: [{ id: 'roads', name: 'Gravel & forestry roads', category: 'trail', sourceIds: ['alberta-pluz'], visibleByDefault: true, confidence: 'unknown' }], attributionText: ['Mock pack — source attribution must be confirmed before release.'], installState: 'installed' },
  { id: 'pack-sundance', name: 'Sundance Ridge', version: '0.7.4', regionName: 'Sundance Provincial Forest', bounds: [-115.5, 53.3, -115.0, 53.7], sizeMb: 318, generatedAt: '2026-05-18T00:00:00.000Z', expiresAt: '2026-06-30T00:00:00.000Z', sources: sharedSources, layers: [{ id: 'boundaries', name: 'Access boundaries', category: 'boundary', sourceIds: ['alberta-pluz'], visibleByDefault: true, confidence: 'unknown' }], attributionText: ['Mock pack — stale coverage needs review.'], installState: 'stale' },
  { id: 'pack-nordegg', name: 'Nordegg Base', version: '0.9.1', regionName: 'Brazeau foothills', bounds: [-116.2, 52.9, -115.4, 53.4], sizeMb: 226, generatedAt: '2026-07-05T00:00:00.000Z', sources: [], layers: [], attributionText: [], installState: 'not_installed' },
  { id: 'pack-corrupt', name: 'Legacy import', version: '0.2.0', regionName: 'Old test area', bounds: [-116, 52, -115, 53], sizeMb: 124, generatedAt: '2026-03-11T00:00:00.000Z', sources: [], layers: [], attributionText: [], installState: 'corrupt' },
];

export const mockCrew: CrewMemberStatus[] = [
  { id: 'maya', displayName: 'Maya Chen', vehicle: 'KTM 890 Adventure', status: 'live', lastFix: { ...mockFix, lat: 53.541, lng: -115.267, timestamp: '2026-07-11T18:31:45.000Z', source: 'mock' }, lastSeenAt: '18:31', source: 'cell' },
  { id: 'jordan', displayName: 'Jordan Ellis', vehicle: 'Africa Twin', status: 'stale', lastFix: { ...mockFix, lat: 53.518, lng: -115.318, timestamp: '2026-07-11T18:12:00.000Z', source: 'mock' }, lastSeenAt: '18:12', source: 'mesh' },
  { id: 'devon', displayName: 'Devon Park', vehicle: 'Ténéré 700', status: 'offline', lastSeenAt: '17:46', source: 'manual' },
  { id: 'sam', displayName: 'Sam Ortiz', vehicle: 'F 850 GS', status: 'sos', lastSeenAt: '18:29', source: 'mock' },
];

export const mockTrack: TrackSample[] = [0, 1, 2].map((index) => ({ ...mockFix, lat: mockFix.lat + index * 0.001, lng: mockFix.lng - index * 0.001, timestamp: `2026-07-11T18:3${index}:00.000Z`, segmentId: 'ridge-crossing' }));
