import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isLegacyStage2SnapshotSchema, LATEST_CREWLINK_SCHEMA_VERSION, runCrewLinkMigrations, type CrewLinkMigrationDriver } from '@crowntrack/crewlink';

class FakeMigrationDriver implements CrewLinkMigrationDriver {
  configured = false;
  version = 0;
  schemaValid = true;
  recorded: number[] = [];
  failVersion?: number;
  async configureConnection() { this.configured = true; }
  async getVersion() { return this.version; }
  async transaction(task: Parameters<CrewLinkMigrationDriver['transaction']>[0]) {
    const versionBefore = this.version;
    const recordsBefore = [...this.recorded];
    try {
      await task({
        execute: async () => { if (this.failVersion === versionBefore + 1) throw new Error('interrupted migration'); },
        record: async (version) => { this.recorded.push(version); },
        setVersion: async (version) => { this.version = version; },
      });
    } catch (error) { this.version = versionBefore; this.recorded = recordsBefore; throw error; }
  }
  async validateSchema(version: number) { if (!this.schemaValid || version !== LATEST_CREWLINK_SCHEMA_VERSION) throw new Error('invalid schema'); }
}

test('migration runner upgrades an empty database, is idempotent, and configures the connection', async () => {
  const driver = new FakeMigrationDriver();
  const first = await runCrewLinkMigrations(driver, () => '2026-07-12T00:00:00.000Z');
  assert.equal(driver.configured, true);
  assert.equal(first.fromVersion, 0);
  assert.equal(first.toVersion, LATEST_CREWLINK_SCHEMA_VERSION);
  assert.deepEqual(driver.recorded, [1, 2, 3]);
  const second = await runCrewLinkMigrations(driver, () => '2026-07-12T00:00:00.000Z');
  assert.equal(second.applied.length, 0);
});

test('migration runner preserves the prior version when a migration is interrupted', async () => {
  const driver = new FakeMigrationDriver();
  driver.version = 2;
  driver.recorded = [1, 2];
  driver.failVersion = 3;
  await assert.rejects(() => runCrewLinkMigrations(driver, () => '2026-07-12T00:00:00.000Z'));
  assert.equal(driver.version, 2);
  assert.deepEqual(driver.recorded, [1, 2]);
});

test('migration runner rejects invalid stored schema versions', async () => {
  const driver = new FakeMigrationDriver();
  driver.version = 99;
  await assert.rejects(() => runCrewLinkMigrations(driver, () => '2026-07-12T00:00:00.000Z'));
});

test('legacy Stage 2 snapshot schema is distinguishable from the canonical v1 schema', () => {
  assert.equal(isLegacyStage2SnapshotSchema(['group_id', 'payload']), true);
  assert.equal(isLegacyStage2SnapshotSchema(['group_id', 'name', 'created_at']), false);
});
