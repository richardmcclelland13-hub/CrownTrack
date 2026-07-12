import { pendingMigrations, type CrewLinkMigration } from './migrations';

export interface CrewLinkMigrationTransaction {
  execute(statements: readonly string[]): Promise<void>;
  record(version: number, name: string, appliedAt: string): Promise<void>;
  setVersion(version: number): Promise<void>;
}

export interface CrewLinkMigrationDriver {
  configureConnection(): Promise<void>;
  getVersion(): Promise<number>;
  transaction(task: (transaction: CrewLinkMigrationTransaction) => Promise<void>): Promise<void>;
  validateSchema(version: number): Promise<void>;
}

export interface MigrationRunResult {
  fromVersion: number;
  toVersion: number;
  applied: readonly CrewLinkMigration[];
}

export const runCrewLinkMigrations = async (driver: CrewLinkMigrationDriver, appliedAt: () => string): Promise<MigrationRunResult> => {
  await driver.configureConnection();
  const fromVersion = await driver.getVersion();
  const migrations = pendingMigrations(fromVersion);
  for (const migration of migrations) {
    await driver.transaction(async (transaction) => {
      await transaction.execute(migration.statements);
      await transaction.record(migration.version, migration.name, appliedAt());
      await transaction.setVersion(migration.version);
    });
  }
  const toVersion = migrations[migrations.length - 1]?.version ?? fromVersion;
  await driver.validateSchema(toVersion);
  return { fromVersion, toVersion, applied: migrations };
};
