import type {
  CrewAck,
  CrewPeer,
  CrewRepositoryDiagnostics,
  DeliveryObservation,
  GroupMembership,
  InboundWriteResult,
  LocationEnvelope,
  OutboxItem,
  PeerPosition,
  RetentionLimits,
  RideGroup,
  StoredSharePolicy,
  TransportKind,
  TransportStatus,
} from './entities';
import { DEFAULT_RETENTION_LIMITS } from './entities';

export interface CrewRepository {
  initialize(): Promise<void>;
  putPeer(peer: CrewPeer): Promise<void>;
  getPeer(peerId: string): Promise<CrewPeer | undefined>;
  listPeers(groupId: string): Promise<CrewPeer[]>;
  putGroup(group: RideGroup): Promise<void>;
  getGroup(groupId: string): Promise<RideGroup | undefined>;
  putMembership(membership: GroupMembership): Promise<void>;
  putSharePolicy(policy: StoredSharePolicy): Promise<void>;
  getSharePolicy(peerId: string): Promise<StoredSharePolicy | undefined>;
  enqueue(item: OutboxItem): Promise<void>;
  updateOutbox(item: OutboxItem): Promise<void>;
  getOutbox(messageId: string): Promise<OutboxItem | undefined>;
  listOutbox(): Promise<OutboxItem[]>;
  listDueOutbox(at: string): Promise<OutboxItem[]>;
  deleteOutbox(messageId: string): Promise<void>;
  purgeUnsentLocations(peerId: string, groupId?: string): Promise<number>;
  acceptInbound(envelope: LocationEnvelope, receivedAt: string, transport: TransportKind): Promise<InboundWriteResult>;
  getLatestPosition(groupId: string, peerId: string): Promise<PeerPosition | undefined>;
  listLatestPositions(groupId: string): Promise<PeerPosition[]>;
  listHistory(groupId: string, peerId: string): Promise<PeerPosition[]>;
  recordObservation(observation: DeliveryObservation): Promise<void>;
  listObservations(messageId: string): Promise<DeliveryObservation[]>;
  putAcknowledgement(ack: CrewAck): Promise<void>;
  getAcknowledgement(messageId: string): Promise<CrewAck | undefined>;
  putTransportStatus(status: TransportStatus): Promise<void>;
  listTransportStatuses(): Promise<TransportStatus[]>;
  pruneExpired(at: string): Promise<void>;
  getDiagnostics(): Promise<CrewRepositoryDiagnostics>;
  deletePeerData(groupId: string, peerId: string): Promise<void>;
  deleteGroupData(groupId: string): Promise<void>;
  deleteAllCrewData(): Promise<void>;
}

const clone = <T>(value: T): T => structuredClone(value);
const positionKey = (groupId: string, peerId: string) => `${groupId}\u0000${peerId}`;

export interface InMemoryCrewRepositoryState {
  peers: Array<[string, CrewPeer]>;
  groups: Array<[string, RideGroup]>;
  memberships: Array<[string, GroupMembership]>;
  policies: Array<[string, StoredSharePolicy]>;
  outbox: Array<[string, OutboxItem]>;
  latest: Array<[string, PeerPosition]>;
  history: Array<[string, PeerPosition[]]>;
  seen: Array<[string, { groupId: string; deviceId: string }]>;
  observations: DeliveryObservation[];
  acknowledgements: Array<[string, CrewAck]>;
  statuses: Array<[TransportKind, TransportStatus]>;
}

export class InMemoryCrewRepository implements CrewRepository {
  private readonly peers = new Map<string, CrewPeer>();
  private readonly groups = new Map<string, RideGroup>();
  private readonly memberships = new Map<string, GroupMembership>();
  private readonly policies = new Map<string, StoredSharePolicy>();
  private readonly outbox = new Map<string, OutboxItem>();
  private readonly latest = new Map<string, PeerPosition>();
  private readonly history = new Map<string, PeerPosition[]>();
  private readonly seen = new Map<string, { groupId: string; deviceId: string }>();
  private readonly observations: DeliveryObservation[] = [];
  private readonly acknowledgements = new Map<string, CrewAck>();
  private readonly statuses = new Map<TransportKind, TransportStatus>();

  constructor(private readonly limits: RetentionLimits = DEFAULT_RETENTION_LIMITS) {}

  async initialize() {}

  exportState(): InMemoryCrewRepositoryState {
    return clone({ peers: [...this.peers], groups: [...this.groups], memberships: [...this.memberships], policies: [...this.policies], outbox: [...this.outbox], latest: [...this.latest], history: [...this.history], seen: [...this.seen], observations: this.observations, acknowledgements: [...this.acknowledgements], statuses: [...this.statuses] });
  }

  static fromState(state: InMemoryCrewRepositoryState, limits: RetentionLimits = DEFAULT_RETENTION_LIMITS): InMemoryCrewRepository {
    const repository = new InMemoryCrewRepository(limits);
    for (const [key, value] of state.peers) repository.peers.set(key, clone(value));
    for (const [key, value] of state.groups) repository.groups.set(key, clone(value));
    for (const [key, value] of state.memberships) repository.memberships.set(key, clone(value));
    for (const [key, value] of state.policies) repository.policies.set(key, clone(value));
    for (const [key, value] of state.outbox) repository.outbox.set(key, clone(value));
    for (const [key, value] of state.latest) repository.latest.set(key, clone(value));
    for (const [key, value] of state.history) repository.history.set(key, clone(value));
    for (const [messageId, scope] of state.seen) repository.seen.set(messageId, clone(scope));
    repository.observations.push(...clone(state.observations));
    for (const [key, value] of state.acknowledgements) repository.acknowledgements.set(key, clone(value));
    for (const [key, value] of state.statuses) repository.statuses.set(key, clone(value));
    return repository;
  }

  async putPeer(peer: CrewPeer) { this.peers.set(peer.peerId, clone(peer)); }
  async getPeer(peerId: string) { const value = this.peers.get(peerId); return value && clone(value); }
  async listPeers(groupId: string) {
    const ids = new Set([...this.memberships.values()].filter((m) => m.groupId === groupId).map((m) => m.peerId));
    return [...this.peers.values()].filter((p) => ids.has(p.peerId)).map(clone);
  }
  async putGroup(group: RideGroup) { this.groups.set(group.groupId, clone(group)); }
  async getGroup(groupId: string) { const value = this.groups.get(groupId); return value && clone(value); }
  async putMembership(membership: GroupMembership) { this.memberships.set(positionKey(membership.groupId, membership.peerId), clone(membership)); }
  async putSharePolicy(policy: StoredSharePolicy) { this.policies.set(policy.peerId, clone(policy)); }
  async getSharePolicy(peerId: string) { const value = this.policies.get(peerId); return value && clone(value); }
  async enqueue(item: OutboxItem) {
    if (this.outbox.has(item.envelope.messageId)) throw new Error('Outbox message already exists');
    this.outbox.set(item.envelope.messageId, clone(item));
  }
  async updateOutbox(item: OutboxItem) {
    if (!this.outbox.has(item.envelope.messageId)) throw new Error('Outbox message does not exist');
    this.outbox.set(item.envelope.messageId, clone(item));
  }
  async getOutbox(messageId: string) { const value = this.outbox.get(messageId); return value && clone(value); }
  async listOutbox() { return [...this.outbox.values()].map(clone); }
  async listDueOutbox(at: string) {
    const now = Date.parse(at);
    return [...this.outbox.values()].filter((i) => i.state !== 'exhausted' && Date.parse(i.nextAttemptAt) <= now).map(clone);
  }
  async deleteOutbox(messageId: string) { this.outbox.delete(messageId); }
  async purgeUnsentLocations(peerId: string, groupId?: string) {
    let deleted = 0;
    for (const [id, item] of this.outbox) {
      if (item.ownerPeerId === peerId && (!groupId || item.envelope.groupId === groupId)) {
        this.outbox.delete(id);
        deleted += 1;
      }
    }
    return deleted;
  }

  async acceptInbound(envelope: LocationEnvelope, receivedAt: string, transport: TransportKind): Promise<InboundWriteResult> {
    if (this.seen.has(envelope.messageId)) {
      await this.recordObservation({ messageId: envelope.messageId, transport, observedAt: receivedAt, duplicate: true });
      return { disposition: 'duplicate', latest: await this.getLatestPosition(envelope.groupId, envelope.deviceId) };
    }
    const key = positionKey(envelope.groupId, envelope.deviceId);
    const current = this.latest.get(key);
    if (current && envelope.sequence <= current.envelope.sequence) {
      this.rememberSeen(envelope);
      await this.recordObservation({ messageId: envelope.messageId, transport, observedAt: receivedAt, duplicate: false });
      return { disposition: 'sequence_regression', latest: clone(current) };
    }
    const position = { envelope: clone(envelope), receivedAt };
    this.rememberSeen(envelope);
    this.latest.set(key, position);
    const history = [...(this.history.get(key) ?? []), position].slice(-this.limits.historyPerPeer);
    this.history.set(key, history);
    await this.recordObservation({ messageId: envelope.messageId, transport, observedAt: receivedAt, duplicate: false });
    return { disposition: 'accepted', latest: clone(position) };
  }

  private rememberSeen(envelope: LocationEnvelope) {
    this.seen.set(envelope.messageId, { groupId: envelope.groupId, deviceId: envelope.deviceId });
    while (this.seen.size > this.limits.deduplicationIds) this.seen.delete(this.seen.keys().next().value!);
  }
  async getLatestPosition(groupId: string, peerId: string) { const value = this.latest.get(positionKey(groupId, peerId)); return value && clone(value); }
  async listLatestPositions(groupId: string) { return [...this.latest.values()].filter((p) => p.envelope.groupId === groupId).map(clone); }
  async listHistory(groupId: string, peerId: string) { return (this.history.get(positionKey(groupId, peerId)) ?? []).map(clone); }
  async recordObservation(observation: DeliveryObservation) {
    this.observations.push(clone(observation));
    if (this.observations.length > this.limits.observations) this.observations.splice(0, this.observations.length - this.limits.observations);
  }
  async listObservations(messageId: string) { return this.observations.filter((o) => o.messageId === messageId).map(clone); }
  async putAcknowledgement(ack: CrewAck) {
    this.acknowledgements.set(ack.payload.acknowledgedMessageId, clone(ack));
    while (this.acknowledgements.size > this.limits.acknowledgements) this.acknowledgements.delete(this.acknowledgements.keys().next().value!);
  }
  async getAcknowledgement(messageId: string) { const value = this.acknowledgements.get(messageId); return value && clone(value); }
  async putTransportStatus(status: TransportStatus) { this.statuses.set(status.kind, clone(status)); }
  async listTransportStatuses() { return [...this.statuses.values()].map(clone); }

  async pruneExpired(at: string) {
    const now = Date.parse(at);
    const expires = (position: PeerPosition) => Date.parse(position.envelope.sentAt) + position.envelope.ttlSeconds * 1_000;
    for (const [key, positions] of this.history) {
      const kept = positions.filter((position) => expires(position) > now);
      if (kept.length) this.history.set(key, kept); else this.history.delete(key);
    }
    for (const [key, position] of this.latest) if (expires(position) <= now) this.latest.delete(key);
    for (const [id, item] of this.outbox) if (Date.parse(item.envelope.sentAt) + item.envelope.ttlSeconds * 1_000 <= now) this.outbox.delete(id);
    for (const [id, ack] of this.acknowledgements) if (Date.parse(ack.sentAt) + ack.ttlSeconds * 1_000 <= now) this.acknowledgements.delete(id);
  }

  async getDiagnostics(): Promise<CrewRepositoryDiagnostics> {
    return {
      adapter: 'in-memory-development', schemaVersion: 3, lastMigration: 'in-memory schema',
      rowCounts: { peers: this.peers.size, groups: this.groups.size, memberships: this.memberships.size, policies: this.policies.size, positionStreams: this.history.size, outbox: this.outbox.size, acknowledgements: this.acknowledgements.size },
    };
  }

  async deleteGroupData(groupId: string) {
    const groupMessageIds = new Set([
      ...[...this.latest.values()].filter((p) => p.envelope.groupId === groupId).map((p) => p.envelope.messageId),
      ...[...this.history.values()].flat().filter((p) => p.envelope.groupId === groupId).map((p) => p.envelope.messageId),
      ...[...this.outbox.values()].filter((i) => i.envelope.groupId === groupId).map((i) => i.envelope.messageId),
    ]);
    this.groups.delete(groupId);
    for (const [key, membership] of this.memberships) if (membership.groupId === groupId) this.memberships.delete(key);
    for (const [key, position] of this.latest) if (position.envelope.groupId === groupId) this.latest.delete(key);
    for (const key of this.history.keys()) if (key.startsWith(`${groupId}\u0000`)) this.history.delete(key);
    for (const [id, item] of this.outbox) if (item.envelope.groupId === groupId) this.outbox.delete(id);
    for (let i = this.observations.length - 1; i >= 0; i--) if (groupMessageIds.has(this.observations[i].messageId)) this.observations.splice(i, 1);
    for (const [messageId, scope] of this.seen) if (scope.groupId === groupId || groupMessageIds.has(messageId)) this.seen.delete(messageId);
    for (const [acknowledgedId, ack] of this.acknowledgements) if (ack.groupId === groupId || groupMessageIds.has(acknowledgedId)) this.acknowledgements.delete(acknowledgedId);
  }
  async deletePeerData(groupId: string, peerId: string) {
    const peer = await this.getPeer(peerId);
    if (!peer) return;
    this.memberships.delete(positionKey(groupId, peerId));
    const deviceId = peer.deviceId;
    const key = positionKey(groupId, deviceId);
    const messageIds = new Set([...(this.history.get(key) ?? []).map((position) => position.envelope.messageId), this.latest.get(key)?.envelope.messageId].filter((value): value is string => Boolean(value)));
    for (const [messageId, scope] of this.seen) if (scope.groupId === groupId && scope.deviceId === deviceId) messageIds.add(messageId);
    this.latest.delete(key); this.history.delete(key);
    for (const [id, item] of this.outbox) if (item.envelope.groupId === groupId && item.envelope.deviceId === deviceId) this.outbox.delete(id);
    for (let index = this.observations.length - 1; index >= 0; index--) if (messageIds.has(this.observations[index].messageId)) this.observations.splice(index, 1);
    for (const messageId of messageIds) { this.seen.delete(messageId); this.acknowledgements.delete(messageId); }
  }
  async deleteAllCrewData() {
    this.peers.clear(); this.groups.clear(); this.memberships.clear(); this.policies.clear(); this.outbox.clear();
    this.latest.clear(); this.history.clear(); this.seen.clear(); this.observations.splice(0); this.acknowledgements.clear(); this.statuses.clear();
  }
}
