export interface CrewLinkMigration {
  version: number;
  name: string;
  statements: readonly string[];
}

// Connection settings are deliberately not migration statements. SQLite applies
// foreign-key enforcement per connection and journal mode cannot be changed inside
// an exclusive migration transaction.
export const CREWLINK_MIGRATIONS: readonly CrewLinkMigration[] = [
  {
    version: 1,
    name: 'canonical_crewlink_repository',
    statements: [
      'CREATE TABLE crew_peer (peer_id TEXT PRIMARY KEY, display_name TEXT NOT NULL, device_id TEXT NOT NULL UNIQUE, vehicle TEXT, added_at TEXT NOT NULL)',
      'CREATE TABLE crew_group (group_id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL)',
      'CREATE TABLE crew_membership (group_id TEXT NOT NULL REFERENCES crew_group(group_id) ON DELETE CASCADE, peer_id TEXT NOT NULL REFERENCES crew_peer(peer_id) ON DELETE CASCADE, joined_at TEXT NOT NULL, PRIMARY KEY (group_id, peer_id))',
      'CREATE INDEX crew_membership_peer_idx ON crew_membership(peer_id, group_id)',
      'CREATE TABLE crew_share_policy (peer_id TEXT PRIMARY KEY, enabled INTEGER NOT NULL CHECK (enabled IN (0, 1)), group_ids_json TEXT NOT NULL, precision TEXT NOT NULL CHECK (precision IN (\'exact\', \'reduced\')), retention_minutes INTEGER NOT NULL CHECK (retention_minutes >= 5 AND retention_minutes <= 1440), emergency_override INTEGER NOT NULL DEFAULT 0 CHECK (emergency_override = 0), consent_confirmed INTEGER NOT NULL DEFAULT 0 CHECK (consent_confirmed IN (0, 1)), updated_at TEXT NOT NULL)',
      'CREATE TABLE crew_position (message_id TEXT PRIMARY KEY, group_id TEXT NOT NULL REFERENCES crew_group(group_id) ON DELETE CASCADE, device_id TEXT NOT NULL, sequence INTEGER NOT NULL, envelope_json TEXT NOT NULL, recorded_at TEXT NOT NULL, received_at TEXT NOT NULL, expires_at TEXT NOT NULL, UNIQUE (group_id, device_id, sequence))',
      'CREATE INDEX crew_position_group_device_idx ON crew_position(group_id, device_id, sequence DESC)',
      'CREATE INDEX crew_position_retention_idx ON crew_position(expires_at)',
      'CREATE TABLE crew_latest_position (group_id TEXT NOT NULL REFERENCES crew_group(group_id) ON DELETE CASCADE, device_id TEXT NOT NULL, message_id TEXT NOT NULL REFERENCES crew_position(message_id) ON DELETE CASCADE, PRIMARY KEY (group_id, device_id))',
      'CREATE TABLE crew_inbound_dedup (message_id TEXT PRIMARY KEY, group_id TEXT NOT NULL REFERENCES crew_group(group_id) ON DELETE CASCADE, expires_at TEXT NOT NULL)',
      'CREATE INDEX crew_inbound_dedup_retention_idx ON crew_inbound_dedup(expires_at)',
      'CREATE TABLE crew_outbox (message_id TEXT PRIMARY KEY, group_id TEXT NOT NULL REFERENCES crew_group(group_id) ON DELETE CASCADE, owner_peer_id TEXT NOT NULL, envelope_json TEXT NOT NULL, state TEXT NOT NULL CHECK (state IN (\'queued\', \'awaiting_ack\', \'exhausted\')), attempts INTEGER NOT NULL DEFAULT 0, next_attempt_at TEXT NOT NULL, last_attempt_at TEXT, sent_via_json TEXT NOT NULL, expires_at TEXT NOT NULL)',
      'CREATE INDEX crew_outbox_due_idx ON crew_outbox(state, next_attempt_at)',
      'CREATE INDEX crew_outbox_retention_idx ON crew_outbox(expires_at)',
      'CREATE TABLE crew_delivery_observation (id INTEGER PRIMARY KEY AUTOINCREMENT, message_id TEXT NOT NULL, group_id TEXT NOT NULL REFERENCES crew_group(group_id) ON DELETE CASCADE, transport TEXT NOT NULL, observed_at TEXT NOT NULL, duplicate INTEGER NOT NULL CHECK (duplicate IN (0, 1)))',
      'CREATE INDEX crew_delivery_message_idx ON crew_delivery_observation(message_id)',
      'CREATE TABLE crew_ack (acknowledged_message_id TEXT PRIMARY KEY, group_id TEXT NOT NULL REFERENCES crew_group(group_id) ON DELETE CASCADE, envelope_json TEXT NOT NULL, received_at TEXT NOT NULL, expires_at TEXT NOT NULL)',
      'CREATE INDEX crew_ack_retention_idx ON crew_ack(expires_at)',
      'CREATE TABLE crew_transport_status (kind TEXT PRIMARY KEY, state TEXT NOT NULL, changed_at TEXT NOT NULL)',
      'CREATE TABLE crew_migration_log (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)',
    ],
  },
  {
    version: 2,
    name: 'canonical_diagnostics_metadata',
    statements: [
      'CREATE TABLE crew_local_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL)',
    ],
  },
  {
    version: 3,
    name: 'peer_scoped_deletion_metadata',
    statements: [
      "ALTER TABLE crew_inbound_dedup ADD COLUMN device_id TEXT NOT NULL DEFAULT ''",
      'CREATE INDEX crew_inbound_dedup_peer_idx ON crew_inbound_dedup(group_id, device_id)',
    ],
  },
  {
    version: 4,
    name: 'secure_device_identity_and_pairing',
    statements: [
      'CREATE TABLE crew_identity (id INTEGER PRIMARY KEY CHECK (id = 1), device_id TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL, public_key TEXT NOT NULL, fingerprint TEXT NOT NULL, created_at TEXT NOT NULL)',
      'CREATE TABLE crew_trusted_peer (device_id TEXT PRIMARY KEY, display_name TEXT NOT NULL, public_key TEXT NOT NULL, fingerprint TEXT NOT NULL, trusted_at TEXT NOT NULL, revoked_at TEXT)',
      'CREATE TABLE crew_pairing_invitation (invitation_id TEXT PRIMARY KEY, issuer_device_id TEXT NOT NULL, expires_at TEXT NOT NULL, cancelled_at TEXT, used_at TEXT)',
      'CREATE INDEX crew_pairing_invitation_expiry_idx ON crew_pairing_invitation(expires_at)',
    ],
  },
  {
    version: 5,
    name: 'staged_pairing_confirmation_boundary',
    statements: [
      "ALTER TABLE crew_pairing_invitation ADD COLUMN status TEXT NOT NULL DEFAULT 'staged'",
      'ALTER TABLE crew_pairing_invitation ADD COLUMN payload_json TEXT',
    ],
  },
  {
    version: 6,
    name: 'verified_membership_and_signed_message_metadata',
    statements: [
      "CREATE TABLE crew_verified_group (group_id TEXT PRIMARY KEY REFERENCES crew_group(group_id) ON DELETE CASCADE, authority_device_id TEXT NOT NULL, authority_public_key TEXT NOT NULL, current_epoch INTEGER NOT NULL CHECK (current_epoch >= 1), state TEXT NOT NULL CHECK (state IN ('active', 'deleted')), updated_at TEXT NOT NULL)",
      "CREATE TABLE crew_verified_membership (group_id TEXT NOT NULL REFERENCES crew_verified_group(group_id) ON DELETE CASCADE, device_id TEXT NOT NULL, public_key TEXT NOT NULL, epoch INTEGER NOT NULL CHECK (epoch >= 1), state TEXT NOT NULL CHECK (state IN ('active', 'revoked')), record_message_id TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY (group_id, device_id))",
      'CREATE INDEX crew_verified_membership_active_idx ON crew_verified_membership(group_id, device_id, state, epoch)',
      "CREATE TABLE crew_membership_tombstone (group_id TEXT NOT NULL REFERENCES crew_verified_group(group_id) ON DELETE CASCADE, device_id TEXT NOT NULL, public_key TEXT NOT NULL, revoked_epoch INTEGER NOT NULL CHECK (revoked_epoch >= 1), record_message_id TEXT NOT NULL, revoked_at TEXT NOT NULL, PRIMARY KEY (group_id, device_id))",
      'CREATE INDEX crew_membership_tombstone_epoch_idx ON crew_membership_tombstone(group_id, revoked_epoch DESC)',
      "CREATE TABLE crew_signed_membership_record (message_id TEXT PRIMARY KEY, group_id TEXT NOT NULL REFERENCES crew_verified_group(group_id) ON DELETE CASCADE, record_type TEXT NOT NULL CHECK (record_type IN ('membership_grant', 'membership_revocation')), membership_epoch INTEGER NOT NULL CHECK (membership_epoch >= 1), signer_device_id TEXT NOT NULL, signer_public_key TEXT NOT NULL, envelope_json TEXT NOT NULL, received_at TEXT NOT NULL, expires_at TEXT NOT NULL)",
      'CREATE UNIQUE INDEX crew_signed_membership_record_epoch_idx ON crew_signed_membership_record(group_id, membership_epoch)',
      "CREATE TABLE crew_signed_seen (message_id TEXT PRIMARY KEY, group_id TEXT NOT NULL REFERENCES crew_verified_group(group_id) ON DELETE CASCADE, seen_at TEXT NOT NULL, expires_at TEXT NOT NULL)",
      'CREATE INDEX crew_signed_seen_expiry_idx ON crew_signed_seen(expires_at)',
      "CREATE TABLE crew_signed_stream_highwater (group_id TEXT NOT NULL REFERENCES crew_verified_group(group_id) ON DELETE CASCADE, sender_device_id TEXT NOT NULL, stream_id TEXT NOT NULL, highest_sequence INTEGER NOT NULL CHECK (highest_sequence >= 0), updated_at TEXT NOT NULL, PRIMARY KEY (group_id, sender_device_id, stream_id))",
      "CREATE TABLE crew_signed_location (message_id TEXT PRIMARY KEY REFERENCES crew_signed_seen(message_id) ON DELETE CASCADE, group_id TEXT NOT NULL REFERENCES crew_verified_group(group_id) ON DELETE CASCADE, sender_device_id TEXT NOT NULL, membership_epoch INTEGER NOT NULL, stream_id TEXT NOT NULL, sequence INTEGER NOT NULL, envelope_json TEXT NOT NULL, received_at TEXT NOT NULL, expires_at TEXT NOT NULL, UNIQUE (group_id, sender_device_id, stream_id, sequence))",
      'CREATE INDEX crew_signed_location_latest_idx ON crew_signed_location(group_id, sender_device_id, sequence DESC)',
      'CREATE INDEX crew_signed_location_expiry_idx ON crew_signed_location(expires_at)',
      "CREATE TABLE crew_signed_outbox (message_id TEXT PRIMARY KEY, owner_device_id TEXT NOT NULL, group_id TEXT NOT NULL REFERENCES crew_verified_group(group_id) ON DELETE CASCADE, envelope_json TEXT NOT NULL, state TEXT NOT NULL CHECK (state IN ('queued', 'awaiting_ack', 'exhausted')), attempts INTEGER NOT NULL CHECK (attempts >= 0), next_attempt_at TEXT NOT NULL, last_attempt_at TEXT, sent_via_json TEXT NOT NULL, expires_at TEXT NOT NULL)",
      'CREATE INDEX crew_signed_outbox_due_idx ON crew_signed_outbox(state, next_attempt_at, expires_at)',
      'CREATE INDEX crew_signed_outbox_expiry_idx ON crew_signed_outbox(expires_at)',
      "CREATE TABLE crew_signed_ack (message_id TEXT PRIMARY KEY REFERENCES crew_signed_seen(message_id) ON DELETE CASCADE, acknowledged_message_id TEXT NOT NULL, group_id TEXT NOT NULL REFERENCES crew_verified_group(group_id) ON DELETE CASCADE, sender_device_id TEXT NOT NULL, stream_id TEXT NOT NULL, sequence INTEGER NOT NULL, envelope_json TEXT NOT NULL, received_at TEXT NOT NULL, expires_at TEXT NOT NULL, UNIQUE (acknowledged_message_id))",
      'CREATE INDEX crew_signed_ack_expiry_idx ON crew_signed_ack(expires_at)',
      "CREATE TABLE crew_signed_delivery_observation (id INTEGER PRIMARY KEY AUTOINCREMENT, message_id TEXT NOT NULL, group_id TEXT NOT NULL REFERENCES crew_verified_group(group_id) ON DELETE CASCADE, transport TEXT NOT NULL, observed_at TEXT NOT NULL, duplicate INTEGER NOT NULL CHECK (duplicate IN (0, 1)))",
      'CREATE INDEX crew_signed_delivery_observation_message_idx ON crew_signed_delivery_observation(message_id, observed_at)',
      "CREATE TABLE crew_message_rejection (id INTEGER PRIMARY KEY AUTOINCREMENT, message_id TEXT, group_id TEXT, reason TEXT NOT NULL, received_at TEXT NOT NULL, expires_at TEXT NOT NULL)",
      'CREATE INDEX crew_message_rejection_prune_idx ON crew_message_rejection(expires_at, id)',
      'CREATE TABLE crew_signed_local_sequence (group_id TEXT NOT NULL REFERENCES crew_verified_group(group_id) ON DELETE CASCADE, device_id TEXT NOT NULL, stream_id TEXT NOT NULL, next_sequence INTEGER NOT NULL CHECK (next_sequence >= 0), updated_at TEXT NOT NULL, PRIMARY KEY (group_id, device_id, stream_id))',
    ],
  },
  {
    version: 7,
    name: 'verified_group_origin_for_import_bootstrap',
    statements: [
      "ALTER TABLE crew_verified_group ADD COLUMN origin TEXT NOT NULL DEFAULT 'local_owned' CHECK (origin IN ('local_owned', 'imported'))",
    ],
  },
  {
    version: 8,
    name: 'repair_incomplete_signed_record_tables',
    statements: [
      "CREATE TABLE IF NOT EXISTS crew_signed_membership_record (message_id TEXT PRIMARY KEY, group_id TEXT NOT NULL REFERENCES crew_verified_group(group_id) ON DELETE CASCADE, record_type TEXT NOT NULL CHECK (record_type IN ('membership_grant', 'membership_revocation')), membership_epoch INTEGER NOT NULL CHECK (membership_epoch >= 1), signer_device_id TEXT NOT NULL, signer_public_key TEXT NOT NULL, envelope_json TEXT NOT NULL, received_at TEXT NOT NULL, expires_at TEXT NOT NULL)",
      'CREATE UNIQUE INDEX IF NOT EXISTS crew_signed_membership_record_epoch_idx ON crew_signed_membership_record(group_id, membership_epoch)',
      "CREATE TABLE IF NOT EXISTS crew_signed_seen (message_id TEXT PRIMARY KEY, group_id TEXT NOT NULL REFERENCES crew_verified_group(group_id) ON DELETE CASCADE, seen_at TEXT NOT NULL, expires_at TEXT NOT NULL)",
      'CREATE INDEX IF NOT EXISTS crew_signed_seen_expiry_idx ON crew_signed_seen(expires_at)',
      "CREATE TABLE IF NOT EXISTS crew_signed_stream_highwater (group_id TEXT NOT NULL REFERENCES crew_verified_group(group_id) ON DELETE CASCADE, sender_device_id TEXT NOT NULL, stream_id TEXT NOT NULL, highest_sequence INTEGER NOT NULL CHECK (highest_sequence >= 0), updated_at TEXT NOT NULL, PRIMARY KEY (group_id, sender_device_id, stream_id))",
      "CREATE TABLE IF NOT EXISTS crew_signed_location (message_id TEXT PRIMARY KEY REFERENCES crew_signed_seen(message_id) ON DELETE CASCADE, group_id TEXT NOT NULL REFERENCES crew_verified_group(group_id) ON DELETE CASCADE, sender_device_id TEXT NOT NULL, membership_epoch INTEGER NOT NULL, stream_id TEXT NOT NULL, sequence INTEGER NOT NULL, envelope_json TEXT NOT NULL, received_at TEXT NOT NULL, expires_at TEXT NOT NULL, UNIQUE (group_id, sender_device_id, stream_id, sequence))",
      'CREATE INDEX IF NOT EXISTS crew_signed_location_latest_idx ON crew_signed_location(group_id, sender_device_id, sequence DESC)',
      'CREATE INDEX IF NOT EXISTS crew_signed_location_expiry_idx ON crew_signed_location(expires_at)',
      "CREATE TABLE IF NOT EXISTS crew_signed_outbox (message_id TEXT PRIMARY KEY, owner_device_id TEXT NOT NULL, group_id TEXT NOT NULL REFERENCES crew_verified_group(group_id) ON DELETE CASCADE, envelope_json TEXT NOT NULL, state TEXT NOT NULL CHECK (state IN ('queued', 'awaiting_ack', 'exhausted')), attempts INTEGER NOT NULL CHECK (attempts >= 0), next_attempt_at TEXT NOT NULL, last_attempt_at TEXT, sent_via_json TEXT NOT NULL, expires_at TEXT NOT NULL)",
      'CREATE INDEX IF NOT EXISTS crew_signed_outbox_due_idx ON crew_signed_outbox(state, next_attempt_at, expires_at)',
      'CREATE INDEX IF NOT EXISTS crew_signed_outbox_expiry_idx ON crew_signed_outbox(expires_at)',
      "CREATE TABLE IF NOT EXISTS crew_signed_ack (message_id TEXT PRIMARY KEY REFERENCES crew_signed_seen(message_id) ON DELETE CASCADE, acknowledged_message_id TEXT NOT NULL, group_id TEXT NOT NULL REFERENCES crew_verified_group(group_id) ON DELETE CASCADE, sender_device_id TEXT NOT NULL, stream_id TEXT NOT NULL, sequence INTEGER NOT NULL, envelope_json TEXT NOT NULL, received_at TEXT NOT NULL, expires_at TEXT NOT NULL, UNIQUE (acknowledged_message_id))",
      'CREATE INDEX IF NOT EXISTS crew_signed_ack_expiry_idx ON crew_signed_ack(expires_at)',
      "CREATE TABLE IF NOT EXISTS crew_signed_delivery_observation (id INTEGER PRIMARY KEY AUTOINCREMENT, message_id TEXT NOT NULL, group_id TEXT NOT NULL REFERENCES crew_verified_group(group_id) ON DELETE CASCADE, transport TEXT NOT NULL, observed_at TEXT NOT NULL, duplicate INTEGER NOT NULL CHECK (duplicate IN (0, 1)))",
      'CREATE INDEX IF NOT EXISTS crew_signed_delivery_observation_message_idx ON crew_signed_delivery_observation(message_id, observed_at)',
      'CREATE INDEX IF NOT EXISTS crew_message_rejection_prune_idx ON crew_message_rejection(expires_at, id)',
      'CREATE TABLE IF NOT EXISTS crew_signed_local_sequence (group_id TEXT NOT NULL REFERENCES crew_verified_group(group_id) ON DELETE CASCADE, device_id TEXT NOT NULL, stream_id TEXT NOT NULL, next_sequence INTEGER NOT NULL CHECK (next_sequence >= 0), updated_at TEXT NOT NULL, PRIMARY KEY (group_id, device_id, stream_id))',
    ],
  },
  {
    version: 9,
    name: 'complete_signed_schema_repair',
    statements: [
      "CREATE TABLE IF NOT EXISTS crew_verified_group (group_id TEXT PRIMARY KEY REFERENCES crew_group(group_id) ON DELETE CASCADE, authority_device_id TEXT NOT NULL, authority_public_key TEXT NOT NULL, current_epoch INTEGER NOT NULL CHECK (current_epoch >= 1), state TEXT NOT NULL CHECK (state IN ('active', 'deleted')), updated_at TEXT NOT NULL, origin TEXT NOT NULL DEFAULT 'local_owned' CHECK (origin IN ('local_owned', 'imported')))",
      "CREATE TABLE IF NOT EXISTS crew_verified_membership (group_id TEXT NOT NULL REFERENCES crew_verified_group(group_id) ON DELETE CASCADE, device_id TEXT NOT NULL, public_key TEXT NOT NULL, epoch INTEGER NOT NULL CHECK (epoch >= 1), state TEXT NOT NULL CHECK (state IN ('active', 'revoked')), record_message_id TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY (group_id, device_id))",
      'CREATE INDEX IF NOT EXISTS crew_verified_membership_active_idx ON crew_verified_membership(group_id, device_id, state, epoch)',
      "CREATE TABLE IF NOT EXISTS crew_membership_tombstone (group_id TEXT NOT NULL REFERENCES crew_verified_group(group_id) ON DELETE CASCADE, device_id TEXT NOT NULL, public_key TEXT NOT NULL, revoked_epoch INTEGER NOT NULL CHECK (revoked_epoch >= 1), record_message_id TEXT NOT NULL, revoked_at TEXT NOT NULL, PRIMARY KEY (group_id, device_id))",
      'CREATE INDEX IF NOT EXISTS crew_membership_tombstone_epoch_idx ON crew_membership_tombstone(group_id, revoked_epoch DESC)',
      "CREATE TABLE IF NOT EXISTS crew_signed_membership_record (message_id TEXT PRIMARY KEY, group_id TEXT NOT NULL REFERENCES crew_verified_group(group_id) ON DELETE CASCADE, record_type TEXT NOT NULL CHECK (record_type IN ('membership_grant', 'membership_revocation')), membership_epoch INTEGER NOT NULL CHECK (membership_epoch >= 1), signer_device_id TEXT NOT NULL, signer_public_key TEXT NOT NULL, envelope_json TEXT NOT NULL, received_at TEXT NOT NULL, expires_at TEXT NOT NULL)",
      'CREATE UNIQUE INDEX IF NOT EXISTS crew_signed_membership_record_epoch_idx ON crew_signed_membership_record(group_id, membership_epoch)',
      "CREATE TABLE IF NOT EXISTS crew_signed_seen (message_id TEXT PRIMARY KEY, group_id TEXT NOT NULL REFERENCES crew_verified_group(group_id) ON DELETE CASCADE, seen_at TEXT NOT NULL, expires_at TEXT NOT NULL)",
      'CREATE INDEX IF NOT EXISTS crew_signed_seen_expiry_idx ON crew_signed_seen(expires_at)',
      "CREATE TABLE IF NOT EXISTS crew_signed_stream_highwater (group_id TEXT NOT NULL REFERENCES crew_verified_group(group_id) ON DELETE CASCADE, sender_device_id TEXT NOT NULL, stream_id TEXT NOT NULL, highest_sequence INTEGER NOT NULL CHECK (highest_sequence >= 0), updated_at TEXT NOT NULL, PRIMARY KEY (group_id, sender_device_id, stream_id))",
      "CREATE TABLE IF NOT EXISTS crew_signed_location (message_id TEXT PRIMARY KEY REFERENCES crew_signed_seen(message_id) ON DELETE CASCADE, group_id TEXT NOT NULL REFERENCES crew_verified_group(group_id) ON DELETE CASCADE, sender_device_id TEXT NOT NULL, membership_epoch INTEGER NOT NULL, stream_id TEXT NOT NULL, sequence INTEGER NOT NULL, envelope_json TEXT NOT NULL, received_at TEXT NOT NULL, expires_at TEXT NOT NULL, UNIQUE (group_id, sender_device_id, stream_id, sequence))",
      'CREATE INDEX IF NOT EXISTS crew_signed_location_latest_idx ON crew_signed_location(group_id, sender_device_id, sequence DESC)',
      'CREATE INDEX IF NOT EXISTS crew_signed_location_expiry_idx ON crew_signed_location(expires_at)',
      "CREATE TABLE IF NOT EXISTS crew_signed_outbox (message_id TEXT PRIMARY KEY, owner_device_id TEXT NOT NULL, group_id TEXT NOT NULL REFERENCES crew_verified_group(group_id) ON DELETE CASCADE, envelope_json TEXT NOT NULL, state TEXT NOT NULL CHECK (state IN ('queued', 'awaiting_ack', 'exhausted')), attempts INTEGER NOT NULL CHECK (attempts >= 0), next_attempt_at TEXT NOT NULL, last_attempt_at TEXT, sent_via_json TEXT NOT NULL, expires_at TEXT NOT NULL)",
      'CREATE INDEX IF NOT EXISTS crew_signed_outbox_due_idx ON crew_signed_outbox(state, next_attempt_at, expires_at)',
      'CREATE INDEX IF NOT EXISTS crew_signed_outbox_expiry_idx ON crew_signed_outbox(expires_at)',
      "CREATE TABLE IF NOT EXISTS crew_signed_ack (message_id TEXT PRIMARY KEY REFERENCES crew_signed_seen(message_id) ON DELETE CASCADE, acknowledged_message_id TEXT NOT NULL, group_id TEXT NOT NULL REFERENCES crew_verified_group(group_id) ON DELETE CASCADE, sender_device_id TEXT NOT NULL, stream_id TEXT NOT NULL, sequence INTEGER NOT NULL, envelope_json TEXT NOT NULL, received_at TEXT NOT NULL, expires_at TEXT NOT NULL, UNIQUE (acknowledged_message_id))",
      'CREATE INDEX IF NOT EXISTS crew_signed_ack_expiry_idx ON crew_signed_ack(expires_at)',
      "CREATE TABLE IF NOT EXISTS crew_signed_delivery_observation (id INTEGER PRIMARY KEY AUTOINCREMENT, message_id TEXT NOT NULL, group_id TEXT NOT NULL REFERENCES crew_verified_group(group_id) ON DELETE CASCADE, transport TEXT NOT NULL, observed_at TEXT NOT NULL, duplicate INTEGER NOT NULL CHECK (duplicate IN (0, 1)))",
      'CREATE INDEX IF NOT EXISTS crew_signed_delivery_observation_message_idx ON crew_signed_delivery_observation(message_id, observed_at)',
      "CREATE TABLE IF NOT EXISTS crew_message_rejection (id INTEGER PRIMARY KEY AUTOINCREMENT, message_id TEXT, group_id TEXT, reason TEXT NOT NULL, received_at TEXT NOT NULL, expires_at TEXT NOT NULL)",
      'CREATE INDEX IF NOT EXISTS crew_message_rejection_prune_idx ON crew_message_rejection(expires_at, id)',
      "CREATE TABLE IF NOT EXISTS crew_signed_local_sequence (group_id TEXT NOT NULL REFERENCES crew_verified_group(group_id) ON DELETE CASCADE, device_id TEXT NOT NULL, stream_id TEXT NOT NULL, next_sequence INTEGER NOT NULL CHECK (next_sequence >= 0), updated_at TEXT NOT NULL, PRIMARY KEY (group_id, device_id, stream_id))",
    ],
  },
];

export const LATEST_CREWLINK_SCHEMA_VERSION = CREWLINK_MIGRATIONS[CREWLINK_MIGRATIONS.length - 1]?.version ?? 0;

export const validateMigrationPlan = (migrations: readonly CrewLinkMigration[] = CREWLINK_MIGRATIONS): void => {
  let previous = 0;
  for (const migration of migrations) {
    if (!Number.isSafeInteger(migration.version) || migration.version !== previous + 1) throw new Error('CrewLink migrations must be contiguous and ordered');
    if (!migration.name || migration.statements.length === 0) throw new Error('CrewLink migrations require a name and SQL statements');
    previous = migration.version;
  }
};

export const pendingMigrations = (version: number, migrations: readonly CrewLinkMigration[] = CREWLINK_MIGRATIONS): readonly CrewLinkMigration[] => {
  validateMigrationPlan(migrations);
  if (!Number.isSafeInteger(version) || version < 0 || version > (migrations[migrations.length - 1]?.version ?? 0)) throw new Error('Invalid CrewLink database version');
  return migrations.filter((migration) => migration.version > version);
};

export const isLegacyStage2SnapshotSchema = (columnNames: readonly string[]): boolean => columnNames.includes('payload') && !columnNames.includes('name');

export const migrationTransactionSql = (migration: CrewLinkMigration, appliedAt = '1970-01-01T00:00:00.000Z'): readonly string[] => [
  'BEGIN IMMEDIATE',
  ...migration.statements,
  `INSERT INTO crew_migration_log (version, name, applied_at) VALUES (${migration.version}, '${migration.name}', '${appliedAt}')`,
  `PRAGMA user_version = ${migration.version}`,
  'COMMIT',
];
