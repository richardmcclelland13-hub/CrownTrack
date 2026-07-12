import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createAckMessage, parseCrewLinkMessage } from '@crowntrack/crew-protocol';
import { InMemoryCrewRepository, type CrewRepository, type LocationEnvelope } from '@crowntrack/crewlink';

const envelope = (): LocationEnvelope => {
  const parsed = parseCrewLinkMessage({ version: 1, type: 'location', messageId: 'message-contract-1', groupId: 'group-contract', deviceId: 'device-bob', streamId: 'stream-bob', sequence: 1, sentAt: '2026-07-12T18:00:00.000Z', ttlSeconds: 600, payload: { latitude: 53.5, longitude: -115.2, accuracyMeters: 8, capturedAt: '2026-07-12T18:00:00.000Z' } }, { now: new Date('2026-07-12T18:00:00.000Z') });
  if (parsed.type !== 'location') throw new Error('Expected location envelope');
  return parsed;
};

const runRepositoryContract = (name: string, create: () => CrewRepository) => test(`${name} satisfies the CrewLink repository contract`, async () => {
  const repository = create();
  await repository.initialize();
  await repository.putGroup({ groupId: 'group-contract', name: 'Contract group', createdAt: '2026-07-12T18:00:00.000Z' });
  await repository.putPeer({ peerId: 'bob', displayName: 'Bob', deviceId: 'device-bob', addedAt: '2026-07-12T18:00:00.000Z' });
  await repository.putMembership({ groupId: 'group-contract', peerId: 'bob', joinedAt: '2026-07-12T18:00:00.000Z' });
  await repository.putSharePolicy({ peerId: 'alice', enabled: true, consentConfirmed: true, groupIds: ['group-contract'], precision: 'reduced', retentionMinutes: 60, emergencyOverride: false, updatedAt: '2026-07-12T18:00:00.000Z' });
  const message = envelope();
  await repository.enqueue({ envelope: message, ownerPeerId: 'alice', state: 'queued', attempts: 0, nextAttemptAt: message.sentAt, sentVia: [] });
  assert.equal((await repository.listDueOutbox(message.sentAt)).length, 1);
  assert.equal((await repository.acceptInbound(message, message.sentAt, 'cloud')).disposition, 'accepted');
  assert.equal((await repository.acceptInbound(message, message.sentAt, 'nearby')).disposition, 'duplicate');
  const regressing = { ...message, messageId: 'message-contract-regressing', sequence: 0 } satisfies LocationEnvelope;
  assert.equal((await repository.acceptInbound(regressing, message.sentAt, 'mesh_radio')).disposition, 'sequence_regression');
  assert.equal((await repository.listHistory('group-contract', 'device-bob')).length, 1);
  await repository.putAcknowledgement(createAckMessage(message, { messageId: 'ack-contract-1', deviceId: 'device-alice', streamId: 'ack-stream', sequence: 1, sentAt: message.sentAt, ttlSeconds: 600 }));
  assert.ok(await repository.getAcknowledgement(message.messageId));
  await repository.putTransportStatus({ kind: 'cloud', state: 'connected', changedAt: message.sentAt });
  assert.equal((await repository.listTransportStatuses())[0]?.state, 'connected');
  await repository.deletePeerData('group-contract', 'bob');
  assert.equal((await repository.listPeers('group-contract')).length, 0);
  assert.equal((await repository.listHistory('group-contract', 'device-bob')).length, 0);
  assert.equal((await repository.listObservations(message.messageId)).length, 0);
  assert.equal((await repository.listObservations(regressing.messageId)).length, 0);
  assert.equal(await repository.getAcknowledgement(message.messageId), undefined);
  await repository.deleteAllCrewData();
  assert.equal((await repository.getDiagnostics()).rowCounts.groups, 0);
});

runRepositoryContract('In-memory repository', () => new InMemoryCrewRepository());

test('serialized repository state survives a development restart without React state', async () => {
  const first = new InMemoryCrewRepository();
  await first.initialize();
  await first.putGroup({ groupId: 'restart-group', name: 'Restart group', createdAt: '2026-07-12T18:00:00.000Z' });
  await first.putPeer({ peerId: 'bob', displayName: 'Bob', deviceId: 'device-bob', addedAt: '2026-07-12T18:00:00.000Z' });
  await first.putMembership({ groupId: 'restart-group', peerId: 'bob', joinedAt: '2026-07-12T18:00:00.000Z' });
  await first.putSharePolicy({ peerId: 'alice', enabled: true, consentConfirmed: true, groupIds: ['restart-group'], precision: 'exact', retentionMinutes: 120, emergencyOverride: false, updatedAt: '2026-07-12T18:00:00.000Z' });
  const restored = InMemoryCrewRepository.fromState(JSON.parse(JSON.stringify(first.exportState())));
  await restored.initialize();
  assert.equal((await restored.getGroup('restart-group'))?.name, 'Restart group');
  assert.equal((await restored.listPeers('restart-group'))[0]?.displayName, 'Bob');
  assert.equal((await restored.getSharePolicy('alice'))?.consentConfirmed, true);
});
