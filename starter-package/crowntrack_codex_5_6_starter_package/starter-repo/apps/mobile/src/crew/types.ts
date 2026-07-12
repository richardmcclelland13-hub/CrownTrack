export type TransportKind = 'cloud' | 'nearby' | 'mesh_radio' | 'simulated';
export type LinkState = 'unavailable' | 'discovering' | 'connecting' | 'connected' | 'degraded' | 'disconnected';
export type PresenceState = 'live' | 'recent' | 'stale' | 'unknown';
export type LocationSharePolicy = {
  enabled: boolean;
  groupIds: string[];
  precision: 'exact' | 'reduced';
  retentionMinutes: number;
  emergencyOverride: boolean;
};

export type CrewGroup = {
  id: string;
  name: string;
};

export type CrewPeer = {
  peerId: string;
  displayName: string;
  vehicle: string;
  presence: PresenceState;
  ageLabel: string;
  source?: TransportKind;
  revoked: boolean;
};

export type TransportStatus = {
  kind: Exclude<TransportKind, 'simulated'>;
  state: LinkState;
  label: string;
};

export type CrewSnapshot = {
  group?: CrewGroup;
  policy: LocationSharePolicy;
  consentConfirmed: boolean;
  peers: CrewPeer[];
  transports: TransportStatus[];
  queuedOutbox: number;
  diagnostics?: { adapter: string; schemaVersion: number; rowCounts: Record<string, number>; lastMigration: string };
  updatedAt: string;
};

export const sharingOffPolicy: LocationSharePolicy = {
  enabled: false,
  groupIds: [],
  precision: 'reduced',
  retentionMinutes: 120,
  emergencyOverride: false,
};
