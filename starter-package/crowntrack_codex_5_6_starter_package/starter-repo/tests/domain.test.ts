import {
  calculateRouteProgress,
  createRescuePacket,
  transitionRideSession,
  type AdvRoute,
  type GpsFix,
} from '@crowntrack/core';
import {
  auditRouteCoverage,
  classifySourceWarning,
  transitionPackState,
  type OfflinePackManifest,
} from '@crowntrack/offline-packs';

const route: AdvRoute = {
  id: 'route-test',
  name: 'Test Route',
  source: 'mock',
  points: [
    { id: 'a', lat: 53, lng: -115 },
    { id: 'b', lat: 53.01, lng: -115.01 },
  ],
  distanceM: 1_500,
  warnings: [],
  requiredPackIds: ['pack-a'],
};

const fix: GpsFix = {
  lat: 53.005,
  lng: -115.005,
  timestamp: '2026-07-11T12:00:00.000Z',
  accuracyM: 8,
  source: 'mock',
};

const pack = (installState: OfflinePackManifest['installState']): OfflinePackManifest => ({
  id: 'pack-a',
  name: 'Test Pack',
  version: '1.0.0',
  regionName: 'Alberta',
  bounds: [-116, 52, -114, 54],
  sizeMb: 100,
  generatedAt: '2026-07-01T00:00:00.000Z',
  sources: [],
  layers: [],
  attributionText: [],
  installState,
});

const progress = calculateRouteProgress(route, fix);
if (progress.percent < 0 || progress.percent > 100 || !progress.nextPoint) throw new Error('route progress should be bounded');
if (transitionRideSession('idle', 'start') !== 'recording') throw new Error('start transition failed');
if (transitionRideSession('recording', 'pause') !== 'paused') throw new Error('pause transition failed');
if (createRescuePacket('rider', route, fix, []).riderCard.displayName !== 'rider') throw new Error('rescue packet failed');
if (auditRouteCoverage(route, [pack('not_installed')]).percentCovered !== 0) throw new Error('coverage audit failed');
if (transitionPackState('installed', 'stale') !== 'stale') throw new Error('pack transition failed');
if (classifySourceWarning({
  id: 'unknown', name: 'Unknown', type: 'manual', licenceName: 'Unknown', attributionRequired: false,
  offlineUseAllowed: 'unknown', checkedAt: '2026-07-11',
})?.severity !== 'warning') throw new Error('source warning failed');

console.log('domain tests passed');
