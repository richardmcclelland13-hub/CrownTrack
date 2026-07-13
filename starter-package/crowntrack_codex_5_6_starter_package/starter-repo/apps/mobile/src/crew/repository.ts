import { Platform } from 'react-native';
import { parseCrewLinkMessage } from '@crowntrack/crew-protocol';
import {
  InMemoryCrewRepository,
  isLegacyStage2SnapshotSchema,
  LATEST_CREWLINK_SCHEMA_VERSION,
  runCrewLinkMigrations,
  type CrewAck,
  type CrewPeer,
  type CrewRepository as CrewLinkRepository,
  type CrewRepositoryDiagnostics,
  type DeliveryObservation,
  type GroupMembership,
  type InboundWriteResult,
  type LocationEnvelope,
  type OutboxItem,
  type PeerPosition,
  type RideGroup,
  type StoredSharePolicy,
  type TransportKind,
  type TransportStatus,
} from '@crowntrack/crewlink';
import type { SQLiteDatabase } from 'expo-sqlite';

type SqliteRow = Record<string, unknown>;
type LegacySnapshot = {
  group?: { id: string; name: string };
  policy?: Omit<StoredSharePolicy, 'peerId' | 'updatedAt' | 'consentConfirmed'>;
  consentConfirmed?: boolean;
  peers?: Array<{ peerId: string; displayName: string; vehicle?: string }>;
  transports?: Array<{ kind: TransportKind; state: TransportStatus['state'] }>;
};
type LegacyBridge = { snapshot: LegacySnapshot; needsRestore: boolean };

const DATABASE_NAME = 'crowntrack-crew.db';
const LOCAL_PEER_ID = 'mobile-simulator';
const nowIso = () => new Date().toISOString();
const expiresAt = (envelope: { sentAt: string; ttlSeconds: number }) => new Date(Date.parse(envelope.sentAt) + envelope.ttlSeconds * 1_000).toISOString();
const bool = (value: unknown) => Number(value) === 1;
const parseJson = <T>(value: unknown, label: string): T => {
  if (typeof value !== 'string') throw new Error(`Stored CrewLink ${label} is invalid`);
  try { return JSON.parse(value) as T; } catch { throw new Error(`Stored CrewLink ${label} is invalid`); }
};

const locationEnvelope = (value: unknown): LocationEnvelope => {
  const parsed = parseCrewLinkMessage(parseJson<unknown>(value, 'location envelope'));
  if (parsed.type !== 'location') throw new Error('Stored CrewLink envelope is not a location');
  return parsed;
};

const acknowledgement = (value: unknown): CrewAck => {
  const parsed = parseCrewLinkMessage(parseJson<unknown>(value, 'acknowledgement'));
  if (parsed.type !== 'ack') throw new Error('Stored CrewLink acknowledgement is invalid');
  return parsed;
};

export class CrewDatabaseMigrationError extends Error {
  constructor(readonly code: 'invalid_schema' | 'migration_failed', readonly detail?: unknown) {
    super(code === 'invalid_schema' ? 'CrewLink database schema is not recognized' : 'CrewLink database migration failed');
    this.name = 'CrewDatabaseMigrationError';
  }
}

export class ExpoSqliteCrewRepository implements CrewLinkRepository {
  private database?: SQLiteDatabase;
  private initialization?: Promise<void>;
  private lastMigration = 'not initialized';

  private async db(): Promise<SQLiteDatabase> {
    if (!this.database) {
      const { openDatabaseAsync } = await import('expo-sqlite');
      this.database = await openDatabaseAsync(DATABASE_NAME);
    }
    return this.database;
  }

  async initialize(): Promise<void> {
    if (!this.initialization) this.initialization = this.initializeOnce();
    return this.initialization;
  }

  private async initializeOnce(): Promise<void> {
    const database = await this.db();
    try {
      await database.execAsync('PRAGMA foreign_keys = ON');
      try { await database.execAsync('PRAGMA journal_mode = WAL'); } catch { await database.execAsync('PRAGMA journal_mode = DELETE'); }
      const legacy = await this.prepareLegacyBridge(database);
      const migrationRun = await runCrewLinkMigrations({
        configureConnection: async () => undefined,
        getVersion: async () => Number((await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version'))?.user_version ?? 0),
        transaction: async (task) => database.withExclusiveTransactionAsync(async (txn) => task({
          execute: async (statements) => txn.execAsync(statements.join(';\n')),
          record: async (version, name, appliedAt) => { await txn.runAsync('INSERT INTO crew_migration_log (version, name, applied_at) VALUES (?, ?, ?)', version, name, appliedAt); },
          setVersion: async (version) => { await txn.execAsync(`PRAGMA user_version = ${version}`); },
        })),
        validateSchema: async () => this.validateSchema(database),
      }, nowIso);
      if (migrationRun.applied.length) this.lastMigration = `${migrationRun.toVersion}: ${migrationRun.applied[migrationRun.applied.length - 1].name}`;
      if (legacy?.needsRestore) await this.restoreLegacySnapshot(database, legacy.snapshot);
      await this.pruneExpired(nowIso());
    } catch (error) {
      if (error instanceof CrewDatabaseMigrationError) throw error;
      throw new CrewDatabaseMigrationError('migration_failed', error);
    }
  }

  private async prepareLegacyBridge(database: SQLiteDatabase): Promise<LegacyBridge | undefined> {
    const backupTable = await database.getFirstAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?", 'crew_legacy_bridge_backup');
    const backup = backupTable ? await database.getFirstAsync<{ snapshot_payload: string; phase: string }>('SELECT snapshot_payload, phase FROM crew_legacy_bridge_backup WHERE id = 1') : undefined;
    if (backup) return { snapshot: parseJson<LegacySnapshot>(backup.snapshot_payload, 'legacy backup'), needsRestore: backup.phase !== 'complete' };
    const table = await database.getFirstAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?", 'crew_group');
    if (!table) return undefined;
    const columns = await database.getAllAsync<{ name: string }>('PRAGMA table_info(crew_group)');
    const isLegacy = isLegacyStage2SnapshotSchema(columns.map((column) => column.name));
    if (!isLegacy) return undefined;
    const snapshot = await database.getFirstAsync<{ payload: string }>('SELECT payload FROM crew_snapshot WHERE id = 1');
    await database.withExclusiveTransactionAsync(async (txn) => {
      await txn.execAsync([
        'CREATE TABLE IF NOT EXISTS crew_legacy_bridge_backup (id INTEGER PRIMARY KEY CHECK (id = 1), snapshot_payload TEXT NOT NULL, phase TEXT NOT NULL, created_at TEXT NOT NULL, completed_at TEXT)',
      ].join(';\n'));
      await txn.runAsync('INSERT INTO crew_legacy_bridge_backup (id, snapshot_payload, phase, created_at) VALUES (1, ?, ?, ?) ON CONFLICT(id) DO NOTHING', snapshot?.payload ?? '{}', 'prepared', nowIso());
      await txn.execAsync([
        'DROP TABLE IF EXISTS crew_pending_ack', 'DROP TABLE IF EXISTS crew_location_history', 'DROP TABLE IF EXISTS crew_inbound_dedup',
        'DROP TABLE IF EXISTS crew_outbox', 'DROP TABLE IF EXISTS crew_transport_status', 'DROP TABLE IF EXISTS crew_latest_position',
        'DROP TABLE IF EXISTS crew_share_policy', 'DROP TABLE IF EXISTS crew_membership', 'DROP TABLE IF EXISTS crew_peer',
        'DROP TABLE IF EXISTS crew_group', 'DROP TABLE IF EXISTS crew_snapshot', 'PRAGMA user_version = 0',
      ].join(';\n'));
    });
    this.lastMigration = 'legacy Stage 2 snapshot backed up before canonical bridge';
    return { snapshot: snapshot ? parseJson<LegacySnapshot>(snapshot.payload, 'legacy snapshot') : {}, needsRestore: true };
  }

  private async validateSchema(database: SQLiteDatabase): Promise<void> {
    const version = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    if (Number(version?.user_version) !== LATEST_CREWLINK_SCHEMA_VERSION) throw new CrewDatabaseMigrationError('invalid_schema');
    const required = new Set(['crew_peer', 'crew_group', 'crew_membership', 'crew_share_policy', 'crew_position', 'crew_latest_position', 'crew_inbound_dedup', 'crew_outbox', 'crew_delivery_observation', 'crew_ack', 'crew_transport_status', 'crew_migration_log', 'crew_local_metadata', 'crew_identity', 'crew_trusted_peer', 'crew_pairing_invitation']);
    const found = await database.getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table'");
    if ([...required].some((name) => !found.some((table) => table.name === name))) throw new CrewDatabaseMigrationError('invalid_schema');
  }

  private async restoreLegacySnapshot(database: SQLiteDatabase, snapshot: LegacySnapshot): Promise<void> {
    if (!snapshot.group) {
      await database.runAsync('DELETE FROM crew_legacy_bridge_backup WHERE id = 1');
      return;
    }
    const createdAt = nowIso();
    await database.withExclusiveTransactionAsync(async (txn) => {
      await txn.runAsync('INSERT INTO crew_group (group_id, name, created_at) VALUES (?, ?, ?) ON CONFLICT(group_id) DO UPDATE SET name = excluded.name, created_at = excluded.created_at', snapshot.group!.id, snapshot.group!.name, createdAt);
      for (const peer of snapshot.peers ?? []) {
        await txn.runAsync('INSERT INTO crew_peer (peer_id, display_name, device_id, vehicle, added_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(peer_id) DO UPDATE SET display_name = excluded.display_name, device_id = excluded.device_id, vehicle = excluded.vehicle, added_at = excluded.added_at', peer.peerId, peer.displayName, `legacy-${peer.peerId}`, peer.vehicle ?? null, createdAt);
        await txn.runAsync('INSERT INTO crew_membership (group_id, peer_id, joined_at) VALUES (?, ?, ?) ON CONFLICT(group_id, peer_id) DO UPDATE SET joined_at = excluded.joined_at', snapshot.group!.id, peer.peerId, createdAt);
      }
      if (snapshot.policy) await txn.runAsync('INSERT INTO crew_share_policy (peer_id, enabled, group_ids_json, precision, retention_minutes, emergency_override, consent_confirmed, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(peer_id) DO UPDATE SET enabled = excluded.enabled, group_ids_json = excluded.group_ids_json, precision = excluded.precision, retention_minutes = excluded.retention_minutes, emergency_override = excluded.emergency_override, consent_confirmed = excluded.consent_confirmed, updated_at = excluded.updated_at', LOCAL_PEER_ID, snapshot.policy.enabled ? 1 : 0, JSON.stringify([snapshot.group!.id]), snapshot.policy.precision, snapshot.policy.retentionMinutes, snapshot.policy.emergencyOverride ? 1 : 0, snapshot.consentConfirmed ? 1 : 0, createdAt);
      for (const transport of snapshot.transports ?? []) await txn.runAsync('INSERT INTO crew_transport_status (kind, state, changed_at) VALUES (?, ?, ?) ON CONFLICT(kind) DO UPDATE SET state = excluded.state, changed_at = excluded.changed_at', transport.kind, transport.state, createdAt);
      await txn.runAsync('DELETE FROM crew_legacy_bridge_backup WHERE id = 1');
    });
    this.lastMigration = 'legacy Stage 2 snapshot restored from durable bridge backup';
  }

  private async ready() { await this.initialize(); return this.db(); }
  async putPeer(peer: CrewPeer) { const db = await this.ready(); await db.runAsync('INSERT INTO crew_peer (peer_id, display_name, device_id, vehicle, added_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(peer_id) DO UPDATE SET display_name = excluded.display_name, device_id = excluded.device_id, vehicle = excluded.vehicle, added_at = excluded.added_at', peer.peerId, peer.displayName, peer.deviceId, peer.vehicle ?? null, peer.addedAt); }
  async getPeer(peerId: string) { const db = await this.ready(); const row = await db.getFirstAsync<SqliteRow>('SELECT peer_id, display_name, device_id, vehicle, added_at FROM crew_peer WHERE peer_id = ?', peerId); return row ? this.toPeer(row) : undefined; }
  async listPeers(groupId: string) { const db = await this.ready(); const rows = await db.getAllAsync<SqliteRow>('SELECT p.peer_id, p.display_name, p.device_id, p.vehicle, p.added_at FROM crew_peer p JOIN crew_membership m ON m.peer_id = p.peer_id WHERE m.group_id = ? ORDER BY p.added_at', groupId); return rows.map((row) => this.toPeer(row)); }
  private toPeer(row: SqliteRow): CrewPeer { return { peerId: String(row.peer_id), displayName: String(row.display_name), deviceId: String(row.device_id), vehicle: typeof row.vehicle === 'string' ? row.vehicle : undefined, addedAt: String(row.added_at) }; }
  async putGroup(group: RideGroup) { const db = await this.ready(); await db.runAsync('INSERT INTO crew_group (group_id, name, created_at) VALUES (?, ?, ?) ON CONFLICT(group_id) DO UPDATE SET name = excluded.name, created_at = excluded.created_at', group.groupId, group.name, group.createdAt); }
  async getGroup(groupId: string) { const db = await this.ready(); const row = await db.getFirstAsync<SqliteRow>('SELECT group_id, name, created_at FROM crew_group WHERE group_id = ?', groupId); return row ? { groupId: String(row.group_id), name: String(row.name), createdAt: String(row.created_at) } : undefined; }
  async putMembership(membership: GroupMembership) { const db = await this.ready(); await db.runAsync('INSERT INTO crew_membership (group_id, peer_id, joined_at) VALUES (?, ?, ?) ON CONFLICT(group_id, peer_id) DO UPDATE SET joined_at = excluded.joined_at', membership.groupId, membership.peerId, membership.joinedAt); }
  async putSharePolicy(policy: StoredSharePolicy) { const db = await this.ready(); await db.runAsync('INSERT INTO crew_share_policy (peer_id, enabled, group_ids_json, precision, retention_minutes, emergency_override, consent_confirmed, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(peer_id) DO UPDATE SET enabled = excluded.enabled, group_ids_json = excluded.group_ids_json, precision = excluded.precision, retention_minutes = excluded.retention_minutes, emergency_override = excluded.emergency_override, consent_confirmed = excluded.consent_confirmed, updated_at = excluded.updated_at', policy.peerId, policy.enabled ? 1 : 0, JSON.stringify(policy.groupIds), policy.precision, policy.retentionMinutes, policy.emergencyOverride ? 1 : 0, policy.consentConfirmed ? 1 : 0, policy.updatedAt); }
  async getSharePolicy(peerId: string): Promise<StoredSharePolicy | undefined> { const db = await this.ready(); const row = await db.getFirstAsync<SqliteRow>('SELECT * FROM crew_share_policy WHERE peer_id = ?', peerId); if (!row) return undefined; const rawGroupIds = parseJson<unknown>(row.group_ids_json, 'share policy'); if (!Array.isArray(rawGroupIds) || rawGroupIds.some((value) => typeof value !== 'string')) throw new Error('Stored CrewLink share policy is invalid'); const precision: 'exact' | 'reduced' = row.precision === 'exact' ? 'exact' : row.precision === 'reduced' ? 'reduced' : (() => { throw new Error('Stored CrewLink share policy is invalid'); })(); return { peerId: String(row.peer_id), enabled: bool(row.enabled), groupIds: rawGroupIds as string[], precision, retentionMinutes: Number(row.retention_minutes), emergencyOverride: bool(row.emergency_override), consentConfirmed: bool(row.consent_confirmed), updatedAt: String(row.updated_at) }; }
  async enqueue(item: OutboxItem) { const db = await this.ready(); await db.runAsync('INSERT INTO crew_outbox (message_id, group_id, owner_peer_id, envelope_json, state, attempts, next_attempt_at, last_attempt_at, sent_via_json, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', item.envelope.messageId, item.envelope.groupId, item.ownerPeerId, JSON.stringify(item.envelope), item.state, item.attempts, item.nextAttemptAt, item.lastAttemptAt ?? null, JSON.stringify(item.sentVia), expiresAt(item.envelope)); }
  async updateOutbox(item: OutboxItem) { const db = await this.ready(); const result = await db.runAsync('UPDATE crew_outbox SET state = ?, attempts = ?, next_attempt_at = ?, last_attempt_at = ?, sent_via_json = ?, expires_at = ? WHERE message_id = ?', item.state, item.attempts, item.nextAttemptAt, item.lastAttemptAt ?? null, JSON.stringify(item.sentVia), expiresAt(item.envelope), item.envelope.messageId); if (!result.changes) throw new Error('Outbox message does not exist'); }
  private toOutbox(row: SqliteRow): OutboxItem { const sentVia = parseJson<unknown>(row.sent_via_json, 'outbox transports'); if (!Array.isArray(sentVia)) throw new Error('Stored CrewLink outbox transports are invalid'); return { envelope: locationEnvelope(row.envelope_json), ownerPeerId: String(row.owner_peer_id), state: String(row.state) as OutboxItem['state'], attempts: Number(row.attempts), nextAttemptAt: String(row.next_attempt_at), lastAttemptAt: typeof row.last_attempt_at === 'string' ? row.last_attempt_at : undefined, sentVia: sentVia as TransportKind[] }; }
  async getOutbox(messageId: string) { const db = await this.ready(); const row = await db.getFirstAsync<SqliteRow>('SELECT * FROM crew_outbox WHERE message_id = ?', messageId); return row ? this.toOutbox(row) : undefined; }
  async listOutbox() { const db = await this.ready(); const rows = await db.getAllAsync<SqliteRow>('SELECT * FROM crew_outbox ORDER BY next_attempt_at'); return rows.map((row) => this.toOutbox(row)); }
  async listDueOutbox(at: string) { const db = await this.ready(); const rows = await db.getAllAsync<SqliteRow>("SELECT * FROM crew_outbox WHERE state != 'exhausted' AND next_attempt_at <= ? AND expires_at > ? ORDER BY next_attempt_at", at, at); return rows.map((row) => this.toOutbox(row)); }
  async deleteOutbox(messageId: string) { const db = await this.ready(); await db.runAsync('DELETE FROM crew_outbox WHERE message_id = ?', messageId); }
  async purgeUnsentLocations(peerId: string, groupId?: string) { const db = await this.ready(); const result = groupId ? await db.runAsync('DELETE FROM crew_outbox WHERE owner_peer_id = ? AND group_id = ?', peerId, groupId) : await db.runAsync('DELETE FROM crew_outbox WHERE owner_peer_id = ?', peerId); return result.changes; }
  async acceptInbound(envelope: LocationEnvelope, receivedAt: string, transport: TransportKind): Promise<InboundWriteResult> { const db = await this.ready(); let result: InboundWriteResult = { disposition: 'accepted' }; await db.withExclusiveTransactionAsync(async (txn) => { const seen = await txn.getFirstAsync<SqliteRow>('SELECT message_id FROM crew_inbound_dedup WHERE message_id = ?', envelope.messageId); if (seen) { await txn.runAsync('INSERT INTO crew_delivery_observation (message_id, group_id, transport, observed_at, duplicate) VALUES (?, ?, ?, ?, 1)', envelope.messageId, envelope.groupId, transport, receivedAt); result = { disposition: 'duplicate', latest: await this.latestWith(txn, envelope.groupId, envelope.deviceId) }; return; } const latest = await this.latestWith(txn, envelope.groupId, envelope.deviceId); if (latest && envelope.sequence <= latest.envelope.sequence) { await txn.runAsync('INSERT INTO crew_inbound_dedup (message_id, group_id, expires_at, device_id) VALUES (?, ?, ?, ?)', envelope.messageId, envelope.groupId, expiresAt(envelope), envelope.deviceId); await txn.runAsync('INSERT INTO crew_delivery_observation (message_id, group_id, transport, observed_at, duplicate) VALUES (?, ?, ?, ?, 0)', envelope.messageId, envelope.groupId, transport, receivedAt); result = { disposition: 'sequence_regression', latest }; return; } await txn.runAsync('INSERT INTO crew_position (message_id, group_id, device_id, sequence, envelope_json, recorded_at, received_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', envelope.messageId, envelope.groupId, envelope.deviceId, envelope.sequence, JSON.stringify(envelope), envelope.payload.capturedAt, receivedAt, expiresAt(envelope)); await txn.runAsync('INSERT INTO crew_latest_position (group_id, device_id, message_id) VALUES (?, ?, ?) ON CONFLICT(group_id, device_id) DO UPDATE SET message_id = excluded.message_id', envelope.groupId, envelope.deviceId, envelope.messageId); await txn.runAsync('INSERT INTO crew_inbound_dedup (message_id, group_id, expires_at, device_id) VALUES (?, ?, ?, ?)', envelope.messageId, envelope.groupId, expiresAt(envelope), envelope.deviceId); await txn.runAsync('INSERT INTO crew_delivery_observation (message_id, group_id, transport, observed_at, duplicate) VALUES (?, ?, ?, ?, 0)', envelope.messageId, envelope.groupId, transport, receivedAt); result = { disposition: 'accepted', latest: { envelope, receivedAt } }; }); return result; }
  private async latestWith(db: SQLiteDatabase, groupId: string, deviceId: string): Promise<PeerPosition | undefined> { const row = await db.getFirstAsync<SqliteRow>('SELECT p.envelope_json, p.received_at FROM crew_latest_position l JOIN crew_position p ON p.message_id = l.message_id WHERE l.group_id = ? AND l.device_id = ?', groupId, deviceId); return row ? { envelope: locationEnvelope(row.envelope_json), receivedAt: String(row.received_at) } : undefined; }
  async getLatestPosition(groupId: string, peerId: string) { return this.latestWith(await this.ready(), groupId, peerId); }
  async listLatestPositions(groupId: string) { const db = await this.ready(); const rows = await db.getAllAsync<SqliteRow>('SELECT p.envelope_json, p.received_at FROM crew_latest_position l JOIN crew_position p ON p.message_id = l.message_id WHERE l.group_id = ?', groupId); return rows.map((row) => ({ envelope: locationEnvelope(row.envelope_json), receivedAt: String(row.received_at) })); }
  async listHistory(groupId: string, peerId: string) { const db = await this.ready(); const rows = await db.getAllAsync<SqliteRow>('SELECT envelope_json, received_at FROM crew_position WHERE group_id = ? AND device_id = ? ORDER BY sequence', groupId, peerId); return rows.map((row) => ({ envelope: locationEnvelope(row.envelope_json), receivedAt: String(row.received_at) })); }
  async recordObservation(observation: DeliveryObservation) { const db = await this.ready(); const position = await db.getFirstAsync<{ group_id: string }>('SELECT group_id FROM crew_position WHERE message_id = ?', observation.messageId); if (position) await db.runAsync('INSERT INTO crew_delivery_observation (message_id, group_id, transport, observed_at, duplicate) VALUES (?, ?, ?, ?, ?)', observation.messageId, position.group_id, observation.transport, observation.observedAt, observation.duplicate ? 1 : 0); }
  async listObservations(messageId: string) { const db = await this.ready(); const rows = await db.getAllAsync<SqliteRow>('SELECT message_id, transport, observed_at, duplicate FROM crew_delivery_observation WHERE message_id = ? ORDER BY id', messageId); return rows.map((row) => ({ messageId: String(row.message_id), transport: String(row.transport) as TransportKind, observedAt: String(row.observed_at), duplicate: bool(row.duplicate) })); }
  async putAcknowledgement(ack: CrewAck) { const db = await this.ready(); await db.runAsync('INSERT INTO crew_ack (acknowledged_message_id, group_id, envelope_json, received_at, expires_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(acknowledged_message_id) DO UPDATE SET envelope_json = excluded.envelope_json, received_at = excluded.received_at, expires_at = excluded.expires_at', ack.payload.acknowledgedMessageId, ack.groupId, JSON.stringify(ack), nowIso(), expiresAt(ack)); }
  async getAcknowledgement(messageId: string) { const db = await this.ready(); const row = await db.getFirstAsync<SqliteRow>('SELECT envelope_json FROM crew_ack WHERE acknowledged_message_id = ?', messageId); return row ? acknowledgement(row.envelope_json) : undefined; }
  async putTransportStatus(status: TransportStatus) { const db = await this.ready(); await db.runAsync('INSERT INTO crew_transport_status (kind, state, changed_at) VALUES (?, ?, ?) ON CONFLICT(kind) DO UPDATE SET state = excluded.state, changed_at = excluded.changed_at', status.kind, status.state, status.changedAt); }
  async listTransportStatuses() { const db = await this.ready(); const rows = await db.getAllAsync<SqliteRow>('SELECT kind, state, changed_at FROM crew_transport_status ORDER BY kind'); return rows.map((row) => ({ kind: String(row.kind) as TransportKind, state: String(row.state) as TransportStatus['state'], changedAt: String(row.changed_at) })); }
  async pruneExpired(at: string) { const db = await this.db(); await db.withExclusiveTransactionAsync(async (txn) => { await txn.runAsync('DELETE FROM crew_ack WHERE expires_at <= ?', at); await txn.runAsync('DELETE FROM crew_outbox WHERE expires_at <= ?', at); await txn.runAsync('DELETE FROM crew_inbound_dedup WHERE expires_at <= ?', at); await txn.runAsync('DELETE FROM crew_position WHERE expires_at <= ?', at); }); }
  async getDiagnostics(): Promise<CrewRepositoryDiagnostics> { const db = await this.ready(); const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version'); const tables = ['crew_peer', 'crew_group', 'crew_membership', 'crew_share_policy', 'crew_position', 'crew_outbox', 'crew_ack']; const rowCounts: Record<string, number> = {}; for (const table of tables) { const row = await db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) AS count FROM ${table}`); rowCounts[table.replace('crew_', '')] = Number(row?.count ?? 0); } return { adapter: 'expo-sqlite', schemaVersion: Number(version?.user_version ?? 0), rowCounts, lastMigration: this.lastMigration }; }
  async deletePeerData(groupId: string, peerId: string) { const db = await this.ready(); const peer = await this.getPeer(peerId); if (!peer) return; await db.withExclusiveTransactionAsync(async (txn) => { const positionRows = await txn.getAllAsync<{ message_id: string }>('SELECT message_id FROM crew_position WHERE group_id = ? AND device_id = ?', groupId, peer.deviceId); const dedupRows = await txn.getAllAsync<{ message_id: string }>('SELECT message_id FROM crew_inbound_dedup WHERE group_id = ? AND device_id = ?', groupId, peer.deviceId); const messageIds = [...new Set([...positionRows, ...dedupRows].map((row) => row.message_id))]; if (messageIds.length) { const placeholders = messageIds.map(() => '?').join(','); await txn.runAsync(`DELETE FROM crew_delivery_observation WHERE message_id IN (${placeholders})`, ...messageIds); await txn.runAsync(`DELETE FROM crew_ack WHERE acknowledged_message_id IN (${placeholders})`, ...messageIds); } await txn.runAsync('DELETE FROM crew_inbound_dedup WHERE group_id = ? AND device_id = ?', groupId, peer.deviceId); await txn.runAsync('DELETE FROM crew_membership WHERE group_id = ? AND peer_id = ?', groupId, peerId); await txn.runAsync('DELETE FROM crew_outbox WHERE group_id = ? AND json_extract(envelope_json, \'$.deviceId\') = ?', groupId, peer.deviceId); await txn.runAsync('DELETE FROM crew_position WHERE group_id = ? AND device_id = ?', groupId, peer.deviceId); }); }
  async deleteGroupData(groupId: string) { const db = await this.ready(); const policies = await db.getAllAsync<{ peer_id: string; group_ids_json: string; enabled: number; precision: 'exact' | 'reduced'; retention_minutes: number; emergency_override: number; consent_confirmed: number }>('SELECT * FROM crew_share_policy'); await db.withExclusiveTransactionAsync(async (txn) => { await txn.runAsync('DELETE FROM crew_group WHERE group_id = ?', groupId); for (const policy of policies) { const rawGroupIds = parseJson<unknown>(policy.group_ids_json, 'share policy'); if (!Array.isArray(rawGroupIds)) throw new Error('Stored CrewLink share policy is invalid'); const groupIds = rawGroupIds.filter((value): value is string => typeof value === 'string' && value !== groupId); await txn.runAsync('UPDATE crew_share_policy SET group_ids_json = ?, enabled = ?, consent_confirmed = ?, updated_at = ? WHERE peer_id = ?', JSON.stringify(groupIds), groupIds.length && bool(policy.enabled) ? 1 : 0, groupIds.length && bool(policy.consent_confirmed) ? 1 : 0, nowIso(), policy.peer_id); } }); }
  async deleteAllCrewData() { const db = await this.ready(); await db.withExclusiveTransactionAsync(async (txn) => { await txn.execAsync(['DELETE FROM crew_transport_status', 'DELETE FROM crew_ack', 'DELETE FROM crew_delivery_observation', 'DELETE FROM crew_inbound_dedup', 'DELETE FROM crew_latest_position', 'DELETE FROM crew_position', 'DELETE FROM crew_outbox', 'DELETE FROM crew_share_policy', 'DELETE FROM crew_membership', 'DELETE FROM crew_group', 'DELETE FROM crew_peer', 'DELETE FROM crew_local_metadata', 'DROP TABLE IF EXISTS crew_legacy_bridge_backup'].join(';\n')); }); }
}

export const createCrewRepository = (): CrewLinkRepository => Platform.OS === 'web' ? new InMemoryCrewRepository() : new ExpoSqliteCrewRepository();

export const resetCrewLinkDevelopmentDatabase = async (): Promise<void> => {
  if (!__DEV__) throw new Error('Development database reset is unavailable outside development builds');
  const { deleteDatabaseAsync } = await import('expo-sqlite');
  await deleteDatabaseAsync(DATABASE_NAME);
};
