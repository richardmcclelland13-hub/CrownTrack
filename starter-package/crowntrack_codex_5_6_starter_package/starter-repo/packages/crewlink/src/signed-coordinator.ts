import {
  SIGNED_CREWLINK_DOMAIN, SIGNED_CREWLINK_VERSION, SignedCrewLinkEnvelopeSchema,
  canonicalSignedEnvelopeBytes, parseSignedCrewLinkEnvelope, type SignedCrewLinkAck,
  type SignedCrewLinkEnvelope, type SignedCrewLinkLocation, type UnsignedCrewLinkEnvelope,
} from '@crowntrack/crew-protocol';
import type { CanonicalSigner } from '@crowntrack/crew-identity';
import type { Clock, IdGenerator, LocationFix, StoredSharePolicy, TransportKind } from './entities';
import type { SignedCrewRepository, SignedOutboxItem } from './signed-repository';
import { DEFAULT_RETRY_POLICY, retryDelayMs, type RetryPolicy } from './retry';

/** Applies the established 3-decimal privacy policy before bytes are canonicalized. */
export const reduceSignedLocationFix = (fix: LocationFix, decimalPlaces = 3): LocationFix => {
  const factor = 10 ** decimalPlaces;
  const round = (value: number) => Math.round((value + Number.EPSILON) * factor) / factor;
  return { ...fix, latitude: round(fix.latitude), longitude: round(fix.longitude), accuracyMeters: Math.max(fix.accuracyMeters ?? 0, 111_320 / factor / 2) };
};

export interface SignedCrewTransport {
  readonly kind: TransportKind;
  sendSigned(message: SignedCrewLinkEnvelope): Promise<{ accepted: boolean }>;
  subscribeSigned(handler: (message: unknown) => void | Promise<void>): () => void;
}

export interface SignedCoordinatorRepository extends SignedCrewRepository {
  getSharePolicy(peerId: string): Promise<StoredSharePolicy | undefined>;
}

export interface SignedCoordinatorOptions {
  repository: SignedCoordinatorRepository;
  transports: SignedCrewTransport[];
  signer: CanonicalSigner;
  localDeviceId: string;
  clock: Clock;
  ids: IdGenerator;
  retryPolicy?: RetryPolicy;
  /** Deterministic test/runtime hook invoked after transport send and before retry metadata commits. */
  beforeRetryCommit?: (item: SignedOutboxItem) => Promise<void> | void;
}

/** V2-only coordinator. It never calls the legacy v1 transport or repository methods. */
export class SignedCrewLinkCoordinator {
  private readonly repo: SignedCoordinatorRepository;
  private readonly transports: SignedCrewTransport[];
  private readonly signer: CanonicalSigner;
  private readonly localDeviceId: string;
  private readonly clock: Clock;
  private readonly ids: IdGenerator;
  private readonly retryPolicy: RetryPolicy;
  private readonly beforeRetryCommit?: (item: SignedOutboxItem) => Promise<void> | void;
  private readonly subscriptions: Array<() => void> = [];

  constructor(options: SignedCoordinatorOptions) {
    this.repo = options.repository; this.transports = options.transports; this.signer = options.signer;
    this.localDeviceId = options.localDeviceId; this.clock = options.clock; this.ids = options.ids;
    this.retryPolicy = options.retryPolicy ?? DEFAULT_RETRY_POLICY;
    this.beforeRetryCommit = options.beforeRetryCommit;
  }

  async createVerifiedGroup(groupId: string, createdAt = this.nowIso()) {
    const result = await this.repo.createVerifiedGroup({ group: { groupId, authorityDeviceId: this.localDeviceId, authorityPublicKey: this.signer.publicKey, epoch: 1, origin: 'local_owned' }, createdAt, localDevice: { deviceId: this.localDeviceId, publicKey: this.signer.publicKey } });
    if (!result.accepted) throw new Error(`Verified group was not created: ${result.reason}`);
    return result.value;
  }
  async createAndApplyMembershipGrant(groupId: string, member: { deviceId: string; publicKey: string; displayName: string }, ttlSeconds = 600) {
    const streamId = `membership-${this.localDeviceId}`;
    const group = await this.repo.getVerifiedGroup(groupId);
    if (!group || group.authorityDeviceId !== this.localDeviceId || group.authorityPublicKey !== this.signer.publicKey) throw new Error('Only the immutable local owner can grant membership.');
    const trustedTarget = await this.repo.getTrustedDevice(member.deviceId);
    if (!trustedTarget || trustedTarget.revokedAt || trustedTarget.publicKey !== member.publicKey) throw new Error('Membership grants require a paired, trusted target device key.');
    if (await this.repo.getTombstone(groupId, member.deviceId)) throw new Error('A tombstoned device identity cannot be reauthorized in Stage 3B.');
    const sentAt = this.nowIso(); const sequence = await this.repo.allocateLocalSignedSequence(groupId, this.localDeviceId, streamId, sentAt); const epoch = group.epoch + 1;
    const envelope = await this.sign({ version: SIGNED_CREWLINK_VERSION, domain: SIGNED_CREWLINK_DOMAIN, type: 'membership_grant', messageId: this.ids.next(), groupId, senderDeviceId: this.localDeviceId, signerPublicKey: this.signer.publicKey, streamId, sequence, membershipEpoch: epoch, sentAt, ttlSeconds, payload: { member, grantedEpoch: epoch } });
    const applied = await this.repo.applySignedMembershipTransition({ envelope, receivedAt: sentAt });
    if (!applied.accepted) throw new Error(`Membership grant was rejected: ${applied.reason}`);
    return envelope;
  }
  async createAndApplyMembershipRevocation(groupId: string, deviceId: string, ttlSeconds = 600) {
    const streamId = `membership-${this.localDeviceId}`;
    const group = await this.repo.getVerifiedGroup(groupId); const member = await this.repo.getVerifiedMembership(groupId, deviceId);
    if (!group || group.authorityDeviceId !== this.localDeviceId || group.authorityPublicKey !== this.signer.publicKey) throw new Error('Only the immutable local owner can revoke membership.');
    if (!member || member.status !== 'active' || member.deviceId === this.localDeviceId) throw new Error('Only an active non-owner member can be revoked.');
    const sentAt = this.nowIso(); const sequence = await this.repo.allocateLocalSignedSequence(groupId, this.localDeviceId, streamId, sentAt); const epoch = group.epoch + 1;
    const envelope = await this.sign({ version: SIGNED_CREWLINK_VERSION, domain: SIGNED_CREWLINK_DOMAIN, type: 'membership_revocation', messageId: this.ids.next(), groupId, senderDeviceId: this.localDeviceId, signerPublicKey: this.signer.publicKey, streamId, sequence, membershipEpoch: epoch, sentAt, ttlSeconds, payload: { memberDeviceId: member.deviceId, memberPublicKey: member.publicKey, revokedEpoch: epoch } });
    const applied = await this.repo.applySignedMembershipTransition({ envelope, receivedAt: sentAt });
    if (!applied.accepted) throw new Error(`Membership revocation was rejected: ${applied.reason}`);
    return envelope;
  }
  async start(): Promise<void> {
    if (this.subscriptions.length > 0) return;
    await this.repo.initialize();
    await this.repo.pruneSignedState(this.nowIso());
    for (const transport of this.transports) this.subscriptions.push(transport.subscribeSigned((message) => this.receive(message, transport.kind)));
  }
  async stop(): Promise<void> { for (const unsubscribe of this.subscriptions.splice(0)) unsubscribe(); }

  async createAndEnqueue(groupId: string, streamId: string, fix: LocationFix, ttlSeconds: number): Promise<SignedCrewLinkLocation> {
    await this.requireConsent(groupId, 'create');
    const group = await this.repo.getVerifiedGroup(groupId);
    const member = await this.repo.getVerifiedMembership(groupId, this.localDeviceId);
    if (!group || !member || member.status !== 'active' || member.publicKey !== this.signer.publicKey) throw new Error('Local device is not an active verified group member.');
    const policy = await this.repo.getSharePolicy(this.localDeviceId);
    const payload = policy?.precision === 'reduced' ? reduceSignedLocationFix(fix) : { ...fix };
    const sentAt = this.nowIso();
    const sequence = await this.repo.allocateLocalSignedSequence(groupId, this.localDeviceId, streamId, sentAt);
    const envelope = await this.sign({
      version: SIGNED_CREWLINK_VERSION, domain: SIGNED_CREWLINK_DOMAIN, type: 'location',
      messageId: this.ids.next(), groupId, senderDeviceId: this.localDeviceId, signerPublicKey: this.signer.publicKey,
      streamId, sequence, membershipEpoch: group.epoch, sentAt, ttlSeconds, payload: { ...payload, capturedAt: payload.capturedAt },
    }) as SignedCrewLinkLocation;
    const queued: SignedOutboxItem = { envelope, ownerDeviceId: this.localDeviceId, state: 'queued', attempts: 0, nextAttemptAt: sentAt, sentVia: [] };
    const stored = await this.repo.enqueueSignedLocation(queued);
    if (!stored.accepted) throw new Error(`Signed location was not queued: ${stored.reason ?? 'rejected'}`);
    return envelope;
  }

  async flushOutbox(): Promise<void> {
    for (const item of await this.repo.listDueSignedOutbox(this.nowIso())) {
      try { await this.requireConsent(item.envelope.groupId, 'retry'); }
      catch { await this.repo.purgeSignedOutbox(item.ownerDeviceId, item.envelope.groupId); continue; }
      const group = await this.repo.getVerifiedGroup(item.envelope.groupId);
      const member = await this.repo.getVerifiedMembership(item.envelope.groupId, item.ownerDeviceId);
      if (!group || !member || member.status !== 'active' || member.publicKey !== item.envelope.signerPublicKey || group.epoch !== item.envelope.membershipEpoch) {
        await this.repo.purgeSignedOutbox(item.ownerDeviceId, item.envelope.groupId); continue;
      }
      const sentVia: TransportKind[] = [];
      for (const transport of this.transports) if ((await transport.sendSigned(item.envelope)).accepted) sentVia.push(transport.kind);
      const attempts = item.attempts + 1; const now = this.clock.now();
      await this.beforeRetryCommit?.(item);
      const update = await this.repo.updateSignedOutboxAttempt({ ...item, attempts, state: attempts >= this.retryPolicy.maxAttempts ? 'exhausted' : sentVia.length ? 'awaiting_ack' : 'queued', lastAttemptAt: now.toISOString(), nextAttemptAt: new Date(now.getTime() + retryDelayMs(attempts, this.retryPolicy)).toISOString(), sentVia: [...new Set([...item.sentVia, ...sentVia])] });
      if (!update.accepted) await this.repo.recordSignedRejection({ reason: update.reason ?? 'outbox_update_rejected', messageId: item.envelope.messageId, groupId: item.envelope.groupId, recordedAt: this.nowIso() });
    }
  }

  async receive(input: unknown, transport: TransportKind): Promise<void> {
    const receivedAt = this.nowIso();
    const parsed = SignedCrewLinkEnvelopeSchema.safeParse(input);
    if (!parsed.success) { await this.repo.recordSignedRejection({ reason: 'malformed_v2_envelope', recordedAt: receivedAt }); return; }
    const envelope = parsed.data;
    if (envelope.type === 'membership_grant' || envelope.type === 'membership_revocation') {
      let result = await this.repo.applySignedMembershipTransition({ envelope, receivedAt });
      if (!result.accepted && result.reason === 'unauthorized_authority' && envelope.type === 'membership_grant') result = await this.repo.bootstrapImportedGroup({ envelope, receivedAt, localDevice: { deviceId: this.localDeviceId, publicKey: this.signer.publicKey } });
      if (!result.accepted) await this.repo.recordSignedRejection({ reason: result.reason ?? 'membership_rejected', messageId: envelope.messageId, groupId: envelope.groupId, recordedAt: receivedAt });
      return;
    }
    if (envelope.type === 'ack') {
      const result = await this.repo.acceptVerifiedSignedAck({ envelope, receivedAt });
      if (!result.accepted) await this.repo.recordSignedRejection({ reason: result.reason ?? 'ack_rejected', messageId: envelope.messageId, groupId: envelope.groupId, recordedAt: receivedAt });
      return;
    }
    const result = await this.repo.acceptVerifiedSignedLocation({ envelope, receivedAt, transport });
    if (!result.accepted) { await this.repo.recordSignedRejection({ reason: result.reason ?? 'location_rejected', messageId: envelope.messageId, groupId: envelope.groupId, recordedAt: receivedAt }); return; }
    if (result.value !== 'accepted') return;
    const group = await this.repo.getVerifiedGroup(envelope.groupId);
    const local = await this.repo.getVerifiedMembership(envelope.groupId, this.localDeviceId);
    if (!group || !local || local.status !== 'active' || local.publicKey !== this.signer.publicKey) return;
    const ack = await this.sign({
      version: SIGNED_CREWLINK_VERSION, domain: SIGNED_CREWLINK_DOMAIN, type: 'ack', messageId: this.ids.next(),
      groupId: envelope.groupId, senderDeviceId: this.localDeviceId, signerPublicKey: this.signer.publicKey,
      streamId: `ack-${this.localDeviceId}`, sequence: await this.repo.allocateLocalSignedSequence(envelope.groupId, this.localDeviceId, `ack-${this.localDeviceId}`, receivedAt), membershipEpoch: group.epoch,
      sentAt: receivedAt, ttlSeconds: envelope.ttlSeconds,
      payload: { acknowledgedMessageId: envelope.messageId, receivedAt, status: 'received' },
    }) as SignedCrewLinkAck;
    const selected = this.transports.find((candidate) => candidate.kind === transport);
    if (selected) await selected.sendSigned(ack);
  }

  private async sign(unsigned: UnsignedCrewLinkEnvelope): Promise<SignedCrewLinkEnvelope> {
    const validated = parseSignedCrewLinkEnvelope({ ...unsigned, signature: await this.signer.sign(canonicalSignedEnvelopeBytes(unsigned)) });
    return validated;
  }
  private async requireConsent(groupId: string, gate: 'create' | 'retry'): Promise<void> {
    const policy = await this.repo.getSharePolicy(this.localDeviceId);
    if (!policy?.enabled || !policy.consentConfirmed || policy.emergencyOverride || !policy.groupIds.includes(groupId)) throw new Error(`Location-sharing consent required at signed ${gate}.`);
  }
  private nowIso() { return this.clock.now().toISOString(); }
}
