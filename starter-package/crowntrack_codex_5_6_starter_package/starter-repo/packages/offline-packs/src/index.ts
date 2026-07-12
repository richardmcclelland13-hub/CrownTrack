import type { AdvRoute, RouteWarning } from '@crowntrack/core';

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
export type RouteCoverageResult = {
  routeId: string;
  requiredPackIds: string[];
  missingPackIds: string[];
  stalePackIds: string[];
  percentCovered: number;
  warnings: RouteWarning[];
};

export type PackHealth = 'ready' | 'warning' | 'attention';

export const transitionPackState = (state: PackInstallState, event: 'queue' | 'download' | 'verify' | 'success' | 'stale' | 'corrupt' | 'fail'): PackInstallState => {
  const transitions: Record<PackInstallState, Partial<Record<typeof event, PackInstallState>>> = {
    not_installed: { queue: 'queued' }, queued: { download: 'downloading' }, downloading: { verify: 'verifying', fail: 'failed' }, verifying: { success: 'installed', corrupt: 'corrupt', fail: 'failed' }, installed: { stale: 'stale' }, stale: { verify: 'verifying', download: 'downloading' }, corrupt: { queue: 'queued' }, failed: { queue: 'queued' },
  };
  return transitions[state][event] ?? state;
};

export const classifySourceWarning = (source: PackSource): RouteWarning | undefined => {
  if (source.offlineUseAllowed === 'unknown' || source.offlineUseAllowed === 'licensed_only') {
    return { id: `source-${source.id}`, severity: 'warning', category: 'source_confidence', title: 'Verify source use', detail: `${source.name} has an unresolved offline-use status. Do not treat it as riding permission.`, acknowledged: false };
  }
  return undefined;
};

export const getPackHealth = (pack: OfflinePackManifest): PackHealth => {
  if (pack.installState === 'installed' && !pack.sources.some((source) => classifySourceWarning(source))) return 'ready';
  if (pack.installState === 'stale' || pack.installState === 'installed') return 'warning';
  return 'attention';
};

export const auditRouteCoverage = (route: AdvRoute, packs: OfflinePackManifest[]): RouteCoverageResult => {
  const byId = new Map(packs.map((pack) => [pack.id, pack]));
  const missingPackIds = route.requiredPackIds.filter((id) => !byId.has(id) || byId.get(id)?.installState === 'not_installed');
  const stalePackIds = route.requiredPackIds.filter((id) => byId.get(id)?.installState === 'stale');
  const available = route.requiredPackIds.length - missingPackIds.length;
  const warnings: RouteWarning[] = [...route.warnings];
  missingPackIds.forEach((id) => warnings.push({ id: `missing-${id}`, severity: 'danger', category: 'offline_coverage', title: 'Offline coverage missing', detail: `Pack ${id} is not installed for this route.`, acknowledged: false }));
  stalePackIds.forEach((id) => warnings.push({ id: `stale-${id}`, severity: 'warning', category: 'offline_coverage', title: 'Pack needs attention', detail: `Pack ${id} is stale and should be refreshed before departure.`, acknowledged: false }));
  return { routeId: route.id, requiredPackIds: route.requiredPackIds, missingPackIds, stalePackIds, percentCovered: route.requiredPackIds.length ? Math.round((available / route.requiredPackIds.length) * 100) : 100, warnings };
};
