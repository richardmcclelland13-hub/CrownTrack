import { randomBytes, timingSafeEqual } from 'node:crypto';
import { createServer, type Server as HttpServer } from 'node:http';
import {
  DeviceIdSchema,
  GroupIdSchema,
  validateCrewLinkMessage,
} from '@crowntrack/crew-protocol';
import { SignedCrewLinkEnvelopeSchema } from '@crowntrack/crew-protocol/src/signed';
import { WebSocket, WebSocketServer, type RawData } from 'ws';

export interface RelayConfig {
  host: string;
  port: number;
  devToken: string;
  maxPayloadBytes: number;
  maxClients: number;
  rateLimitMessages: number;
  rateLimitWindowMs: number;
  joinTimeoutMs: number;
  heartbeatIntervalMs: number;
  /** Development-only migration switch. Signed v2 is required unless explicitly enabled. */
  allowLegacyV1: boolean;
}

export interface RunningRelay {
  readonly url: string;
  close(): Promise<void>;
}

type JoinedClient = {
  groupId?: string;
  peerId?: string;
  joined: boolean;
  alive: boolean;
  rateWindowStartedAt: number;
  messagesInWindow: number;
  joinTimer: NodeJS.Timeout;
};

type JsonRecord = Record<string, unknown>;

const DEFAULTS = {
  host: '127.0.0.1',
  port: 8787,
  maxPayloadBytes: 16 * 1024,
  maxClients: 50,
  rateLimitMessages: 20,
  rateLimitWindowMs: 10_000,
  joinTimeoutMs: 5_000,
  heartbeatIntervalMs: 30_000,
  allowLegacyV1: false,
} as const;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasExactKeys = (value: JsonRecord, keys: string[]): boolean => {
  const actual = Object.keys(value).sort();
  return actual.length === keys.length && actual.every((key, index) => key === [...keys].sort()[index]);
};

const isJoinFrame = (value: unknown): value is { type: 'join'; token: string; rideGroupId: string; peerId: string } =>
  isRecord(value)
  && hasExactKeys(value, ['type', 'token', 'rideGroupId', 'peerId'])
  && value.type === 'join'
  && typeof value.token === 'string'
  && value.token.length <= 512
  && GroupIdSchema.safeParse(value.rideGroupId).success
  && DeviceIdSchema.safeParse(value.peerId).success;

const parsePositiveInt = (name: string, value: string | undefined, fallback: number): number => {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer`);
  return parsed;
};

const parseBoolean = (name: string, value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) return fallback;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${name} must be exactly "true" or "false"`);
};

export const configFromEnv = (env: NodeJS.ProcessEnv = process.env): RelayConfig => {
  const value = (name: string): string | undefined => env[`CREWLINK_RELAY_${name}`] ?? env[`RELAY_${name}`];
  const devToken = env.CREWLINK_DEV_TOKEN ?? env.RELAY_DEV_TOKEN;
  if (!devToken || devToken.length < 16 || devToken.length > 512) {
    throw new Error('CREWLINK_DEV_TOKEN must be set to between 16 and 512 characters');
  }
  return {
    host: value('HOST') ?? DEFAULTS.host,
    port: parsePositiveInt('CREWLINK_RELAY_PORT', value('PORT'), DEFAULTS.port),
    devToken,
    maxPayloadBytes: parsePositiveInt('CREWLINK_RELAY_MAX_PAYLOAD_BYTES', value('MAX_PAYLOAD_BYTES'), DEFAULTS.maxPayloadBytes),
    maxClients: parsePositiveInt('CREWLINK_RELAY_MAX_CLIENTS', value('MAX_CLIENTS'), DEFAULTS.maxClients),
    rateLimitMessages: parsePositiveInt('CREWLINK_RELAY_RATE_LIMIT_MESSAGES', value('RATE_LIMIT_MESSAGES'), DEFAULTS.rateLimitMessages),
    rateLimitWindowMs: parsePositiveInt('CREWLINK_RELAY_RATE_LIMIT_WINDOW_MS', value('RATE_LIMIT_WINDOW_MS'), DEFAULTS.rateLimitWindowMs),
    joinTimeoutMs: parsePositiveInt('CREWLINK_RELAY_JOIN_TIMEOUT_MS', value('JOIN_TIMEOUT_MS'), DEFAULTS.joinTimeoutMs),
    heartbeatIntervalMs: parsePositiveInt('CREWLINK_RELAY_HEARTBEAT_INTERVAL_MS', value('HEARTBEAT_INTERVAL_MS'), DEFAULTS.heartbeatIntervalMs),
    allowLegacyV1: parseBoolean('CREWLINK_RELAY_ALLOW_LEGACY_V1', value('ALLOW_LEGACY_V1'), DEFAULTS.allowLegacyV1),
  };
};

export const createTestConfig = (overrides: Partial<RelayConfig> = {}): RelayConfig => ({
  ...DEFAULTS,
  port: 0,
  devToken: randomBytes(24).toString('hex'),
  ...overrides,
});

const tokenMatches = (provided: string, expected: string): boolean => {
  const providedBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(expected);
  return providedBytes.length === expectedBytes.length && timingSafeEqual(providedBytes, expectedBytes);
};

const sendJson = (socket: WebSocket, value: unknown): void => {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(value));
};

const reject = (socket: WebSocket, closeCode = 1008): void => {
  sendJson(socket, { type: 'error', code: 'invalid_request' });
  socket.close(closeCode, 'invalid request');
};

const rawDataBytes = (data: RawData): number =>
  typeof data === 'string'
    ? Buffer.byteLength(data)
    : Array.isArray(data)
      ? data.reduce((total, part) => total + part.byteLength, 0)
      : data.byteLength;

const rawDataText = (data: RawData): string =>
  typeof data === 'string'
    ? data
    : Array.isArray(data)
      ? Buffer.concat(data).toString()
      : data.toString();

export const startRelay = async (config: RelayConfig): Promise<RunningRelay> => {
  if (!config.devToken) throw new Error('A development token is required');

  const rooms = new Map<string, Set<WebSocket>>();
  const state = new Map<WebSocket, JoinedClient>();
  const httpServer: HttpServer = createServer((_request, response) => {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  });
  const websocketServer = new WebSocketServer({ noServer: true, maxPayload: config.maxPayloadBytes });

  const cleanup = (socket: WebSocket): void => {
    const client = state.get(socket);
    if (!client) return;
    clearTimeout(client.joinTimer);
    if (client.groupId) {
      const room = rooms.get(client.groupId);
      room?.delete(socket);
      if (room?.size === 0) rooms.delete(client.groupId);
    }
    state.delete(socket);
  };

  httpServer.on('upgrade', (request, socket, head) => {
    if (state.size >= config.maxClients) {
      socket.write('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }
    websocketServer.handleUpgrade(request, socket, head, (client) => websocketServer.emit('connection', client, request));
  });

  websocketServer.on('connection', (socket) => {
    const client: JoinedClient = {
      joined: false,
      alive: true,
      rateWindowStartedAt: Date.now(),
      messagesInWindow: 0,
      joinTimer: setTimeout(() => reject(socket), config.joinTimeoutMs),
    };
    state.set(socket, client);

    socket.on('pong', () => { client.alive = true; });
    socket.on('close', () => cleanup(socket));
    socket.on('error', () => cleanup(socket));
    socket.on('message', (data, isBinary) => {
      const now = Date.now();
      if (now - client.rateWindowStartedAt >= config.rateLimitWindowMs) {
        client.rateWindowStartedAt = now;
        client.messagesInWindow = 0;
      }
      client.messagesInWindow += 1;
      if (client.messagesInWindow > config.rateLimitMessages) {
        reject(socket, 1008);
        return;
      }
      if (isBinary || rawDataBytes(data) > config.maxPayloadBytes) {
        reject(socket, 1009);
        return;
      }

      let parsed: unknown;
      try { parsed = JSON.parse(rawDataText(data)); } catch { reject(socket); return; }

      if (!client.joined) {
        if (!isJoinFrame(parsed) || !tokenMatches(parsed.token, config.devToken)) {
          reject(socket);
          return;
        }
        client.joined = true;
        client.groupId = parsed.rideGroupId;
        client.peerId = parsed.peerId;
        clearTimeout(client.joinTimer);
        const room = rooms.get(client.groupId) ?? new Set<WebSocket>();
        room.add(socket);
        rooms.set(client.groupId, room);
        sendJson(socket, { type: 'joined', rideGroupId: client.groupId });
        return;
      }

      const signed = SignedCrewLinkEnvelopeSchema.safeParse(parsed);
      let message: unknown;
      if (signed.success) {
        if (signed.data.groupId !== client.groupId || signed.data.senderDeviceId !== client.peerId) {
          reject(socket);
          return;
        }
        // This relay deliberately checks framing only. Endpoints own signature and
        // membership verification, so a shape-valid but tampered envelope is forwarded.
        message = signed.data;
      } else if (config.allowLegacyV1) {
        const legacy = validateCrewLinkMessage(parsed, { expectedGroupId: client.groupId });
        if (!legacy.success) {
          reject(socket);
          return;
        }
        message = legacy.message;
      } else {
        reject(socket);
        return;
      }

      const room = rooms.get(client.groupId!);
      if (!room) return;
      const serialized = JSON.stringify(message);
      for (const peer of room) {
        if (peer !== socket && peer.readyState === WebSocket.OPEN) peer.send(serialized);
      }
    });
  });

  const heartbeat = setInterval(() => {
    for (const [socket, client] of state) {
      if (!client.alive) {
        socket.terminate();
        cleanup(socket);
        continue;
      }
      client.alive = false;
      socket.ping();
    }
  }, config.heartbeatIntervalMs);
  heartbeat.unref();

  await new Promise<void>((resolve, rejectListen) => {
    httpServer.once('error', rejectListen);
    httpServer.listen(config.port, config.host, () => {
      httpServer.off('error', rejectListen);
      resolve();
    });
  });

  const address = httpServer.address();
  if (!address || typeof address === 'string') throw new Error('Relay did not bind a TCP address');

  return {
    url: `ws://${config.host}:${address.port}`,
    close: async () => {
      clearInterval(heartbeat);
      for (const socket of state.keys()) socket.terminate();
      state.clear();
      rooms.clear();
      await new Promise<void>((resolve, rejectClose) => websocketServer.close((wsError) => {
        if (wsError) rejectClose(wsError); else resolve();
      }));
      await new Promise<void>((resolve, rejectClose) => httpServer.close((httpError) => {
        if (httpError) rejectClose(httpError); else resolve();
      }));
    },
  };
};
