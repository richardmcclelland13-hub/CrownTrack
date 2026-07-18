import { z } from 'zod';

const idPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const groupPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const MessageIdSchema = z.string().min(1).max(128).regex(idPattern);
const GroupIdSchema = z.string().min(1).max(64).regex(groupPattern);
const DeviceIdSchema = z.string().min(1).max(128).regex(idPattern);
const StreamIdSchema = z.string().min(1).max(128).regex(idPattern);
const TimestampSchema = z.string().datetime({ offset: true });
const TtlSecondsSchema = z.number().int().min(1).max(3_600);
const SequenceSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const CoordinatesSchema = z.object({
  latitude: z.number().finite().min(-90).max(90), longitude: z.number().finite().min(-180).max(180),
  accuracyMeters: z.number().finite().nonnegative().max(100_000).optional(), altitudeMeters: z.number().finite().min(-1_000).max(100_000).optional(),
  headingDegrees: z.number().finite().min(0).lt(360).optional(), speedMetersPerSecond: z.number().finite().nonnegative().max(500).optional(),
}).strict();

export const SIGNED_CREWLINK_VERSION = 2 as const;
export const SIGNED_CREWLINK_DOMAIN = 'crowntrack-crewlink-signed/v1' as const;

const PublicKeySchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const SignatureSchema = z.string().regex(/^[A-Za-z0-9_-]{86}$/);
const SignedEnvelopeSchema = z.object({
  version: z.literal(SIGNED_CREWLINK_VERSION), domain: z.literal(SIGNED_CREWLINK_DOMAIN),
  messageId: MessageIdSchema, groupId: GroupIdSchema, senderDeviceId: DeviceIdSchema,
  signerPublicKey: PublicKeySchema, streamId: StreamIdSchema, sequence: SequenceSchema,
  membershipEpoch: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  sentAt: TimestampSchema, ttlSeconds: TtlSecondsSchema,
});
const MemberSchema = z.object({ deviceId: DeviceIdSchema, publicKey: PublicKeySchema, displayName: z.string().min(1).max(96) }).strict();

export const SignedCrewLinkLocationSchema = SignedEnvelopeSchema.extend({
  type: z.literal('location'), payload: CoordinatesSchema.extend({ capturedAt: TimestampSchema }).strict(), signature: SignatureSchema,
}).strict();
export const SignedCrewLinkAckSchema = SignedEnvelopeSchema.extend({
  type: z.literal('ack'), payload: z.object({ acknowledgedMessageId: MessageIdSchema, receivedAt: TimestampSchema, status: z.literal('received') }).strict(), signature: SignatureSchema,
}).strict();
export const SignedCrewLinkMembershipGrantSchema = SignedEnvelopeSchema.extend({
  type: z.literal('membership_grant'), payload: z.object({ member: MemberSchema, grantedEpoch: z.number().int().positive().max(Number.MAX_SAFE_INTEGER) }).strict(), signature: SignatureSchema,
}).strict();
export const SignedCrewLinkMembershipRevocationSchema = SignedEnvelopeSchema.extend({
  type: z.literal('membership_revocation'), payload: z.object({ memberDeviceId: DeviceIdSchema, memberPublicKey: PublicKeySchema, revokedEpoch: z.number().int().positive().max(Number.MAX_SAFE_INTEGER) }).strict(), signature: SignatureSchema,
}).strict();
export const SignedCrewLinkEnvelopeSchema = z.discriminatedUnion('type', [
  SignedCrewLinkLocationSchema, SignedCrewLinkAckSchema, SignedCrewLinkMembershipGrantSchema, SignedCrewLinkMembershipRevocationSchema,
]);
export const UnsignedCrewLinkEnvelopeSchema = z.discriminatedUnion('type', [
  SignedCrewLinkLocationSchema.omit({ signature: true }), SignedCrewLinkAckSchema.omit({ signature: true }),
  SignedCrewLinkMembershipGrantSchema.omit({ signature: true }), SignedCrewLinkMembershipRevocationSchema.omit({ signature: true }),
]);
export type SignedCrewLinkLocation = z.infer<typeof SignedCrewLinkLocationSchema>;
export type SignedCrewLinkAck = z.infer<typeof SignedCrewLinkAckSchema>;
export type SignedCrewLinkMembershipGrant = z.infer<typeof SignedCrewLinkMembershipGrantSchema>;
export type SignedCrewLinkMembershipRevocation = z.infer<typeof SignedCrewLinkMembershipRevocationSchema>;
export type SignedCrewLinkEnvelope = z.infer<typeof SignedCrewLinkEnvelopeSchema>;
type WithoutSignature<T> = T extends unknown ? Omit<T, 'signature'> : never;
export type UnsignedCrewLinkEnvelope = WithoutSignature<SignedCrewLinkEnvelope>;

const base = (value: UnsignedCrewLinkEnvelope) => ({
  domain: value.domain, groupId: value.groupId, membershipEpoch: value.membershipEpoch,
  messageId: value.messageId, senderDeviceId: value.senderDeviceId, sentAt: value.sentAt,
  signerPublicKey: value.signerPublicKey, streamId: value.streamId, ttlSeconds: value.ttlSeconds,
  type: value.type, version: value.version,
});
const canonicalPayload = (value: UnsignedCrewLinkEnvelope): unknown => {
  switch (value.type) {
    case 'location': {
      const p = value.payload;
      return { accuracyMeters: p.accuracyMeters, altitudeMeters: p.altitudeMeters, capturedAt: p.capturedAt, headingDegrees: p.headingDegrees, latitude: p.latitude, longitude: p.longitude, speedMetersPerSecond: p.speedMetersPerSecond };
    }
    case 'ack': return { acknowledgedMessageId: value.payload.acknowledgedMessageId, receivedAt: value.payload.receivedAt, status: value.payload.status };
    case 'membership_grant': return { grantedEpoch: value.payload.grantedEpoch, member: { deviceId: value.payload.member.deviceId, displayName: value.payload.member.displayName, publicKey: value.payload.member.publicKey } };
    case 'membership_revocation': return { memberDeviceId: value.payload.memberDeviceId, memberPublicKey: value.payload.memberPublicKey, revokedEpoch: value.payload.revokedEpoch };
  }
};

/** Strict canonical UTF-8 bytes; signature and transport metadata are excluded. */
export const canonicalSignedEnvelopeBytes = (value: UnsignedCrewLinkEnvelope): Uint8Array =>
  new TextEncoder().encode(JSON.stringify({ ...base(value), payload: canonicalPayload(value) }));
export const parseSignedCrewLinkEnvelope = (input: unknown): SignedCrewLinkEnvelope => SignedCrewLinkEnvelopeSchema.parse(input);
export const parseUnsignedCrewLinkEnvelope = (input: unknown): UnsignedCrewLinkEnvelope => UnsignedCrewLinkEnvelopeSchema.parse(input) as UnsignedCrewLinkEnvelope;
export const signedEnvelopeExpiresAt = (value: Pick<SignedCrewLinkEnvelope, 'sentAt' | 'ttlSeconds'>): number =>
  Date.parse(value.sentAt) + value.ttlSeconds * 1_000;
