import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CREWLINK_MIGRATIONS } from '@crowntrack/crewlink';
import { SIGNED_REJECTIONS_OLDEST_FIRST_SQL, TRUSTED_DEVICE_SNAPSHOT_SQL } from '../apps/mobile/src/crew/signed-sql-contract';

test('native signed snapshot maps the persisted trusted_at column to pairedAt', () => {
  const trustedPeerMigration = CREWLINK_MIGRATIONS.find((migration) => migration.version === 4);
  assert.ok(trustedPeerMigration, 'migration v4 must define the trusted-peer table');
  assert.match(trustedPeerMigration.statements.join('\n'), /crew_trusted_peer[^]*trusted_at TEXT NOT NULL/);
  assert.match(TRUSTED_DEVICE_SNAPSHOT_SQL, /trusted_at AS paired_at/);
  assert.doesNotMatch(TRUSTED_DEVICE_SNAPSHOT_SQL, /, paired_at,/);
});

test('native signed schema repair creates the rejection table and exposes rejection history oldest-to-newest', () => {
  const repair = CREWLINK_MIGRATIONS.find((migration) => migration.version === 9);
  assert.ok(repair, 'migration v9 must repair falsely-versioned signed schemas');
  const sql = repair.statements.join('\n');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS crew_message_rejection/);
  assert.match(sql, /crew_message_rejection_prune_idx/);
  assert.match(SIGNED_REJECTIONS_OLDEST_FIRST_SQL, /ORDER BY id ASC/);
});
