import {
  SignedCrewLinkAckSchema, SignedCrewLinkEnvelopeSchema, SignedCrewLinkLocationSchema,
  canonicalSignedEnvelopeBytes, signedEnvelopeExpiresAt,
  type SignedCrewLinkAck, type SignedCrewLinkEnvelope, type SignedCrewLinkLocation,
} from '@crowntrack/crew-protocol';
import { verifyBase64Url } from '@crowntrack/crew-identity';
import { clone } from './clone';
import type { TransportKind } from './entities';
import type { TrustedDevice, VerifiedGroup, VerifiedMembership } from './signed-membership';

export type SignedOutboxState = 'queued' | 'awaiting_ack' | 'exhausted';
export interface SignedOutboxItem {
  envelope: SignedCrewLinkLocation;
  ownerDeviceId: string;
  state: SignedOutboxState;
  attempts: number;
  nextAttemptAt: string;
  lastAttemptAt?: string;
  sentVia: TransportKind[];
}
export interface SignedDeliveryObservation { messageId: string; groupId: string; transport: TransportKind; observedAt: string; duplicate: boolean; }
export interface SignedRejectionRecord { reason: string; messageId?: string; groupId?: string; recordedAt: string; }
export interface SignedTombstone { groupId: string; deviceId: string; publicKey: string; revokedEpoch: number; recordMessageId: string; revokedAt: string; }
export type SignedCommandResult<T = undefined> = { accepted: true; value: T } | { accepted: false; reason: string };
/** Local group creation is bound to the persisted local identity, never caller-supplied authority. */
export interface CreateVerifiedGroupCommand { group: VerifiedGroup; createdAt: string; localDevice: { deviceId: string; publicKey: string }; }
export interface ApplySignedMembershipCommand { envelope: SignedCrewLinkEnvelope; receivedAt: string; }
/** A device may learn an imported group only from the first valid owner-signed grant addressed to itself. */
export interface BootstrapImportedGroupCommand { envelope: SignedCrewLinkEnvelope; receivedAt: string; localDevice: { deviceId: string; publicKey: string }; }
export interface AcceptVerifiedSignedLocationCommand { envelope: SignedCrewLinkLocation; receivedAt: string; transport: TransportKind; }
export interface AcceptVerifiedSignedAckCommand { envelope: SignedCrewLinkAck; receivedAt: string; }
export interface SignedRepositorySnapshot {
  trusted: TrustedDevice[]; groups: VerifiedGroup[]; memberships: VerifiedMembership[]; tombstones: SignedTombstone[];
  outbox: SignedOutboxItem[]; locations: SignedCrewLinkLocation[]; acknowledgements: SignedCrewLinkAck[];
}

/**
 * The Stage-3B authority boundary. All security-sensitive mutations are
 * commands; callers cannot replace group authority, epoch or membership
 * projections directly. Implementations must execute each command atomically.
 */
export interface SignedCrewRepository {
  initialize(): Promise<void>;
  allocateLocalSignedSequence(groupId: string, deviceId: string, streamId: string, allocatedAt: string): Promise<number>;
  upsertTrustedDevice(device: TrustedDevice): Promise<void>;
  getTrustedDevice(deviceId: string): Promise<TrustedDevice | undefined>;
  createVerifiedGroup(command: CreateVerifiedGroupCommand): Promise<SignedCommandResult<VerifiedGroup>>;
  applySignedMembershipTransition(command: ApplySignedMembershipCommand): Promise<SignedCommandResult<VerifiedMembership>>;
  bootstrapImportedGroup(command: BootstrapImportedGroupCommand): Promise<SignedCommandResult<VerifiedMembership>>;
  acceptVerifiedSignedLocation(command: AcceptVerifiedSignedLocationCommand): Promise<SignedCommandResult<'accepted' | 'duplicate' | 'sequence_regression'>>;
  acceptVerifiedSignedAck(command: AcceptVerifiedSignedAckCommand): Promise<SignedCommandResult<'accepted' | 'duplicate'>>;
  enqueueSignedLocation(item: SignedOutboxItem): Promise<SignedCommandResult>;
  getVerifiedGroup(groupId: string): Promise<VerifiedGroup | undefined>;
  listVerifiedGroups(): Promise<VerifiedGroup[]>;
  getVerifiedMembership(groupId: string, deviceId: string): Promise<VerifiedMembership | undefined>;
  listVerifiedMemberships(groupId: string): Promise<VerifiedMembership[]>;
  getTombstone(groupId: string, deviceId: string): Promise<SignedTombstone | undefined>;
  listSignedLatestPositions(groupId: string): Promise<SignedCrewLinkLocation[]>;
  listSignedHistory(groupId: string, deviceId: string): Promise<SignedCrewLinkLocation[]>;
  getSignedOutbox(messageId: string): Promise<SignedOutboxItem | undefined>;
  listSignedOutbox(): Promise<SignedOutboxItem[]>;
  listDueSignedOutbox(at: string): Promise<SignedOutboxItem[]>;
  updateSignedOutboxAttempt(item: SignedOutboxItem): Promise<SignedCommandResult>;
  purgeSignedOutbox(ownerDeviceId: string, groupId?: string): Promise<number>;
  listSignedObservations(messageId: string): Promise<SignedDeliveryObservation[]>;
  recordSignedRejection(rejection: SignedRejectionRecord): Promise<void>;
  listSignedRejections(): Promise<SignedRejectionRecord[]>;
  pruneSignedState(at: string): Promise<void>;
  deleteSignedPeerData(groupId: string, deviceId: string): Promise<void>;
  deleteSignedGroupData(groupId: string): Promise<void>;
  deleteAllSignedCrewData(): Promise<void>;
  exportSignedState(): Promise<SignedRepositorySnapshot>;
}

const memberKey = (groupId: string, deviceId: string) => `${groupId}\u0000${deviceId}`;
const streamKey = (groupId: string, deviceId: string, streamId: string) => `${groupId}\u0000${deviceId}\u0000${streamId}`;
const expires = (value: { sentAt: string; ttlSeconds: number }) => signedEnvelopeExpiresAt(value);
const verified = (envelope: SignedCrewLinkEnvelope) => {
  const { signature, ...unsigned } = envelope;
  return verifyBase64Url(envelope.signerPublicKey, canonicalSignedEnvelopeBytes(unsigned), signature);
};

/** In-memory parity adapter: every command validates before mutating its state. */
export class InMemorySignedCrewRepository implements SignedCrewRepository {
  private readonly trusted = new Map<string, TrustedDevice>();
  private readonly groups = new Map<string, VerifiedGroup>();
  private readonly memberships = new Map<string, VerifiedMembership>();
  private readonly tombstones = new Map<string, SignedTombstone>();
  private readonly records = new Map<string, SignedCrewLinkEnvelope>();
  private readonly seen = new Map<string, { groupId: string; expiresAt: number }>();
  private readonly streams = new Map<string, number>();
  private readonly localSequences = new Map<string, number>();
  private readonly locations = new Map<string, SignedCrewLinkLocation>();
  private readonly history = new Map<string, SignedCrewLinkLocation[]>();
  private readonly outbox = new Map<string, SignedOutboxItem>();
  private readonly acknowledgements = new Map<string, SignedCrewLinkAck>();
  private readonly observations: SignedDeliveryObservation[] = [];
  private readonly rejections: SignedRejectionRecord[] = [];
  constructor(private readonly limits = { observations: 256, rejections: 128, history: 64 }) {}
  async initialize() {}
  async allocateLocalSignedSequence(groupId: string, deviceId: string, streamId: string, _allocatedAt: string): Promise<number> { const group = this.groups.get(groupId); const member = this.memberships.get(memberKey(groupId, deviceId)); if (!group || !member || member.status !== 'active') throw new Error('Cannot allocate a sequence for an unauthorized local member.'); const key = streamKey(groupId, deviceId, streamId); const next = this.localSequences.get(key) ?? 0; this.localSequences.set(key, next + 1); return next; }
  async upsertTrustedDevice(device: TrustedDevice) {
    const current = this.trusted.get(device.deviceId);
    if (current && current.publicKey !== device.publicKey) throw new Error('Trusted device key replacement requires explicit pairing recovery');
    this.trusted.set(device.deviceId, clone(device));
  }
  async getTrustedDevice(deviceId: string) { const value = this.trusted.get(deviceId); return value && clone(value); }
  async createVerifiedGroup({ group, createdAt: _createdAt, localDevice }: CreateVerifiedGroupCommand): Promise<SignedCommandResult<VerifiedGroup>> {
    if (group.origin !== 'local_owned' || group.epoch !== 1 || group.authorityDeviceId !== localDevice.deviceId || group.authorityPublicKey !== localDevice.publicKey || this.groups.has(group.groupId)) return { accepted: false, reason: 'group_exists_or_invalid_local_authority' };
    const localGroup = { ...group, origin: 'local_owned' as const };
    this.groups.set(group.groupId, clone(localGroup));
    this.memberships.set(memberKey(group.groupId, group.authorityDeviceId), { groupId: group.groupId, deviceId: group.authorityDeviceId, publicKey: group.authorityPublicKey, epoch: 1, status: 'active' });
    return { accepted: true, value: clone(localGroup) };
  }
  async applySignedMembershipTransition({ envelope, receivedAt }: ApplySignedMembershipCommand): Promise<SignedCommandResult<VerifiedMembership>> {
    const parsed = SignedCrewLinkEnvelopeSchema.safeParse(envelope);
    if (!parsed.success || (envelope.type !== 'membership_grant' && envelope.type !== 'membership_revocation')) return this.reject('invalid_membership_record', envelope, receivedAt);
    if (!verified(envelope) || expires(envelope) <= Date.parse(receivedAt)) return this.reject('invalid_signature_or_expired', envelope, receivedAt);
    const group = this.groups.get(envelope.groupId);
    if (!group || envelope.senderDeviceId !== group.authorityDeviceId || envelope.signerPublicKey !== group.authorityPublicKey) return this.reject('unauthorized_authority', envelope, receivedAt);
    if (group.origin === 'imported') { const authority = this.trusted.get(group.authorityDeviceId); if (!authority || authority.revokedAt || authority.publicKey !== group.authorityPublicKey) return this.reject('untrusted_key', envelope, receivedAt); }
    if (this.records.has(envelope.messageId) || this.seen.has(envelope.messageId)) return this.reject('duplicate', envelope, receivedAt);
    if (envelope.streamId !== `membership-${group.authorityDeviceId}`) return this.reject('membership_stream_changed', envelope, receivedAt);
    const high = this.streams.get(streamKey(group.groupId, group.authorityDeviceId, envelope.streamId)); if (high !== undefined && envelope.sequence <= high) return this.reject('stale_sequence', envelope, receivedAt);
    const nextEpoch = envelope.type === 'membership_grant' ? envelope.payload.grantedEpoch : envelope.payload.revokedEpoch;
    if (envelope.membershipEpoch !== nextEpoch || nextEpoch !== group.epoch + 1) return this.reject(nextEpoch <= group.epoch ? 'stale_epoch' : 'future_epoch', envelope, receivedAt);
    const deviceId = envelope.type === 'membership_grant' ? envelope.payload.member.deviceId : envelope.payload.memberDeviceId;
    const publicKey = envelope.type === 'membership_grant' ? envelope.payload.member.publicKey : envelope.payload.memberPublicKey;
    // The authority is trusted above. Recipient pairing is an authoring policy, not an inbound authority check.
    const current = this.memberships.get(memberKey(group.groupId, deviceId));
    const tombstone = this.tombstones.get(memberKey(group.groupId, deviceId));
    if (envelope.type === 'membership_revocation' && (deviceId === group.authorityDeviceId || current?.status !== 'active')) return this.reject('invalid_revocation', envelope, receivedAt);
    if (envelope.type === 'membership_grant' && tombstone) return this.reject('tombstoned', envelope, receivedAt);
    const membership: VerifiedMembership = { groupId: group.groupId, deviceId, publicKey, epoch: nextEpoch, status: envelope.type === 'membership_grant' ? 'active' : 'revoked' };
    const nextGroup = { ...group, epoch: nextEpoch };
    this.records.set(envelope.messageId, clone(envelope)); this.seen.set(envelope.messageId, { groupId: envelope.groupId, expiresAt: expires(envelope) }); this.streams.set(streamKey(group.groupId, group.authorityDeviceId, envelope.streamId), envelope.sequence);
    this.groups.set(group.groupId, nextGroup); this.memberships.set(memberKey(group.groupId, deviceId), membership);
    if (membership.status === 'revoked') {
      this.tombstones.set(memberKey(group.groupId, deviceId), { groupId: group.groupId, deviceId, publicKey, revokedEpoch: nextEpoch, recordMessageId: envelope.messageId, revokedAt: receivedAt });
      await this.purgeSignedOutbox(deviceId, group.groupId);
    }
    return { accepted: true, value: clone(membership) };
  }
  async bootstrapImportedGroup({ envelope, receivedAt, localDevice }: BootstrapImportedGroupCommand): Promise<SignedCommandResult<VerifiedMembership>> {
    const parsed = SignedCrewLinkEnvelopeSchema.safeParse(envelope);
    if (!parsed.success || envelope.type !== 'membership_grant' || !verified(envelope) || expires(envelope) <= Date.parse(receivedAt)) return this.reject('invalid_signature_or_expired', envelope, receivedAt);
    if (this.groups.has(envelope.groupId) || this.records.has(envelope.messageId) || this.seen.has(envelope.messageId)) return this.reject('group_exists_or_duplicate', envelope, receivedAt);
    const authority = this.trusted.get(envelope.senderDeviceId);
    if (!authority || authority.revokedAt || authority.publicKey !== envelope.signerPublicKey) return this.reject('untrusted_key', envelope, receivedAt);
    const member = envelope.payload.member;
    if (envelope.streamId !== `membership-${envelope.senderDeviceId}` || member.deviceId !== localDevice.deviceId || member.publicKey !== localDevice.publicKey || envelope.membershipEpoch !== 2 || envelope.payload.grantedEpoch !== 2) return this.reject('invalid_import_bootstrap', envelope, receivedAt);
    const group: VerifiedGroup = { groupId: envelope.groupId, authorityDeviceId: envelope.senderDeviceId, authorityPublicKey: envelope.signerPublicKey, epoch: 2, origin: 'imported' };
    const membership: VerifiedMembership = { groupId: envelope.groupId, deviceId: member.deviceId, publicKey: member.publicKey, epoch: 2, status: 'active' };
    this.groups.set(group.groupId, group);
    this.memberships.set(memberKey(group.groupId, group.authorityDeviceId), { groupId: group.groupId, deviceId: group.authorityDeviceId, publicKey: group.authorityPublicKey, epoch: 1, status: 'active' });
    this.memberships.set(memberKey(group.groupId, member.deviceId), membership);
    this.records.set(envelope.messageId, clone(envelope)); this.seen.set(envelope.messageId, { groupId: envelope.groupId, expiresAt: expires(envelope) });
    this.streams.set(streamKey(envelope.groupId, envelope.senderDeviceId, envelope.streamId), envelope.sequence);
    return { accepted: true, value: clone(membership) };
  }
  async acceptVerifiedSignedLocation({ envelope, receivedAt, transport }: AcceptVerifiedSignedLocationCommand): Promise<SignedCommandResult<'accepted' | 'duplicate' | 'sequence_regression'>> {
    const parsed = SignedCrewLinkLocationSchema.safeParse(envelope);
    if (!parsed.success || !verified(envelope) || expires(envelope) <= Date.parse(receivedAt)) return this.reject('invalid_signature_or_expired', envelope, receivedAt);
    const authorization = this.authorize(envelope);
    if (authorization) return this.reject(authorization, envelope, receivedAt);
    if (this.seen.has(envelope.messageId)) { this.observe(envelope, transport, receivedAt, true); return { accepted: true, value: 'duplicate' }; }
    const key = streamKey(envelope.groupId, envelope.senderDeviceId, envelope.streamId);
    if ((this.streams.get(key) ?? -1) >= envelope.sequence) { this.seen.set(envelope.messageId, { groupId: envelope.groupId, expiresAt: expires(envelope) }); this.observe(envelope, transport, receivedAt, false); return { accepted: true, value: 'sequence_regression' }; }
    this.seen.set(envelope.messageId, { groupId: envelope.groupId, expiresAt: expires(envelope) }); this.streams.set(key, envelope.sequence);
    this.locations.set(envelope.messageId, clone(envelope));
    const historyKey = memberKey(envelope.groupId, envelope.senderDeviceId);
    this.history.set(historyKey, [...(this.history.get(historyKey) ?? []), clone(envelope)].slice(-this.limits.history));
    this.observe(envelope, transport, receivedAt, false);
    return { accepted: true, value: 'accepted' };
  }
  async acceptVerifiedSignedAck({ envelope, receivedAt }: AcceptVerifiedSignedAckCommand): Promise<SignedCommandResult<'accepted' | 'duplicate'>> {
    const parsed = SignedCrewLinkAckSchema.safeParse(envelope);
    if (!parsed.success || !verified(envelope) || expires(envelope) <= Date.parse(receivedAt)) return this.reject('invalid_signature_or_expired', envelope, receivedAt);
    const authorization = this.authorize(envelope);
    if (authorization) return this.reject(authorization, envelope, receivedAt);
    const outbox = this.outbox.get(envelope.payload.acknowledgedMessageId);
    if (!outbox || outbox.envelope.groupId !== envelope.groupId || outbox.ownerDeviceId === envelope.senderDeviceId) return this.reject('ack_outbox_mismatch', envelope, receivedAt);
    if (this.seen.has(envelope.messageId)) return { accepted: true, value: 'duplicate' };
    const key = streamKey(envelope.groupId, envelope.senderDeviceId, envelope.streamId);
    if ((this.streams.get(key) ?? -1) >= envelope.sequence) return this.reject('stale_sequence', envelope, receivedAt);
    this.seen.set(envelope.messageId, { groupId: envelope.groupId, expiresAt: expires(envelope) }); this.streams.set(key, envelope.sequence);
    this.acknowledgements.set(outbox.envelope.messageId, clone(envelope)); this.outbox.delete(outbox.envelope.messageId);
    return { accepted: true, value: 'accepted' };
  }
  async enqueueSignedLocation(item: SignedOutboxItem): Promise<SignedCommandResult> {
    const parsed = SignedCrewLinkLocationSchema.safeParse(item.envelope);
    if (!parsed.success || item.envelope.senderDeviceId !== item.ownerDeviceId) return { accepted: false, reason: 'invalid_outbox_item' };
    const authorization = this.authorize(item.envelope);
    if (authorization) return { accepted: false, reason: authorization };
    if (this.outbox.has(item.envelope.messageId)) return { accepted: false, reason: 'duplicate' };
    this.outbox.set(item.envelope.messageId, clone(item)); return { accepted: true, value: undefined };
  }
  async getVerifiedGroup(groupId: string) { const value = this.groups.get(groupId); return value && clone(value); }
  async listVerifiedGroups() { return [...this.groups.values()].map(clone); }
  async getVerifiedMembership(groupId: string, deviceId: string) { const value = this.memberships.get(memberKey(groupId, deviceId)); return value && clone(value); }
  async listVerifiedMemberships(groupId: string) { return [...this.memberships.values()].filter((x) => x.groupId === groupId).map(clone); }
  async getTombstone(groupId: string, deviceId: string) { const value = this.tombstones.get(memberKey(groupId, deviceId)); return value && clone(value); }
  async listSignedLatestPositions(groupId: string) { return [...this.history.values()].map((items) => items[items.length - 1]).filter((x): x is SignedCrewLinkLocation => Boolean(x) && x.groupId === groupId).map(clone); }
  async listSignedHistory(groupId: string, deviceId: string) { return (this.history.get(memberKey(groupId, deviceId)) ?? []).map(clone); }
  async getSignedOutbox(messageId: string) { const value = this.outbox.get(messageId); return value && clone(value); }
  async listSignedOutbox() { return [...this.outbox.values()].map(clone); }
  async listDueSignedOutbox(at: string) { const now = Date.parse(at); return [...this.outbox.values()].filter((x) => x.state !== 'exhausted' && Date.parse(x.nextAttemptAt) <= now && expires(x.envelope) > now).map(clone); }
  async updateSignedOutboxAttempt(item: SignedOutboxItem): Promise<SignedCommandResult> {
    const current = this.outbox.get(item.envelope.messageId);
    if (!current || JSON.stringify(current.envelope) !== JSON.stringify(item.envelope)) return { accepted: false, reason: 'outbox_changed' };
    const authorization = this.authorize(item.envelope);
    if (authorization) { this.outbox.delete(item.envelope.messageId); return { accepted: false, reason: authorization }; }
    this.outbox.set(item.envelope.messageId, clone(item)); return { accepted: true, value: undefined };
  }
  async purgeSignedOutbox(ownerDeviceId: string, groupId?: string) { let count = 0; for (const [id, item] of this.outbox) if (item.ownerDeviceId === ownerDeviceId && (!groupId || item.envelope.groupId === groupId)) { this.outbox.delete(id); count++; } return count; }
  async listSignedObservations(messageId: string) { return this.observations.filter((x) => x.messageId === messageId).map(clone); }
  async recordSignedRejection(rejection: SignedRejectionRecord) { this.rejections.push(clone(rejection)); while (this.rejections.length > this.limits.rejections) this.rejections.shift(); }
  async listSignedRejections() { return this.rejections.map(clone); }
  async pruneSignedState(at: string) {
    const time = Date.parse(at); for (const [id, value] of this.seen) if (value.expiresAt <= time) this.seen.delete(id);
    for (const [id, value] of this.locations) if (expires(value) <= time) this.locations.delete(id);
    for (const [id, value] of this.outbox) if (expires(value.envelope) <= time) this.outbox.delete(id);
    for (const [id, value] of this.acknowledgements) if (expires(value) <= time) this.acknowledgements.delete(id);
  }
  async deleteSignedPeerData(groupId: string, deviceId: string) {
    await this.purgeSignedOutbox(deviceId, groupId);
    this.history.delete(memberKey(groupId, deviceId)); for (const [id, location] of this.locations) if (location.groupId === groupId && location.senderDeviceId === deviceId) this.locations.delete(id);
    for (const [key] of this.streams) if (key.startsWith(`${groupId}\u0000${deviceId}\u0000`)) this.streams.delete(key);
  }
  async deleteSignedGroupData(groupId: string) {
    this.groups.delete(groupId); for (const [key] of this.localSequences) if (key.startsWith(`${groupId}\u0000`)) this.localSequences.delete(key); for (const [key, value] of this.memberships) if (value.groupId === groupId) this.memberships.delete(key);
    for (const [key, value] of this.tombstones) if (value.groupId === groupId) this.tombstones.delete(key);
    for (const [id, value] of this.records) if (value.groupId === groupId) this.records.delete(id);
    for (const [id, value] of this.seen) if (value.groupId === groupId) this.seen.delete(id);
    for (const [key] of this.streams) if (key.startsWith(`${groupId}\u0000`)) this.streams.delete(key);
    for (const [id, value] of this.locations) if (value.groupId === groupId) this.locations.delete(id);
    for (const [key] of this.history) if (key.startsWith(`${groupId}\u0000`)) this.history.delete(key);
    for (const [id, value] of this.outbox) if (value.envelope.groupId === groupId) this.outbox.delete(id);
    for (const [id, value] of this.acknowledgements) if (value.groupId === groupId) this.acknowledgements.delete(id);
    for (let i = this.observations.length - 1; i >= 0; i--) if (this.observations[i].groupId === groupId) this.observations.splice(i, 1);
    for (let i = this.rejections.length - 1; i >= 0; i--) if (this.rejections[i].groupId === groupId) this.rejections.splice(i, 1);
  }
  async deleteAllSignedCrewData() { this.trusted.clear(); this.groups.clear(); this.localSequences.clear(); this.memberships.clear(); this.tombstones.clear(); this.records.clear(); this.seen.clear(); this.streams.clear(); this.locations.clear(); this.history.clear(); this.outbox.clear(); this.acknowledgements.clear(); this.observations.splice(0); this.rejections.splice(0); }
  async exportSignedState(): Promise<SignedRepositorySnapshot> { return clone({ trusted: [...this.trusted.values()], groups: [...this.groups.values()], memberships: [...this.memberships.values()], tombstones: [...this.tombstones.values()], outbox: [...this.outbox.values()], locations: [...this.locations.values()], acknowledgements: [...this.acknowledgements.values()] }); }
  private authorize(envelope: SignedCrewLinkEnvelope): string | undefined {
    const trust = this.trusted.get(envelope.senderDeviceId); if (!trust || trust.revokedAt) return 'untrusted_or_revoked_key';
    if (trust.publicKey !== envelope.signerPublicKey) return 'key_changed';
    const group = this.groups.get(envelope.groupId); if (!group) return 'unknown_group';
    const member = this.memberships.get(memberKey(envelope.groupId, envelope.senderDeviceId));
    if (!member || member.status !== 'active') return 'unauthorized_sender';
    if (member.publicKey !== envelope.signerPublicKey || envelope.membershipEpoch !== group.epoch) return 'stale_or_future_epoch';
    if (this.tombstones.has(memberKey(envelope.groupId, envelope.senderDeviceId))) return 'tombstoned';
    return undefined;
  }
  private observe(envelope: SignedCrewLinkLocation, transport: TransportKind, observedAt: string, duplicate: boolean) { this.observations.push({ messageId: envelope.messageId, groupId: envelope.groupId, transport, observedAt, duplicate }); while (this.observations.length > this.limits.observations) this.observations.shift(); }
  private async reject(reason: string, envelope: SignedCrewLinkEnvelope, recordedAt: string): Promise<SignedCommandResult<never>> { await this.recordSignedRejection({ reason, messageId: envelope.messageId, groupId: envelope.groupId, recordedAt }); return { accepted: false, reason }; }
}
