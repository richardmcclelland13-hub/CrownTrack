import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CREW_LINK_VERSION,
  CrewLinkMessageSchema,
  aggregateTransportMessages,
  calculatePresence,
  createAckMessage,
  createAppGeneratedDeviceId,
  findAckFor,
  isAckFor,
  parseCrewLinkMessage,
  pruneRetainedLocations,
  reduceLocationPrecision,
  selectNewestLocation,
  selectNewestLocationsByDevice,
  validateCrewLinkMessage,
  type CrewLinkLocationMessage,
} from '@crowntrack/crew-protocol';

const NOW = Date.parse('2026-07-11T18:00:00.000Z');

const location = (overrides: Partial<CrewLinkLocationMessage> = {}): CrewLinkLocationMessage => ({
  version: CREW_LINK_VERSION,
  type: 'location',
  messageId: 'msg-location-1',
  groupId: 'alberta-crew',
  deviceId: 'device-a',
  streamId: 'stream-a',
  sequence: 1,
  sentAt: '2026-07-11T17:59:30.000Z',
  ttlSeconds: 60,
  payload: {
    latitude: 53.546123,
    longitude: -113.493823,
    accuracyMeters: 8,
    capturedAt: '2026-07-11T17:59:20.000Z',
  },
  ...overrides,
});

test('wire schemas are strict and discriminate location from ACK messages', () => {
  assert.equal(CrewLinkMessageSchema.safeParse(location()).success, true);
  assert.equal(CrewLinkMessageSchema.safeParse({ ...location(), unexpected: true }).success, false);
  assert.equal(CrewLinkMessageSchema.safeParse({ ...location(), type: 'ping' }).success, false);
  assert.equal(CrewLinkMessageSchema.safeParse({
    ...location(),
    payload: { ...location().payload, latitude: 90.0001 },
  }).success, false);
  assert.equal(CrewLinkMessageSchema.safeParse({
    ...location(),
    sentAt: 'not-a-timestamp',
  }).success, false);
  assert.equal(CrewLinkMessageSchema.safeParse({ ...location(), ttlSeconds: 0 }).success, false);
});

test('context validation enforces group, timestamp order, TTL, and future skew', () => {
  const wrongGroup = validateCrewLinkMessage(location(), { expectedGroupId: 'other', now: NOW });
  assert.equal(wrongGroup.success, false);
  if (!wrongGroup.success) assert.ok(wrongGroup.issues.some((issue) => issue.code === 'wrong_group'));

  const wrongOrder = validateCrewLinkMessage(location({
    payload: { ...location().payload, capturedAt: '2026-07-11T17:59:40.000Z' },
  }), { now: NOW });
  assert.equal(wrongOrder.success, false);
  if (!wrongOrder.success) assert.ok(wrongOrder.issues.some((issue) => issue.code === 'timestamp_order'));

  const expired = validateCrewLinkMessage(location({ sentAt: '2026-07-11T17:58:00.000Z' }), { now: NOW });
  assert.equal(expired.success, false);
  if (!expired.success) assert.ok(expired.issues.some((issue) => issue.code === 'expired'));

  const future = validateCrewLinkMessage(location({
    sentAt: '2026-07-11T18:02:01.000Z',
    payload: { ...location().payload, capturedAt: '2026-07-11T18:02:00.000Z' },
  }), { now: NOW });
  assert.equal(future.success, false);
  if (!future.success) assert.ok(future.issues.some((issue) => issue.code === 'future_timestamp'));
});

test('duplicate IDs and duplicate or stale stream sequences are rejected', () => {
  const prior = location();
  const duplicateId = validateCrewLinkMessage(prior, { now: NOW, previousMessages: [prior] });
  assert.equal(duplicateId.success, false);
  if (!duplicateId.success) {
    assert.ok(duplicateId.issues.some((issue) => issue.code === 'duplicate_message'));
    assert.ok(duplicateId.issues.some((issue) => issue.code === 'duplicate_sequence'));
  }

  const stale = validateCrewLinkMessage(location({ messageId: 'msg-old', sequence: 0 }), {
    now: NOW,
    previousMessages: [prior],
  });
  assert.equal(stale.success, false);
  if (!stale.success) assert.ok(stale.issues.some((issue) => issue.code === 'stale_sequence'));

  assert.equal(validateCrewLinkMessage(location({
    messageId: 'msg-new-stream',
    streamId: 'stream-after-restart',
    sequence: 0,
  }), { now: NOW, previousMessages: [prior] }).success, true);
});

test('parse helper throws a detailed protocol error for invalid input', () => {
  assert.throws(() => parseCrewLinkMessage({ type: 'location' }, { now: NOW }), /Required/);
});

test('device IDs are app-generated opaque UUIDs supplied by a secure platform factory', () => {
  const uuid = '123e4567-e89b-42d3-a456-426614174000';
  assert.equal(createAppGeneratedDeviceId(() => uuid), uuid);
  assert.throws(() => createAppGeneratedDeviceId(() => 'hardware-serial'), /UUID/);
});

test('presence moves from live to recent to stale to unknown using captured time', () => {
  const fix = location();
  assert.equal(calculatePresence(fix, Date.parse('2026-07-11T18:00:20.000Z')).status, 'live');
  assert.equal(calculatePresence(fix, Date.parse('2026-07-11T18:01:21.000Z')).status, 'recent');
  assert.equal(calculatePresence(fix, Date.parse('2026-07-11T18:06:21.000Z')).status, 'stale');
  assert.equal(calculatePresence(fix, Date.parse('2026-07-11T18:31:21.000Z')).status, 'unknown');
  assert.equal(calculatePresence(undefined, NOW).status, 'unknown');
});

test('newest selection uses event time and groups independently by device', () => {
  const older = location();
  const newer = location({
    messageId: 'msg-location-2',
    sequence: 2,
    sentAt: '2026-07-11T17:59:50.000Z',
    payload: { ...location().payload, capturedAt: '2026-07-11T17:59:40.000Z' },
  });
  const other = location({ messageId: 'msg-other', deviceId: 'device-b', streamId: 'stream-b' });
  assert.equal(selectNewestLocation([newer, older])?.messageId, newer.messageId);
  assert.deepEqual(Object.keys(selectNewestLocationsByDevice([older, newer, other])).sort(), ['device-a', 'device-b']);
  assert.equal(selectNewestLocationsByDevice([older, newer])['device-a']?.messageId, newer.messageId);
});

test('reduced precision rounds coordinates without mutating input and widens accuracy', () => {
  const original = location();
  const reduced = reduceLocationPrecision(original, 3);
  assert.equal(reduced.payload.latitude, 53.546);
  assert.equal(reduced.payload.longitude, -113.494);
  assert.ok((reduced.payload.accuracyMeters ?? 0) >= 55.66);
  assert.equal(original.payload.latitude, 53.546123);
  assert.throws(() => reduceLocationPrecision(original, 7), RangeError);
});

test('retention pruning drops old locations and caps each device at its newest samples', () => {
  const current = location({ messageId: 'current', sequence: 3 });
  const recent = location({
    messageId: 'recent',
    sequence: 2,
    sentAt: '2026-07-11T17:59:00.000Z',
    payload: { ...location().payload, capturedAt: '2026-07-11T17:58:50.000Z' },
  });
  const old = location({
    messageId: 'old',
    sequence: 1,
    sentAt: '2026-07-11T17:00:00.000Z',
    payload: { ...location().payload, capturedAt: '2026-07-11T16:59:50.000Z' },
  });
  assert.deepEqual(pruneRetainedLocations([old, recent, current], {
    now: NOW,
    retentionMs: 10 * 60 * 1_000,
    maxLocationsPerDevice: 1,
  }).map((message) => message.messageId), ['current']);
});

test('ACK helpers build valid ACKs and match within a group', () => {
  const fix = location();
  const ack = createAckMessage(fix, {
    messageId: 'ack-1',
    deviceId: 'device-b',
    streamId: 'ack-stream-b',
    sequence: 4,
    sentAt: '2026-07-11T17:59:40.000Z',
  });
  assert.equal(ack.type, 'ack');
  assert.equal(isAckFor(ack, fix), true);
  assert.equal(findAckFor(fix, [ack]), ack);
  assert.throws(() => createAckMessage(fix, {
    messageId: 'ack-rejected',
    deviceId: 'device-b',
    streamId: 'ack-stream-b',
    sequence: 5,
    sentAt: '2026-07-11T17:59:40.000Z',
    status: 'rejected',
  }));
});

test('transport aggregation orders streams, deduplicates transports, and selects newest fixes', () => {
  const first = location();
  const second = location({
    messageId: 'msg-location-2',
    sequence: 2,
    sentAt: '2026-07-11T17:59:50.000Z',
    payload: { ...location().payload, capturedAt: '2026-07-11T17:59:40.000Z' },
  });
  const result = aggregateTransportMessages([
    { transport: 'bluetooth', messages: [second, { malformed: true }] },
    { transport: 'internet', messages: [first, second] },
  ], { expectedGroupId: 'alberta-crew', now: NOW });

  assert.deepEqual(result.locations.map((message) => message.sequence), [1, 2]);
  assert.equal(result.newestLocationsByDevice['device-a']?.messageId, second.messageId);
  assert.equal(result.rejected.length, 2);
  assert.ok(result.rejected.some((item) => item.issues.some((issue) => issue.code === 'duplicate_message')));
  assert.ok(result.rejected.some((item) => item.issues.some((issue) => issue.code === 'invalid_wire_message')));
});
