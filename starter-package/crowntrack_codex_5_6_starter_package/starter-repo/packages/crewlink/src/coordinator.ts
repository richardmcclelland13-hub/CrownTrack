import { CREW_LINK_VERSION, createAckMessage, parseCrewLinkMessage, reduceLocationPrecision } from '@crowntrack/crew-protocol';
import type {
  Clock, CrewAck, IdGenerator, LocationEnvelope, LocationFix, PeerIdentity, PresenceSnapshot,
  StoredSharePolicy, TransportKind,
} from './entities';
import type { CrewRepository } from './repository';
import type { CrewTransport, Unsubscribe } from './transport';
import { DEFAULT_RETRY_POLICY, retryDelayMs, type RetryPolicy } from './retry';
import { clone } from './clone';

export class ConsentRequiredError extends Error {
  constructor(readonly gate: 'create' | 'enqueue' | 'retry') { super(`Location sharing consent required at ${gate}`); }
}
export interface PresenceThresholds { liveMs: number; recentMs: number; staleMs: number }
export const DEFAULT_PRESENCE_THRESHOLDS: PresenceThresholds = { liveMs: 60_000, recentMs: 5 * 60_000, staleMs: 30 * 60_000 };
export interface CoordinatorOptions {
  repository: CrewRepository; transports: CrewTransport[]; clock: Clock; ids: IdGenerator;
  retryPolicy?: RetryPolicy; presenceThresholds?: PresenceThresholds; futureSkewMs?: number;
}

export class CrewLinkCoordinator {
  private readonly repo: CrewRepository;
  private readonly transports: CrewTransport[];
  private readonly clock: Clock;
  private readonly ids: IdGenerator;
  private readonly retryPolicy: RetryPolicy;
  private readonly thresholds: PresenceThresholds;
  private readonly futureSkewMs: number;
  private subscriptions: Unsubscribe[] = [];
  private localPeer?: PeerIdentity;
  private ackSequence = 0;

  constructor(options: CoordinatorOptions) {
    this.repo = options.repository; this.transports = options.transports; this.clock = options.clock; this.ids = options.ids;
    this.retryPolicy = options.retryPolicy ?? DEFAULT_RETRY_POLICY;
    this.thresholds = options.presenceThresholds ?? DEFAULT_PRESENCE_THRESHOLDS;
    this.futureSkewMs = options.futureSkewMs ?? 2 * 60_000;
  }
  async start(localPeer: PeerIdentity, rideGroupIds: string[]) {
    await this.repo.initialize();
    await this.repo.pruneExpired(this.nowIso());
    this.localPeer = clone(localPeer);
    for (const transport of this.transports) {
      this.subscriptions.push(
        transport.subscribe((envelope) => this.receive(envelope, transport.kind)),
        transport.subscribeAck((ack) => this.receiveAck(ack)),
        transport.subscribeState((state) => this.repo.putTransportStatus({ kind: transport.kind, state, changedAt: this.nowIso() })),
      );
      await transport.start({ localPeer, rideGroupIds });
      await this.repo.putTransportStatus({ kind: transport.kind, state: transport.getState(), changedAt: this.nowIso() });
    }
  }
  async stop() {
    for (const unsubscribe of this.subscriptions.splice(0)) unsubscribe();
    for (const transport of this.transports) await transport.stop();
    this.localPeer = undefined;
  }
  async setSharePolicy(policy: StoredSharePolicy) {
    if (policy.emergencyOverride) throw new Error('Emergency override is not supported');
    const previous = await this.repo.getSharePolicy(policy.peerId);
    await this.repo.putSharePolicy(policy);
    const affectedGroups = new Set([...(previous?.groupIds ?? []), ...policy.groupIds]);
    for (const groupId of affectedGroups) {
      if (!policy.enabled || !policy.groupIds.includes(groupId)) await this.repo.purgeUnsentLocations(policy.peerId, groupId);
    }
  }
  async createLocationEnvelope(sender: PeerIdentity, groupId: string, streamId: string, sequence: number, fix: LocationFix, ttlSeconds: number): Promise<LocationEnvelope> {
    const policy = await this.requireConsent(sender.peerId, groupId, 'create');
    const sentAt = this.nowIso();
    const message = parseCrewLinkMessage({
      version: CREW_LINK_VERSION, type: 'location', messageId: this.ids.next(), groupId, deviceId: sender.deviceId,
      streamId, sequence, sentAt, ttlSeconds, payload: clone(fix),
    }, { expectedGroupId: groupId, now: this.clock.now(), maxFutureSkewMs: this.futureSkewMs });
    if (message.type !== 'location') throw new Error('Expected a location message');
    return policy.precision === 'reduced' ? reduceLocationPrecision(message) : message;
  }
  async enqueue(ownerPeerId: string, envelope: LocationEnvelope) {
    await this.requireConsent(ownerPeerId, envelope.groupId, 'enqueue');
    this.validateLocation(envelope, envelope.groupId);
    await this.repo.enqueue({ envelope: clone(envelope), ownerPeerId, state: 'queued', attempts: 0, nextAttemptAt: this.nowIso(), sentVia: [] });
  }
  async createAndEnqueue(sender: PeerIdentity, groupId: string, streamId: string, sequence: number, fix: LocationFix, ttlSeconds: number) {
    const envelope = await this.createLocationEnvelope(sender, groupId, streamId, sequence, fix, ttlSeconds);
    await this.enqueue(sender.peerId, envelope);
    return envelope;
  }
  async flushOutbox() {
    for (const item of await this.repo.listDueOutbox(this.nowIso())) {
      try { await this.requireConsent(item.ownerPeerId, item.envelope.groupId, 'retry'); }
      catch (error) {
        await this.repo.deleteOutbox(item.envelope.messageId);
        if (!(error instanceof ConsentRequiredError)) throw error;
        continue;
      }
      if (!this.validateLocation(item.envelope, item.envelope.groupId, false)) { await this.repo.deleteOutbox(item.envelope.messageId); continue; }
      const sentVia: TransportKind[] = [];
      for (const transport of this.transports) {
        const result = await transport.send(item.envelope);
        if (result.accepted) sentVia.push(transport.kind);
      }
      const attempts = item.attempts + 1;
      const exhausted = attempts >= this.retryPolicy.maxAttempts;
      const now = this.clock.now();
      await this.repo.updateOutbox({ ...item, attempts, state: exhausted ? 'exhausted' : sentVia.length ? 'awaiting_ack' : 'queued',
        lastAttemptAt: now.toISOString(), nextAttemptAt: new Date(now.getTime() + retryDelayMs(attempts, this.retryPolicy)).toISOString(),
        sentVia: [...new Set([...item.sentVia, ...sentVia])] });
    }
  }
  async receive(envelope: LocationEnvelope, transportKind: TransportKind) {
    const group = await this.repo.getGroup(envelope.groupId);
    if (!group) throw new Error('Location message is for an unknown group');
    this.validateLocation(envelope, group.groupId);
    const receivedAt = this.nowIso();
    await this.repo.acceptInbound(envelope, receivedAt, transportKind);
    if (!this.localPeer) return;
    const ack = createAckMessage(envelope, {
      messageId: this.ids.next(), deviceId: this.localPeer.deviceId, streamId: `ack-${this.localPeer.deviceId}`,
      sequence: this.ackSequence++, sentAt: receivedAt, ttlSeconds: envelope.ttlSeconds,
    });
    const transport = this.transports.find((candidate) => candidate.kind === transportKind);
    if (transport) await transport.sendAck(ack, envelope.groupId);
  }
  async receiveAck(ack: CrewAck) {
    const parsed = parseCrewLinkMessage(ack, { now: this.clock.now(), maxFutureSkewMs: this.futureSkewMs });
    if (parsed.type !== 'ack') throw new Error('Expected an acknowledgement');
    const messageId = parsed.payload.acknowledgedMessageId;
    if (!await this.repo.getOutbox(messageId)) return;
    await this.repo.putAcknowledgement(parsed);
    await this.repo.deleteOutbox(messageId);
  }
  async getPresence(groupId: string): Promise<PresenceSnapshot[]> {
    const peers = await this.repo.listPeers(groupId);
    const now = this.clock.now().getTime();
    return Promise.all(peers.map(async (peer) => {
      const lastPosition = await this.repo.getLatestPosition(groupId, peer.deviceId);
      if (!lastPosition) return { peer, groupId, state: 'unknown', observedTransports: [] };
      const ageMs = Math.max(0, now - Date.parse(lastPosition.envelope.payload.capturedAt));
      const state = ageMs <= this.thresholds.liveMs ? 'live' : ageMs <= this.thresholds.recentMs ? 'recent' : ageMs <= this.thresholds.staleMs ? 'stale' : 'unknown';
      const observations = await this.repo.listObservations(lastPosition.envelope.messageId);
      return { peer, groupId, state, lastPosition, ageMs, observedTransports: [...new Set(observations.map((o) => o.transport))] };
    }));
  }
  async deleteGroupData(groupId: string) { await this.repo.deleteGroupData(groupId); }
  async deleteAllCrewData() { await this.repo.deleteAllCrewData(); }
  private async requireConsent(peerId: string, groupId: string, gate: 'create' | 'enqueue' | 'retry') {
    const policy = await this.repo.getSharePolicy(peerId);
    if (!policy?.enabled || !policy.consentConfirmed || !policy.groupIds.includes(groupId) || policy.emergencyOverride) throw new ConsentRequiredError(gate);
    return policy;
  }
  private validateLocation(envelope: LocationEnvelope, expectedGroupId: string, throwOnFailure = true) {
    try {
      const parsed = parseCrewLinkMessage(envelope, { expectedGroupId, now: this.clock.now(), maxFutureSkewMs: this.futureSkewMs });
      if (parsed.type !== 'location') throw new Error('Expected a location message');
      return parsed;
    } catch (error) { if (throwOnFailure) throw error; return undefined; }
  }
  private nowIso() { return this.clock.now().toISOString(); }
}
