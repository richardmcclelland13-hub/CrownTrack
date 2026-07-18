import assert from 'node:assert/strict';
import test from 'node:test';
import { SIGNED_CREWLINK_DOMAIN, SIGNED_CREWLINK_VERSION, type SignedCrewLinkEnvelope } from '@crowntrack/crew-protocol';
import {
  SignedMockCloudTransport,
  SignedMockMeshRadioTransport,
  SignedMockNearbyTransport,
  SignedSimulatedTransportNetwork,
} from '@crowntrack/crewlink';

const at = '2026-07-13T17:59:30.000Z';
const key = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const signature = 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';
const location = (messageId: string, sequence: number, groupId = 'ride-transport'): SignedCrewLinkEnvelope => ({
  version: SIGNED_CREWLINK_VERSION,
  domain: SIGNED_CREWLINK_DOMAIN,
  type: 'location',
  messageId,
  groupId,
  senderDeviceId: 'owner-device',
  signerPublicKey: key,
  streamId: 'location-owner-device',
  sequence,
  membershipEpoch: 2,
  sentAt: at,
  ttlSeconds: 120,
  payload: { latitude: 53.5, longitude: -115.2, capturedAt: at },
  signature,
});

test('signed simulated transports deliver exact v2 envelopes and drain chained ACKs', async () => {
  const network = new SignedSimulatedTransportNetwork();
  const sender = new SignedMockCloudTransport(network);
  const receiver = new SignedMockCloudTransport(network);
  await sender.startSigned(['ride-transport']);
  await receiver.startSigned(['ride-transport']);

  const first = location('location-1', 0);
  const received: SignedCrewLinkEnvelope[] = [];
  sender.subscribeSigned((message) => { received.push(message as SignedCrewLinkEnvelope); });
  receiver.subscribeSigned(async (message) => {
    received.push(message as SignedCrewLinkEnvelope);
    const original = message as SignedCrewLinkEnvelope;
    await receiver.sendSigned({
      ...original,
      type: 'ack',
      messageId: 'ack-1',
      senderDeviceId: 'receiver-device',
      streamId: 'ack-receiver-device',
      sequence: 0,
      payload: { acknowledgedMessageId: original.messageId, receivedAt: at, status: 'received' },
    });
  });

  assert.deepEqual(await sender.sendSigned(first), { accepted: true });
  await network.drain();

  assert.equal(received.length, 2);
  assert.strictEqual(received[0], first, 'the transport forwards the exact envelope object');
  assert.equal(received[1]?.type, 'ack');
  assert.equal(network.pendingCount, 0);
});

test('signed network isolates kinds as well as groups and rejects legacy v1-shaped input', async () => {
  const network = new SignedSimulatedTransportNetwork();
  const sender = new SignedMockCloudTransport(network);
  const sameGroup = new SignedMockCloudTransport(network);
  const nearby = new SignedMockNearbyTransport(network);
  const mesh = new SignedMockMeshRadioTransport(network);
  const otherGroup = new SignedMockNearbyTransport(network);
  await sender.startSigned(['ride-transport']);
  await sameGroup.startSigned(['ride-transport']);
  await nearby.startSigned(['ride-transport']);
  await mesh.startSigned(['ride-transport']);
  await otherGroup.startSigned(['another-group']);

  let deliveries = 0;
  sameGroup.subscribeSigned(() => { deliveries += 1; });
  nearby.subscribeSigned(() => { deliveries += 10; });
  mesh.subscribeSigned(() => { deliveries += 100; });
  otherGroup.subscribeSigned(() => { deliveries += 1; });

  assert.deepEqual(await sender.sendSigned(location('location-filtered', 0)), { accepted: true });
  assert.deepEqual(await sender.sendSigned({ version: 1, type: 'location' } as unknown as SignedCrewLinkEnvelope), { accepted: false });
  await network.drain();
  assert.equal(deliveries, 1);
});

test('signed transport deterministically models duplicate, drop, delay, out-of-order, unavailable, and reconnect', async () => {
  const network = new SignedSimulatedTransportNetwork();
  const sender = new SignedMockCloudTransport(network, { delayTicks: 3 });
  const receiver = new SignedMockCloudTransport(network);
  await sender.startSigned(['ride-transport']);
  await receiver.startSigned(['ride-transport']);

  const delivered: string[] = [];
  receiver.subscribeSigned((message) => { delivered.push((message as SignedCrewLinkEnvelope).messageId); });

  sender.setScenario('duplicate', 'drop', 'out_of_order', 'normal', 'delayed', 'unavailable');
  assert.equal((await sender.sendSigned(location('duplicate', 0))).accepted, true);
  assert.equal((await sender.sendSigned(location('drop', 1))).accepted, false);
  assert.equal((await sender.sendSigned(location('first-held', 2))).accepted, true);
  assert.equal((await sender.sendSigned(location('second-before-held', 3))).accepted, true);
  assert.equal((await sender.sendSigned(location('delayed', 4))).accepted, true);
  assert.equal((await sender.sendSigned(location('unavailable', 5))).accepted, false);
  assert.equal(sender.getState(), 'unavailable');

  await network.drain();
  assert.deepEqual(delivered, ['duplicate', 'second-before-held', 'duplicate', 'first-held', 'delayed']);

  sender.setAvailable(true);
  sender.reconnect();
  assert.equal(sender.getState(), 'connected');
  assert.equal((await sender.sendSigned(location('reconnected', 6))).accepted, true);
  await network.drain();
  assert.equal(delivered[delivered.length - 1], 'reconnected');
});
