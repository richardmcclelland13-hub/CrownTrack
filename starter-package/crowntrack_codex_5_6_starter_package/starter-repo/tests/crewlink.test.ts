import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ConsentRequiredError,
  CrewLinkCoordinator,
  InMemoryCrewRepository,
  MockCloudTransport,
  MockMeshRadioTransport,
  MockNearbyTransport,
  SimulatedTransportNetwork,
  migrationTransactionSql,
  CREWLINK_MIGRATIONS,
  LATEST_CREWLINK_SCHEMA_VERSION,
  pendingMigrations,
  validateMigrationPlan,
  type Clock,
  type CrewPeer,
  type IdGenerator,
  type LocationEnvelope,
  type PeerIdentity,
} from '@crowntrack/crewlink';

class TestClock implements Clock {
  constructor(public value = new Date('2026-07-11T18:00:00.000Z')) {}
  now() { return new Date(this.value); }
  advance(ms: number) { this.value = new Date(this.value.getTime() + ms); }
}
class TestIds implements IdGenerator {
  private value = 0;
  next() { return `message-${++this.value}`; }
}
const alice: PeerIdentity = { peerId: 'alice', displayName: 'Alice', deviceId: 'device-alice' };
const bob: CrewPeer = { peerId: 'bob', displayName: 'Bob', deviceId: 'device-bob', addedAt: '2026-07-11T17:00:00.000Z' };
const fix = (capturedAt = '2026-07-11T18:00:00.000Z') => ({ latitude: 53.123456, longitude: -115.987654, capturedAt });
const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 5));

async function setup(transports: ConstructorParameters<typeof CrewLinkCoordinator>[0]['transports'] = []) {
  const repo = new InMemoryCrewRepository();
  const clock = new TestClock();
  const coordinator = new CrewLinkCoordinator({ repository: repo, transports, clock, ids: new TestIds(), retryPolicy: { maxAttempts: 2, baseDelayMs: 10, maxDelayMs: 10 } });
  await repo.putGroup({ groupId: 'ride-1', name: 'Ride', createdAt: clock.now().toISOString() });
  await repo.putPeer(bob);
  await repo.putMembership({ groupId: 'ride-1', peerId: bob.peerId, joinedAt: clock.now().toISOString() });
  return { repo, clock, coordinator };
}
const allow = async (coordinator: CrewLinkCoordinator, enabled = true, precision: 'exact' | 'reduced' = 'exact') => coordinator.setSharePolicy({
  peerId: alice.peerId, enabled, groupIds: ['ride-1'], precision, retentionMinutes: 60, emergencyOverride: false, consentConfirmed: true,
  updatedAt: '2026-07-11T18:00:00.000Z',
});

test('migration export is forward-only and transaction-wrapped', () => {
  assert.equal(CREWLINK_MIGRATIONS[0].version, 1);
  assert.equal(LATEST_CREWLINK_SCHEMA_VERSION, 9);
  assert.deepEqual(migrationTransactionSql(CREWLINK_MIGRATIONS[0]).slice(0, 1), ['BEGIN IMMEDIATE']);
  const statements = migrationTransactionSql(CREWLINK_MIGRATIONS[0]);
  assert.equal(statements[statements.length - 1], 'COMMIT');
  assert.equal(statements.some((statement) => statement.includes('journal_mode')), false);
  assert.deepEqual(pendingMigrations(1).map((migration) => migration.version), [2, 3, 4, 5, 6, 7, 8, 9]);
  const repair = pendingMigrations(7)[0];
  assert.equal(repair?.name, 'repair_incomplete_signed_record_tables');
  assert.equal(repair?.statements.some((statement) => statement.includes('crew_signed_local_sequence')), true);
  assert.equal(repair?.statements.some((statement) => statement.includes('crew_signed_location')), true);
  assert.throws(() => validateMigrationPlan([{ version: 2, name: 'broken', statements: ['SELECT 1'] }]));
});

test('consent is required at creation and reduced precision is applied', async () => {
  const { coordinator } = await setup();
  await assert.rejects(() => coordinator.createLocationEnvelope(alice, 'ride-1', 'location', 1, fix(), 120), (error) => error instanceof ConsentRequiredError && error.gate === 'create');
  await allow(coordinator, true, 'reduced');
  const message = await coordinator.createLocationEnvelope(alice, 'ride-1', 'location', 1, fix(), 120);
  assert.equal(message.payload.latitude, 53.123);
  assert.equal(message.payload.longitude, -115.988);
});

test('revocation purges queued locations and retry re-checks consent', async () => {
  const network = new SimulatedTransportNetwork();
  const cloud = new MockCloudTransport(network);
  const { repo, clock, coordinator } = await setup([cloud]);
  await coordinator.start(alice, ['ride-1']);
  await allow(coordinator);
  const message = await coordinator.createAndEnqueue(alice, 'ride-1', 'location', 1, fix(), 120);
  cloud.setAvailable(false);
  await coordinator.flushOutbox();
  assert.equal((await repo.getOutbox(message.messageId))?.attempts, 1);
  clock.advance(10);
  await allow(coordinator, false);
  assert.equal(await repo.getOutbox(message.messageId), undefined);
  await coordinator.stop();
});

test('removing a group from an otherwise enabled policy purges the former group queue', async () => {
  const { repo, coordinator } = await setup();
  await allow(coordinator);
  const message = await coordinator.createAndEnqueue(alice, 'ride-1', 'location', 1, fix(), 120);
  await coordinator.setSharePolicy({ peerId: alice.peerId, enabled: true, consentConfirmed: true, groupIds: ['ride-2'], precision: 'exact', retentionMinutes: 60, emergencyOverride: false, updatedAt: '2026-07-11T18:00:00.000Z' });
  assert.equal(await repo.getOutbox(message.messageId), undefined);
});

test('bounded retry exhausts and reconnect allows a queued send', async () => {
  const network = new SimulatedTransportNetwork();
  const nearby = new MockNearbyTransport(network);
  const { repo, clock, coordinator } = await setup([nearby]);
  await coordinator.start(alice, ['ride-1']); await allow(coordinator);
  const first = await coordinator.createAndEnqueue(alice, 'ride-1', 'location', 1, fix(), 120);
  nearby.setAvailable(false);
  await coordinator.flushOutbox(); clock.advance(10); await coordinator.flushOutbox();
  assert.equal((await repo.getOutbox(first.messageId))?.state, 'exhausted');
  nearby.reconnect();
  const second = await coordinator.createAndEnqueue(alice, 'ride-1', 'location', 2, fix(), 120);
  await coordinator.flushOutbox();
  assert.equal((await repo.getOutbox(second.messageId))?.state, 'awaiting_ack');
  await coordinator.stop();
});

test('cross-transport duplicate is stored once with both observations', async () => {
  const network = new SimulatedTransportNetwork();
  const cloud = new MockCloudTransport(network); const mesh = new MockMeshRadioTransport(network);
  const { repo, coordinator } = await setup([cloud, mesh]);
  await coordinator.start(alice, ['ride-1']); await allow(coordinator);
  const message = await coordinator.createLocationEnvelope({ ...alice, deviceId: bob.deviceId }, 'ride-1', 'location', 4, fix(), 120);
  await coordinator.receive(message, 'cloud'); await coordinator.receive(message, 'mesh_radio');
  assert.equal((await repo.listHistory('ride-1', bob.deviceId)).length, 1);
  assert.deepEqual((await repo.listObservations(message.messageId)).map((o) => o.transport), ['cloud', 'mesh_radio']);
  await coordinator.stop();
});

test('out-of-order message cannot replace a newer position', async () => {
  const { repo, coordinator } = await setup(); await allow(coordinator);
  const newer = await coordinator.createLocationEnvelope({ ...alice, deviceId: bob.deviceId }, 'ride-1', 'location', 5, fix(), 120);
  const older = { ...newer, messageId: 'message-older', sequence: 4 } satisfies LocationEnvelope;
  assert.equal((await repo.acceptInbound(newer, '2026-07-11T18:00:00.000Z', 'nearby')).disposition, 'accepted');
  assert.equal((await repo.acceptInbound(older, '2026-07-11T18:00:01.000Z', 'mesh_radio')).disposition, 'sequence_regression');
  assert.equal((await repo.getLatestPosition('ride-1', bob.deviceId))?.envelope.sequence, 5);
});

test('presence derives from remote fix age and deletion clears group data', async () => {
  const { repo, clock, coordinator } = await setup(); await allow(coordinator);
  const message = await coordinator.createLocationEnvelope({ ...alice, deviceId: bob.deviceId }, 'ride-1', 'location', 1, fix(), 120);
  await repo.acceptInbound(message, clock.now().toISOString(), 'cloud');
  assert.equal((await coordinator.getPresence('ride-1'))[0].state, 'live');
  clock.advance(2 * 60_000); assert.equal((await coordinator.getPresence('ride-1'))[0].state, 'recent');
  clock.advance(5 * 60_000); assert.equal((await coordinator.getPresence('ride-1'))[0].state, 'stale');
  clock.advance(31 * 60_000); assert.equal((await coordinator.getPresence('ride-1'))[0].state, 'unknown');
  await coordinator.deleteGroupData('ride-1');
  assert.equal((await repo.listHistory('ride-1', bob.deviceId)).length, 0);
  assert.equal(await repo.getGroup('ride-1'), undefined);
});

test('repository retention pruning and group deletion remove all locally controlled message state', async () => {
  const { repo, coordinator, clock } = await setup();
  await allow(coordinator);
  const message = await coordinator.createAndEnqueue(alice, 'ride-1', 'location', 1, fix(), 60);
  const inbound = await coordinator.createLocationEnvelope({ ...alice, deviceId: bob.deviceId }, 'ride-1', 'location', 2, fix(), 60);
  await repo.acceptInbound(inbound, clock.now().toISOString(), 'cloud');
  clock.advance(61_000);
  await repo.pruneExpired(clock.now().toISOString());
  assert.equal(await repo.getOutbox(message.messageId), undefined);
  assert.equal((await repo.listHistory('ride-1', bob.deviceId)).length, 0);
  await repo.deleteGroupData('ride-1');
  assert.equal(await repo.getGroup('ride-1'), undefined);
  assert.equal((await repo.getDiagnostics()).rowCounts.groups, 0);
});

test('simulators cover drop, duplicate, delay, out-of-order, unavailable, and reconnect', async () => {
  const network = new SimulatedTransportNetwork();
  const sender = new MockCloudTransport(network, { delayMs: 2 }); const receiver = new MockCloudTransport(network);
  await sender.start({ localPeer: alice, rideGroupIds: ['ride-1'] });
  await receiver.start({ localPeer: bob, rideGroupIds: ['ride-1'] });
  const received: number[] = []; receiver.subscribe((message) => { received.push(message.sequence); });
  const { coordinator } = await setup(); await allow(coordinator);
  const one = await coordinator.createLocationEnvelope(alice, 'ride-1', 'location', 1, fix(), 120);
  sender.setScenario('drop', 'duplicate', 'delayed', 'out_of_order', 'normal');
  assert.equal((await sender.send(one)).accepted, false);
  await sender.send({ ...one, messageId: 'message-2', sequence: 2 });
  await sender.send({ ...one, messageId: 'message-3', sequence: 3 });
  await sender.send({ ...one, messageId: 'message-4', sequence: 4 });
  await sender.send({ ...one, messageId: 'message-5', sequence: 5 });
  await settle();
  assert.equal(received.filter((sequence) => sequence === 2).length, 2);
  assert.equal(received.includes(1), false);
  assert.equal(received.includes(3), true);
  assert.equal(received.includes(4), true);
  assert.equal(received.includes(5), true);
  assert.ok(received.indexOf(5) < received.indexOf(4));
  sender.setScenario('unavailable'); assert.equal((await sender.send(one)).reason, 'unavailable');
  sender.reconnect(); assert.equal(sender.getState(), 'connected');
  await sender.stop(); await receiver.stop();
});
