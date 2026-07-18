import { z } from 'zod';
export * from './signed';

export const CREW_LINK_VERSION = 1 as const;
export const DEFAULT_TTL_SECONDS = 120;
export const MAX_TTL_SECONDS = 3_600;
export const DEFAULT_MAX_FUTURE_SKEW_MS = 2 * 60 * 1_000;
export const DEFAULT_RETENTION_MS = 24 * 60 * 60 * 1_000;

const idPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const groupPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

export const MessageIdSchema = z.string().min(1).max(128).regex(idPattern);
export const GroupIdSchema = z.string().min(1).max(64).regex(groupPattern);
export const DeviceIdSchema = z.string().min(1).max(128).regex(idPattern);
export const StreamIdSchema = z.string().min(1).max(128).regex(idPattern);
export const TimestampSchema = z.string().datetime({ offset: true });
export const TtlSecondsSchema = z.number().int().min(1).max(MAX_TTL_SECONDS);
export const SequenceSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);

export const CoordinatesSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  accuracyMeters: z.number().finite().nonnegative().max(100_000).optional(),
  altitudeMeters: z.number().finite().min(-1_000).max(100_000).optional(),
  headingDegrees: z.number().finite().min(0).lt(360).optional(),
  speedMetersPerSecond: z.number().finite().nonnegative().max(500).optional(),
}).strict();

const EnvelopeSchema = z.object({
  version: z.literal(CREW_LINK_VERSION),
  messageId: MessageIdSchema,
  groupId: GroupIdSchema,
  deviceId: DeviceIdSchema,
  streamId: StreamIdSchema,
  sequence: SequenceSchema,
  sentAt: TimestampSchema,
  ttlSeconds: TtlSecondsSchema,
});

export const CrewLinkLocationMessageSchema = EnvelopeSchema.extend({
  type: z.literal('location'),
  payload: CoordinatesSchema.extend({ capturedAt: TimestampSchema }).strict(),
}).strict();

export const CrewLinkAckMessageSchema = EnvelopeSchema.extend({
  type: z.literal('ack'),
  payload: z.object({
    acknowledgedMessageId: MessageIdSchema,
    receivedAt: TimestampSchema,
    status: z.enum(['received', 'rejected']),
    reason: z.string().min(1).max(256).optional(),
  }).strict().superRefine((payload, context) => {
    if (payload.status === 'received' && payload.reason !== undefined) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['reason'], message: 'A received ACK cannot include a rejection reason' });
    }
    if (payload.status === 'rejected' && payload.reason === undefined) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['reason'], message: 'A rejected ACK requires a reason' });
    }
  }),
}).strict();

export const CrewLinkMessageSchema = z.discriminatedUnion('type', [
  CrewLinkLocationMessageSchema,
  CrewLinkAckMessageSchema,
]);

export type Coordinates = z.infer<typeof CoordinatesSchema>;
export type CrewLinkLocationMessage = z.infer<typeof CrewLinkLocationMessageSchema>;
export type CrewLinkAckMessage = z.infer<typeof CrewLinkAckMessageSchema>;
export type CrewLinkMessage = z.infer<typeof CrewLinkMessageSchema>;
export type CrewLinkMessageType = CrewLinkMessage['type'];
export type TransportKind = 'cloud' | 'nearby' | 'mesh_radio' | 'simulated';
export type LinkState = 'unavailable' | 'discovering' | 'connecting' | 'connected' | 'degraded' | 'disconnected';
export type PresenceState = 'live' | 'recent' | 'stale' | 'unknown';
export interface PeerIdentity { peerId: string; displayName: string; publicKeyId?: string; deviceId: string }
export interface LocationSharePolicy { enabled: boolean; groupIds: string[]; precision: 'exact' | 'reduced'; retentionMinutes: number; emergencyOverride: boolean }
export type LocationFix = CrewLinkLocationMessage['payload'];
export type LocationEnvelope = CrewLinkLocationMessage;
export type CrewAck = CrewLinkAckMessage;

export type CrewLinkValidationCode =
  | 'invalid_wire_message'
  | 'wrong_group'
  | 'future_timestamp'
  | 'timestamp_order'
  | 'expired'
  | 'duplicate_message'
  | 'duplicate_sequence'
  | 'stale_sequence';

export type CrewLinkValidationIssue = {
  code: CrewLinkValidationCode;
  message: string;
  path?: string;
};

export type CrewLinkValidationOptions = {
  expectedGroupId?: string;
  now?: number | Date;
  maxFutureSkewMs?: number;
  previousMessages?: readonly CrewLinkMessage[];
};

export type CrewLinkValidationResult =
  | { success: true; message: CrewLinkMessage }
  | { success: false; issues: CrewLinkValidationIssue[] };

const toMillis = (value: number | Date): number => value instanceof Date ? value.getTime() : value;
const eventTime = (message: CrewLinkMessage): number => Date.parse(
  message.type === 'location' ? message.payload.capturedAt : message.payload.receivedAt,
);

export const validateCrewLinkMessage = (
  input: unknown,
  options: CrewLinkValidationOptions = {},
): CrewLinkValidationResult => {
  const parsed = CrewLinkMessageSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      issues: parsed.error.issues.map((issue) => ({
        code: 'invalid_wire_message',
        message: issue.message,
        path: issue.path.join('.'),
      })),
    };
  }

  const message = parsed.data;
  const issues: CrewLinkValidationIssue[] = [];
  const now = toMillis(options.now ?? Date.now());
  const maxFutureSkewMs = options.maxFutureSkewMs ?? DEFAULT_MAX_FUTURE_SKEW_MS;
  const sentAt = Date.parse(message.sentAt);
  const occurredAt = eventTime(message);

  if (options.expectedGroupId !== undefined && message.groupId !== options.expectedGroupId) {
    issues.push({ code: 'wrong_group', message: `Expected group ${options.expectedGroupId}` });
  }
  if (sentAt > now + maxFutureSkewMs || occurredAt > now + maxFutureSkewMs) {
    issues.push({ code: 'future_timestamp', message: 'Message timestamp exceeds allowed future clock skew' });
  }
  if (occurredAt > sentAt) {
    issues.push({ code: 'timestamp_order', message: 'Payload event time cannot be later than sentAt' });
  }
  if (sentAt + message.ttlSeconds * 1_000 < now) {
    issues.push({ code: 'expired', message: 'Message TTL has expired' });
  }

  const previous = options.previousMessages ?? [];
  if (previous.some((candidate) => candidate.messageId === message.messageId)) {
    issues.push({ code: 'duplicate_message', message: `Message ${message.messageId} was already received` });
  }

  const streamMessages = previous.filter((candidate) =>
    candidate.deviceId === message.deviceId && candidate.streamId === message.streamId,
  );
  if (streamMessages.some((candidate) => candidate.sequence === message.sequence)) {
    issues.push({ code: 'duplicate_sequence', message: 'Device stream sequence was already received' });
  } else if (streamMessages.some((candidate) => candidate.sequence > message.sequence)) {
    issues.push({ code: 'stale_sequence', message: 'Device stream sequence is behind the accepted high-water mark' });
  }

  return issues.length > 0 ? { success: false, issues } : { success: true, message };
};

export const parseCrewLinkMessage = (
  input: unknown,
  options: CrewLinkValidationOptions = {},
): CrewLinkMessage => {
  const result = validateCrewLinkMessage(input, options);
  if (result.success) return result.message;
  throw new CrewLinkValidationError(result.issues);
};

export class CrewLinkValidationError extends Error {
  readonly issues: readonly CrewLinkValidationIssue[];

  constructor(issues: readonly CrewLinkValidationIssue[]) {
    super(issues.map((issue) => issue.message).join('; '));
    this.name = 'CrewLinkValidationError';
    this.issues = issues;
  }
}

/**
 * Creates an opaque app-install identifier. Callers must persist it in app storage;
 * it must never be derived from IMEI, advertising ID, serial number, or other hardware identity.
 */
export const createAppGeneratedDeviceId = (randomUuid: () => string): string => {
  const id = randomUuid();
  if (!z.string().uuid().safeParse(id).success) throw new Error('randomUuid must return a UUID');
  return id;
};

export type PresenceThresholds = { liveMs: number; recentMs: number; staleMs: number };
export const DEFAULT_PRESENCE_THRESHOLDS: PresenceThresholds = {
  liveMs: 60_000,
  recentMs: 5 * 60_000,
  staleMs: 30 * 60_000,
};
export type PresenceResult = { status: PresenceState; ageMs: number; expiresAt: string };

export const calculatePresence = (
  message: CrewLinkLocationMessage | undefined,
  now: number | Date = Date.now(),
  thresholds: PresenceThresholds = DEFAULT_PRESENCE_THRESHOLDS,
): PresenceResult => {
  if (message === undefined) return { status: 'unknown', ageMs: Number.POSITIVE_INFINITY, expiresAt: '' };
  const nowMs = toMillis(now);
  const capturedAt = Date.parse(message.payload.capturedAt);
  const ageMs = Math.max(0, nowMs - capturedAt);
  if (!(thresholds.liveMs <= thresholds.recentMs && thresholds.recentMs <= thresholds.staleMs)) {
    throw new RangeError('Presence thresholds must be ordered live <= recent <= stale');
  }
  return {
    status: ageMs <= thresholds.liveMs ? 'live' : ageMs <= thresholds.recentMs ? 'recent' : ageMs <= thresholds.staleMs ? 'stale' : 'unknown',
    ageMs,
    expiresAt: new Date(capturedAt + message.ttlSeconds * 1_000).toISOString(),
  };
};

const compareNewest = (left: CrewLinkLocationMessage, right: CrewLinkLocationMessage): number => {
  const eventDifference = Date.parse(left.payload.capturedAt) - Date.parse(right.payload.capturedAt);
  if (eventDifference !== 0) return eventDifference;
  const sentDifference = Date.parse(left.sentAt) - Date.parse(right.sentAt);
  if (sentDifference !== 0) return sentDifference;
  if (left.streamId === right.streamId && left.sequence !== right.sequence) return left.sequence - right.sequence;
  return left.messageId.localeCompare(right.messageId);
};

export const selectNewestLocation = (
  messages: readonly CrewLinkLocationMessage[],
): CrewLinkLocationMessage | undefined => messages.reduce<CrewLinkLocationMessage | undefined>(
  (newest, candidate) => newest === undefined || compareNewest(candidate, newest) > 0 ? candidate : newest,
  undefined,
);

export const selectNewestLocationsByDevice = (
  messages: readonly CrewLinkLocationMessage[],
): Record<string, CrewLinkLocationMessage> => {
  const newest: Record<string, CrewLinkLocationMessage> = {};
  for (const message of messages) {
    const current = newest[message.deviceId];
    if (current === undefined || compareNewest(message, current) > 0) newest[message.deviceId] = message;
  }
  return newest;
};

const roundDecimal = (value: number, decimalPlaces: number): number => {
  const factor = 10 ** decimalPlaces;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

export const reduceLocationPrecision = (
  message: CrewLinkLocationMessage,
  decimalPlaces = 3,
): CrewLinkLocationMessage => {
  if (!Number.isInteger(decimalPlaces) || decimalPlaces < 0 || decimalPlaces > 6) {
    throw new RangeError('decimalPlaces must be an integer from 0 through 6');
  }
  const impliedAccuracyMeters = 111_320 / 10 ** decimalPlaces / 2;
  return {
    ...message,
    payload: {
      ...message.payload,
      latitude: roundDecimal(message.payload.latitude, decimalPlaces),
      longitude: roundDecimal(message.payload.longitude, decimalPlaces),
      accuracyMeters: Math.max(message.payload.accuracyMeters ?? 0, impliedAccuracyMeters),
    },
  };
};

export type RetentionOptions = {
  now?: number | Date;
  retentionMs?: number;
  maxLocationsPerDevice?: number;
};

export const pruneRetainedLocations = (
  messages: readonly CrewLinkLocationMessage[],
  options: RetentionOptions = {},
): CrewLinkLocationMessage[] => {
  const now = toMillis(options.now ?? Date.now());
  const retentionMs = options.retentionMs ?? DEFAULT_RETENTION_MS;
  const maxPerDevice = options.maxLocationsPerDevice ?? Number.POSITIVE_INFINITY;
  if (!Number.isFinite(retentionMs) || retentionMs < 0) throw new RangeError('retentionMs must be non-negative');
  if (!(maxPerDevice === Number.POSITIVE_INFINITY || (Number.isInteger(maxPerDevice) && maxPerDevice >= 0))) {
    throw new RangeError('maxLocationsPerDevice must be a non-negative integer');
  }

  const retained = messages
    .filter((message) => Date.parse(message.payload.capturedAt) >= now - retentionMs)
    .sort(compareNewest);
  const counts = new Map<string, number>();
  return retained.reverse().filter((message) => {
    const count = counts.get(message.deviceId) ?? 0;
    if (count >= maxPerDevice) return false;
    counts.set(message.deviceId, count + 1);
    return true;
  }).reverse();
};

export type AckMessageFields = Pick<CrewLinkAckMessage,
  'messageId' | 'deviceId' | 'streamId' | 'sequence' | 'sentAt'
> & {
  status?: CrewLinkAckMessage['payload']['status'];
  reason?: string;
  ttlSeconds?: number;
};

export const createAckMessage = (
  acknowledged: CrewLinkMessage,
  fields: AckMessageFields,
): CrewLinkAckMessage => CrewLinkAckMessageSchema.parse({
  version: CREW_LINK_VERSION,
  type: 'ack',
  messageId: fields.messageId,
  groupId: acknowledged.groupId,
  deviceId: fields.deviceId,
  streamId: fields.streamId,
  sequence: fields.sequence,
  sentAt: fields.sentAt,
  ttlSeconds: fields.ttlSeconds ?? DEFAULT_TTL_SECONDS,
  payload: {
    acknowledgedMessageId: acknowledged.messageId,
    receivedAt: fields.sentAt,
    status: fields.status ?? 'received',
    ...(fields.reason === undefined ? {} : { reason: fields.reason }),
  },
});

export const isAckFor = (ack: CrewLinkAckMessage, message: CrewLinkMessage): boolean =>
  ack.groupId === message.groupId && ack.payload.acknowledgedMessageId === message.messageId;

export const findAckFor = (
  message: CrewLinkMessage,
  acknowledgements: readonly CrewLinkAckMessage[],
): CrewLinkAckMessage | undefined => acknowledgements.find((ack) => isAckFor(ack, message));

export type TransportBatch = { transport: string; messages: readonly unknown[] };
export type RejectedTransportMessage = {
  transport: string;
  input: unknown;
  issues: readonly CrewLinkValidationIssue[];
};
export type TransportAggregation = {
  messages: CrewLinkMessage[];
  locations: CrewLinkLocationMessage[];
  acknowledgements: CrewLinkAckMessage[];
  newestLocationsByDevice: Record<string, CrewLinkLocationMessage>;
  rejected: RejectedTransportMessage[];
};

export const aggregateTransportMessages = (
  batches: readonly TransportBatch[],
  options: Omit<CrewLinkValidationOptions, 'previousMessages'> = {},
): TransportAggregation => {
  const accepted: CrewLinkMessage[] = [];
  const rejected: RejectedTransportMessage[] = [];

  const candidates = batches.flatMap((batch) => batch.messages.map((input) => ({ transport: batch.transport, input })));
  candidates.sort((left, right) => {
    const leftParsed = CrewLinkMessageSchema.safeParse(left.input);
    const rightParsed = CrewLinkMessageSchema.safeParse(right.input);
    if (!leftParsed.success) return rightParsed.success ? 1 : 0;
    if (!rightParsed.success) return -1;
    return Date.parse(leftParsed.data.sentAt) - Date.parse(rightParsed.data.sentAt)
      || leftParsed.data.sequence - rightParsed.data.sequence;
  });

  for (const candidate of candidates) {
    const result = validateCrewLinkMessage(candidate.input, { ...options, previousMessages: accepted });
    if (result.success) accepted.push(result.message);
    else rejected.push({ ...candidate, issues: result.issues });
  }

  const locations = accepted.filter((message): message is CrewLinkLocationMessage => message.type === 'location');
  const acknowledgements = accepted.filter((message): message is CrewLinkAckMessage => message.type === 'ack');
  return {
    messages: accepted,
    locations,
    acknowledgements,
    newestLocationsByDevice: selectNewestLocationsByDevice(locations),
    rejected,
  };
};
