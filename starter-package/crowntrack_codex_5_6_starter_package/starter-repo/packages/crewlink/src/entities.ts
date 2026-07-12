import type { CrewAck, LinkState, LocationEnvelope, LocationFix, LocationSharePolicy, PeerIdentity, PresenceState, TransportKind } from '@crowntrack/crew-protocol';
export type { CrewAck, LinkState, LocationEnvelope, LocationFix, LocationSharePolicy, PeerIdentity, PresenceState, TransportKind } from '@crowntrack/crew-protocol';

export type Clock = { now(): Date };
export type IdGenerator = { next(): string };

export interface RideGroup {
  groupId: string;
  name: string;
  createdAt: string;
}

export interface CrewPeer extends PeerIdentity {
  addedAt: string;
  vehicle?: string;
}

export interface GroupMembership {
  groupId: string;
  peerId: string;
  joinedAt: string;
}

export interface StoredSharePolicy extends LocationSharePolicy {
  peerId: string;
  consentConfirmed: boolean;
  updatedAt: string;
}

export type OutboxState = 'queued' | 'awaiting_ack' | 'exhausted';

export interface OutboxItem {
  envelope: LocationEnvelope;
  ownerPeerId: string;
  state: OutboxState;
  attempts: number;
  nextAttemptAt: string;
  lastAttemptAt?: string;
  sentVia: TransportKind[];
}

export interface PeerPosition {
  envelope: LocationEnvelope;
  receivedAt: string;
}

export interface DeliveryObservation {
  messageId: string;
  transport: TransportKind;
  observedAt: string;
  duplicate: boolean;
}

export interface TransportStatus {
  kind: TransportKind;
  state: LinkState;
  changedAt: string;
}

export interface PresenceSnapshot {
  peer: CrewPeer;
  groupId: string;
  state: PresenceState;
  lastPosition?: PeerPosition;
  ageMs?: number;
  observedTransports: TransportKind[];
}

export type InboundDisposition = 'accepted' | 'duplicate' | 'sequence_regression';

export interface InboundWriteResult {
  disposition: InboundDisposition;
  latest?: PeerPosition;
}

export interface RetentionLimits {
  historyPerPeer: number;
  deduplicationIds: number;
  acknowledgements: number;
  observations: number;
}

export interface CrewRepositoryDiagnostics {
  adapter: string;
  schemaVersion: number;
  rowCounts: Record<string, number>;
  lastMigration: string;
}

export const DEFAULT_RETENTION_LIMITS: RetentionLimits = {
  historyPerPeer: 100,
  deduplicationIds: 2_000,
  acknowledgements: 1_000,
  observations: 2_000,
};
