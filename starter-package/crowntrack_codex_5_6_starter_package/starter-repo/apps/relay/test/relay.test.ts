import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { WebSocket } from 'ws';
import { configFromEnv, createTestConfig, startRelay, type RunningRelay } from '../src';

const TOKEN = 'test-token-that-is-long-enough';
const running = new Set<RunningRelay>();
const sockets = new Set<WebSocket>();

test('reads namespaced environment configuration and keeps loopback defaults', () => {
  const config = configFromEnv({ NODE_ENV: 'test', CREWLINK_DEV_TOKEN: TOKEN, CREWLINK_RELAY_PORT: '9898' });
  assert.equal(config.host, '127.0.0.1');
  assert.equal(config.port, 9898);
  assert.equal(config.devToken, TOKEN);
  assert.equal(config.allowLegacyV1, false);
  assert.equal(configFromEnv({ NODE_ENV: 'test', CREWLINK_DEV_TOKEN: TOKEN, CREWLINK_RELAY_ALLOW_LEGACY_V1: 'true' }).allowLegacyV1, true);
  assert.throws(() => configFromEnv({ NODE_ENV: 'test', CREWLINK_DEV_TOKEN: TOKEN, CREWLINK_RELAY_ALLOW_LEGACY_V1: 'yes' }), /exactly/);
});

afterEach(async () => {
  for (const socket of sockets) socket.terminate();
  sockets.clear();
  await Promise.all([...running].map((relay) => relay.close()));
  running.clear();
});

const start = async (overrides = {}): Promise<RunningRelay> => {
  const relay = await startRelay(createTestConfig({ devToken: TOKEN, heartbeatIntervalMs: 60_000, ...overrides }));
  running.add(relay);
  return relay;
};

const connect = async (url: string): Promise<WebSocket> => {
  const socket = new WebSocket(url);
  sockets.add(socket);
  await event(socket, 'open');
  return socket;
};

const event = <T = unknown>(socket: WebSocket, name: string, timeoutMs = 2_000): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for ${name}`));
    }, timeoutMs);
    const onEvent = (...args: unknown[]) => { cleanup(); resolve((args.length === 1 ? args[0] : args) as T); };
    const onError = (error: Error) => { cleanup(); reject(error); };
    const cleanup = () => {
      clearTimeout(timer);
      socket.off(name, onEvent);
      if (name !== 'error') socket.off('error', onError);
    };
    socket.once(name, onEvent);
    if (name !== 'error') socket.once('error', onError);
  });

const nextJson = async (socket: WebSocket): Promise<Record<string, unknown>> => {
  const result = await event<Buffer | [Buffer, boolean]>(socket, 'message');
  const data = Array.isArray(result) ? result[0] : result;
  return JSON.parse(data.toString()) as Record<string, unknown>;
};

const join = async (socket: WebSocket, rideGroupId = 'ride-1', peerId = 'rider-a', token = TOKEN) => {
  const response = nextJson(socket);
  socket.send(JSON.stringify({ type: 'join', token, rideGroupId, peerId }));
  return response;
};

const legacyLocationEnvelope = (groupId = 'ride-1', senderPeerId = 'rider-a') => {
  const sentAt = new Date(Date.now() - 1_000).toISOString();
  return {
  version: 1,
  type: 'location',
  messageId: `message-${senderPeerId}-0001`,
  groupId,
  deviceId: `device-${senderPeerId}`,
  streamId: `stream-${senderPeerId}`,
  sequence: 1,
  sentAt,
  ttlSeconds: 120,
  payload: { latitude: 39.7392, longitude: -104.9903, capturedAt: sentAt },
  } as const;
};

type SignedType = 'location' | 'ack' | 'membership_grant' | 'membership_revocation';

const signedEnvelope = (type: SignedType, groupId = 'ride-1', senderDeviceId = 'rider-a') => {
  const sentAt = new Date(Date.now() - 1_000).toISOString();
  const base = {
    version: 2,
    domain: 'crowntrack-crewlink-signed/v1',
    messageId: `message-${senderDeviceId}-${type}`,
    groupId,
    senderDeviceId,
    signerPublicKey: 'a'.repeat(43),
    streamId: `stream-${senderDeviceId}`,
    sequence: 1,
    membershipEpoch: 1,
    sentAt,
    ttlSeconds: 120,
    signature: 'b'.repeat(86),
  } as const;
  switch (type) {
    case 'location': return { ...base, type, payload: { latitude: 39.7392, longitude: -104.9903, capturedAt: sentAt } };
    case 'ack': return { ...base, type, payload: { acknowledgedMessageId: 'message-a', receivedAt: sentAt, status: 'received' } };
    case 'membership_grant': return { ...base, type, payload: { member: { deviceId: 'rider-c', publicKey: 'c'.repeat(43), displayName: 'Rider C' }, grantedEpoch: 2 } };
    case 'membership_revocation': return { ...base, type, payload: { memberDeviceId: 'rider-c', memberPublicKey: 'c'.repeat(43), revokedEpoch: 2 } };
  }
};

test('accepts a valid token and room join', async () => {
  const relay = await start();
  const socket = await connect(relay.url);
  assert.deepEqual(await join(socket), { type: 'joined', rideGroupId: 'ride-1' });
});

test('rejects an invalid development token with a generic error', async () => {
  const relay = await start();
  const socket = await connect(relay.url);
  assert.deepEqual(await join(socket, 'ride-1', 'rider-a', 'wrong-token-long-enough'), {
    type: 'error', code: 'invalid_request',
  });
  const close = await event<unknown[]>(socket, 'close');
  assert.equal(close[0], 1008);
});

test('rejects malformed join groups and location envelopes for another group', async () => {
  const relay = await start();
  const malformed = await connect(relay.url);
  assert.equal((await join(malformed, 'spaces are invalid')).code, 'invalid_request');

  const socket = await connect(relay.url);
  await join(socket);
  const response = nextJson(socket);
  socket.send(JSON.stringify(signedEnvelope('location', 'ride-2')));
  assert.deepEqual(await response, { type: 'error', code: 'invalid_request' });
});

test('rejects signed-v2 envelopes whose sender does not match the joined peer', async () => {
  const relay = await start();
  const socket = await connect(relay.url);
  await join(socket, 'ride-1', 'rider-a');
  const response = nextJson(socket);
  socket.send(JSON.stringify(signedEnvelope('location', 'ride-1', 'rider-b')));
  assert.deepEqual(await response, { type: 'error', code: 'invalid_request' });
});

test('rejects malformed signed-v2 frames before forwarding', async () => {
  const relay = await start();
  const socket = await connect(relay.url);
  await join(socket);
  const response = nextJson(socket);
  socket.send(JSON.stringify({ ...signedEnvelope('location'), signature: 'too-short' }));
  assert.deepEqual(await response, { type: 'error', code: 'invalid_request' });
});

test('rejects legacy-v1 by default and accepts it only with the explicit compatibility switch', async () => {
  const defaultRelay = await start();
  const defaultSocket = await connect(defaultRelay.url);
  await join(defaultSocket);
  const rejected = nextJson(defaultSocket);
  defaultSocket.send(JSON.stringify(legacyLocationEnvelope()));
  assert.deepEqual(await rejected, { type: 'error', code: 'invalid_request' });

  const compatibleRelay = await start({ allowLegacyV1: true });
  const riderA = await connect(compatibleRelay.url);
  const riderB = await connect(compatibleRelay.url);
  await join(riderA, 'ride-1', 'rider-a');
  await join(riderB, 'ride-1', 'rider-b');
  const received = nextJson(riderB);
  const frame = legacyLocationEnvelope();
  riderA.send(JSON.stringify(frame));
  assert.deepEqual(await received, frame);
});

test('rejects malformed JSON and closes the socket', async () => {
  const relay = await start();
  const socket = await connect(relay.url);
  const response = nextJson(socket);
  socket.send('{not-json');
  assert.deepEqual(await response, { type: 'error', code: 'invalid_request' });
  const close = await event<unknown[]>(socket, 'close');
  assert.equal(close[0], 1008);
});

test('rejects frames larger than the configured maximum', async () => {
  const relay = await start({ maxPayloadBytes: 256 });
  const socket = await connect(relay.url);
  const closed = event<unknown[]>(socket, 'close');
  socket.send(JSON.stringify({ type: 'join', token: TOKEN, rideGroupId: 'ride-1', peerId: 'x'.repeat(400) }));
  const close = await closed;
  assert.equal(close[0], 1009);
});

test('rate limits each socket independently', async () => {
  const relay = await start({ rateLimitMessages: 2, rateLimitWindowMs: 60_000 });
  const socket = await connect(relay.url);
  await join(socket);
  const closed = event<unknown[]>(socket, 'close');
  const message = signedEnvelope('location');
  socket.send(JSON.stringify(message));
  socket.send(JSON.stringify(message));
  const close = await closed;
  assert.equal(close[0], 1008);
});

test('removes disconnected clients and permits reconnect with the same identity', async () => {
  const relay = await start();
  const first = await connect(relay.url);
  await join(first, 'ride-1', 'rider-a');
  const firstClosed = event(first, 'close');
  first.close();
  await firstClosed;

  const second = await connect(relay.url);
  assert.deepEqual(await join(second, 'ride-1', 'rider-a'), { type: 'joined', rideGroupId: 'ride-1' });
});

test('relays each strict signed-v2 envelope type between two clients in the same room', async () => {
  const relay = await start();
  const riderA = await connect(relay.url);
  const riderB = await connect(relay.url);
  await join(riderA, 'ride-1', 'rider-a');
  await join(riderB, 'ride-1', 'rider-b');

  for (const type of ['location', 'ack', 'membership_grant', 'membership_revocation'] as const) {
    const received = nextJson(riderB);
    const frame = signedEnvelope(type);
    riderA.send(JSON.stringify(frame));
    assert.deepEqual(await received, frame);
  }
});

test('forwards a shape-valid envelope with a tampered signature without making an auth decision', async () => {
  const relay = await start();
  const riderA = await connect(relay.url);
  const riderB = await connect(relay.url);
  await join(riderA, 'ride-1', 'rider-a');
  await join(riderB, 'ride-1', 'rider-b');

  const frame = { ...signedEnvelope('location'), signature: 'z'.repeat(86) };
  const received = nextJson(riderB);
  riderA.send(JSON.stringify(frame));
  assert.deepEqual(await received, frame);
});
