import {
  SIGNED_CREWLINK_DOMAIN, SIGNED_CREWLINK_VERSION, SignedCrewLinkEnvelopeSchema,
  canonicalSignedEnvelopeBytes, parseUnsignedCrewLinkEnvelope,
  signedEnvelopeExpiresAt,
  type SignedCrewLinkEnvelope, type SignedCrewLinkLocation, type SignedCrewLinkMembershipGrant,
  type SignedCrewLinkMembershipRevocation, type UnsignedCrewLinkEnvelope,
} from '@crowntrack/crew-protocol';
import { type CanonicalSigner, verifyBase64Url } from '@crowntrack/crew-identity';

export type TrustedDevice = { deviceId: string; publicKey: string; revokedAt?: string };
export type VerifiedMembership = { groupId: string; deviceId: string; publicKey: string; epoch: number; status: 'active' | 'revoked' };
/** `origin` prevents an imported grant from ever being treated as a locally-created group. */
export type VerifiedGroup = { groupId: string; authorityDeviceId: string; authorityPublicKey: string; epoch: number; origin: 'local_owned' | 'imported' };
export type SignedRejection =
  | 'malformed' | 'invalid_signature' | 'untrusted_key' | 'key_changed' | 'unknown_group'
  | 'unauthorized_sender' | 'stale_epoch' | 'future_epoch' | 'revoked' | 'expired'
  | 'future_timestamp' | 'duplicate' | 'stale_sequence' | 'invalid_membership_record';
export type SignedDecision =
  | { accepted: true; envelope: SignedCrewLinkEnvelope; replayKey: string; streamKey?: string }
  | { accepted: false; reason: SignedRejection };
export type MembershipDecision =
  | { accepted: true; envelope: SignedCrewLinkMembershipGrant | SignedCrewLinkMembershipRevocation; nextGroup: VerifiedGroup; nextMembership: VerifiedMembership }
  | { accepted: false; reason: SignedRejection };

/**
 * In-memory parity model for the repository boundary. Decision methods are pure:
 * callers must invoke a commit method only after their durable transaction succeeds.
 */
export class VerifiedMembershipService {
  private readonly trusted = new Map<string, TrustedDevice>();
  private readonly groups = new Map<string, VerifiedGroup>();
  private readonly members = new Map<string, VerifiedMembership>();
  private readonly seen = new Set<string>();
  private readonly streams = new Map<string, number>();

  trust(device: TrustedDevice): void { this.trusted.set(device.deviceId, { ...device }); }
  createGroup(group: VerifiedGroup): void {
    if (group.epoch !== 1) throw new Error('A new group must start at epoch one');
    this.groups.set(group.groupId, { ...group });
    this.members.set(this.key(group.groupId, group.authorityDeviceId), { groupId: group.groupId, deviceId: group.authorityDeviceId, publicKey: group.authorityPublicKey, epoch: 1, status: 'active' });
  }
  membership(groupId: string, deviceId: string): VerifiedMembership | undefined { const value = this.members.get(this.key(groupId, deviceId)); return value && { ...value }; }
  group(groupId: string): VerifiedGroup | undefined { const value = this.groups.get(groupId); return value && { ...value }; }

  async sign(unsignedInput: unknown, signer: CanonicalSigner): Promise<SignedCrewLinkEnvelope> {
    const unsigned = parseUnsignedCrewLinkEnvelope(unsignedInput);
    if (unsigned.signerPublicKey !== signer.publicKey) throw new Error('Signer public key does not match the signed envelope');
    return SignedCrewLinkEnvelopeSchema.parse({ ...unsigned, signature: await signer.sign(canonicalSignedEnvelopeBytes(unsigned)) });
  }
  async createGrant(groupId: string, member: SignedCrewLinkMembershipGrant['payload']['member'], signer: CanonicalSigner, fields: Pick<UnsignedCrewLinkEnvelope, 'messageId' | 'streamId' | 'sequence' | 'sentAt' | 'ttlSeconds'>): Promise<SignedCrewLinkMembershipGrant> {
    const group = this.requireGroup(groupId); const epoch = group.epoch + 1;
    return this.sign({ ...fields, streamId: `membership-${group.authorityDeviceId}`, version: SIGNED_CREWLINK_VERSION, domain: SIGNED_CREWLINK_DOMAIN, type: 'membership_grant', groupId, senderDeviceId: group.authorityDeviceId, signerPublicKey: group.authorityPublicKey, membershipEpoch: epoch, payload: { member, grantedEpoch: epoch } }, signer) as Promise<SignedCrewLinkMembershipGrant>;
  }
  async createRevocation(groupId: string, member: VerifiedMembership, signer: CanonicalSigner, fields: Pick<UnsignedCrewLinkEnvelope, 'messageId' | 'streamId' | 'sequence' | 'sentAt' | 'ttlSeconds'>): Promise<SignedCrewLinkMembershipRevocation> {
    const group = this.requireGroup(groupId);
    if (member.deviceId === group.authorityDeviceId) throw new Error('The single group authority cannot revoke itself');
    if (member.status !== 'active') throw new Error('Only an active member can be revoked');
    const epoch = group.epoch + 1;
    return this.sign({ ...fields, streamId: `membership-${group.authorityDeviceId}`, version: SIGNED_CREWLINK_VERSION, domain: SIGNED_CREWLINK_DOMAIN, type: 'membership_revocation', groupId, senderDeviceId: group.authorityDeviceId, signerPublicKey: group.authorityPublicKey, membershipEpoch: epoch, payload: { memberDeviceId: member.deviceId, memberPublicKey: member.publicKey, revokedEpoch: epoch } }, signer) as Promise<SignedCrewLinkMembershipRevocation>;
  }

  decide(input: unknown, now = Date.now()): SignedDecision {
    const parsed = SignedCrewLinkEnvelopeSchema.safeParse(input);
    if (!parsed.success) return { accepted: false, reason: 'malformed' };
    const envelope = parsed.data; const sentAt = Date.parse(envelope.sentAt);
    if (!Number.isFinite(sentAt) || sentAt > now + 120_000) return { accepted: false, reason: 'future_timestamp' };
    if (signedEnvelopeExpiresAt(envelope) <= now) return { accepted: false, reason: 'expired' };
    const { signature, ...unsigned } = envelope;
    if (!verifyBase64Url(envelope.signerPublicKey, canonicalSignedEnvelopeBytes(unsigned), signature)) return { accepted: false, reason: 'invalid_signature' };
    const trusted = this.trusted.get(envelope.senderDeviceId);
    if (!trusted) return { accepted: false, reason: 'untrusted_key' };
    if (trusted.publicKey !== envelope.signerPublicKey) return { accepted: false, reason: 'key_changed' };
    if (trusted.revokedAt) return { accepted: false, reason: 'revoked' };
    const group = this.groups.get(envelope.groupId);
    if (!group) return { accepted: false, reason: 'unknown_group' };
    if (envelope.type === 'membership_grant' || envelope.type === 'membership_revocation') return { accepted: false, reason: 'invalid_membership_record' };
    const member = this.members.get(this.key(envelope.groupId, envelope.senderDeviceId));
    if (!member || member.publicKey !== envelope.signerPublicKey) return { accepted: false, reason: 'unauthorized_sender' };
    if (member.status === 'revoked') return { accepted: false, reason: 'revoked' };
    if (envelope.membershipEpoch < group.epoch) return { accepted: false, reason: 'stale_epoch' };
    if (envelope.membershipEpoch > group.epoch) return { accepted: false, reason: 'future_epoch' };
    const replayKey = envelope.messageId; const streamKey = this.key(envelope.groupId, `${envelope.senderDeviceId}:${envelope.streamId}`);
    if (this.seen.has(replayKey)) return { accepted: false, reason: 'duplicate' };
    if ((this.streams.get(streamKey) ?? -1) >= envelope.sequence) return { accepted: false, reason: 'stale_sequence' };
    return { accepted: true, envelope, replayKey, streamKey };
  }
  commitAccepted(decision: Extract<SignedDecision, { accepted: true }>): void {
    if (this.seen.has(decision.replayKey)) throw new Error('Accepted message was already committed');
    if (decision.streamKey && (this.streams.get(decision.streamKey) ?? -1) >= decision.envelope.sequence) throw new Error('Accepted stream sequence was already committed');
    this.seen.add(decision.replayKey);
    if (decision.streamKey) this.streams.set(decision.streamKey, decision.envelope.sequence);
  }
  decideMembership(input: unknown, now = Date.now()): MembershipDecision {
    const parsed = SignedCrewLinkEnvelopeSchema.safeParse(input);
    if (!parsed.success || (parsed.data.type !== 'membership_grant' && parsed.data.type !== 'membership_revocation')) return { accepted: false, reason: 'invalid_membership_record' };
    const envelope = parsed.data; const sentAt = Date.parse(envelope.sentAt); const { signature, ...unsigned } = envelope;
    if (!Number.isFinite(sentAt) || sentAt > now + 120_000) return { accepted: false, reason: 'future_timestamp' };
    if (signedEnvelopeExpiresAt(envelope) <= now) return { accepted: false, reason: 'expired' };
    if (!verifyBase64Url(envelope.signerPublicKey, canonicalSignedEnvelopeBytes(unsigned), signature)) return { accepted: false, reason: 'invalid_signature' };
    const group = this.groups.get(envelope.groupId);
    if (!group || envelope.senderDeviceId !== group.authorityDeviceId || envelope.signerPublicKey !== group.authorityPublicKey || envelope.streamId !== `membership-${group.authorityDeviceId}`) return { accepted: false, reason: 'invalid_membership_record' };
    const epoch = envelope.type === 'membership_grant' ? envelope.payload.grantedEpoch : envelope.payload.revokedEpoch;
    if (epoch !== group.epoch + 1 || envelope.membershipEpoch !== epoch) return { accepted: false, reason: epoch <= group.epoch ? 'stale_epoch' : 'future_epoch' };
    const deviceId = envelope.type === 'membership_grant' ? envelope.payload.member.deviceId : envelope.payload.memberDeviceId;
    const publicKey = envelope.type === 'membership_grant' ? envelope.payload.member.publicKey : envelope.payload.memberPublicKey;
    if (deviceId === group.authorityDeviceId && envelope.type === 'membership_revocation') return { accepted: false, reason: 'invalid_membership_record' };
    const trusted = this.trusted.get(deviceId);
    if (!trusted || trusted.publicKey !== publicKey || trusted.revokedAt) return { accepted: false, reason: 'untrusted_key' };
    const current = this.members.get(this.key(group.groupId, deviceId));
    if (envelope.type === 'membership_revocation' && current?.status !== 'active') return { accepted: false, reason: 'invalid_membership_record' };
    return { accepted: true, envelope, nextGroup: { ...group, epoch }, nextMembership: { groupId: group.groupId, deviceId, publicKey, epoch, status: envelope.type === 'membership_grant' ? 'active' : 'revoked' } };
  }
  commitMembership(decision: Extract<MembershipDecision, { accepted: true }>): void {
    const current = this.groups.get(decision.nextGroup.groupId);
    if (!current || current.epoch + 1 !== decision.nextGroup.epoch) throw new Error('Membership epoch changed before commit');
    this.groups.set(decision.nextGroup.groupId, { ...decision.nextGroup });
    this.members.set(this.key(decision.nextMembership.groupId, decision.nextMembership.deviceId), { ...decision.nextMembership });
  }
  private key(groupId: string, deviceId: string) { return `${groupId}\u0000${deviceId}`; }
  private requireGroup(groupId: string) { const group = this.groups.get(groupId); if (!group) throw new Error('Unknown verified group'); return group; }
}
export const asSignedLocation = (decision: SignedDecision): SignedCrewLinkLocation | undefined => decision.accepted && decision.envelope.type === 'location' ? decision.envelope : undefined;
