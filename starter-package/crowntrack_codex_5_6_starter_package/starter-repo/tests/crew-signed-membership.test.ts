import assert from 'node:assert/strict';
import test from 'node:test';
import { SIGNED_CREWLINK_DOMAIN, SIGNED_CREWLINK_VERSION, canonicalSignedEnvelopeBytes, type UnsignedCrewLinkEnvelope } from '@crowntrack/crew-protocol';
import { createCanonicalSigner, publicKeyFromSeed } from '@crowntrack/crew-identity';
import { InMemorySignedCrewRepository, SignedCrewLinkCoordinator, VerifiedMembershipService } from '@crowntrack/crewlink';

const now = Date.parse('2026-07-13T18:00:00.000Z');
const at = '2026-07-13T17:59:30.000Z';
const ownerSeed = Uint8Array.from({ length: 32 }, (_, index) => index + 1);
const bobSeed = Uint8Array.from({ length: 32 }, (_, index) => index + 33);
const owner = { deviceId: 'owner-device', publicKey: publicKeyFromSeed(ownerSeed) };
const bob = { deviceId: 'bob-device', publicKey: publicKeyFromSeed(bobSeed) };
const fields = (messageId: string, sequence: number) => ({ messageId, streamId: 'stage3b-stream', sequence, sentAt: at, ttlSeconds: 120 });
const location = (epoch: number, messageId = 'signed-location-1', sequence = 1): UnsignedCrewLinkEnvelope => ({
  version: SIGNED_CREWLINK_VERSION, domain: SIGNED_CREWLINK_DOMAIN, type: 'location', groupId: 'ride-stage3b',
  senderDeviceId: bob.deviceId, signerPublicKey: bob.publicKey, membershipEpoch: epoch, ...fields(messageId, sequence),
  payload: { latitude: 53.5, longitude: -115.2, accuracyMeters: 8, capturedAt: at },
});
const ready = async () => {
  const service = new VerifiedMembershipService();
  service.trust(owner); service.trust(bob);
  service.createGroup({ groupId: 'ride-stage3b', authorityDeviceId: owner.deviceId, authorityPublicKey: owner.publicKey, epoch: 1, origin: 'local_owned' });
  const grant = await service.createGrant('ride-stage3b', { ...bob, displayName: 'Bob' }, createCanonicalSigner(ownerSeed), fields('grant-bob', 1));
  const decision = service.decideMembership(grant, now);
  assert.equal(decision.accepted, true);
  if (decision.accepted) service.commitMembership(decision);
  return service;
};

test('canonical bytes normalize omitted optional fields and signatures are deterministic', async () => {
  const unsigned = location(2);
  const text = new TextDecoder().decode(canonicalSignedEnvelopeBytes(unsigned));
  assert.equal(text, '{"domain":"crowntrack-crewlink-signed/v1","groupId":"ride-stage3b","membershipEpoch":2,"messageId":"signed-location-1","senderDeviceId":"bob-device","sentAt":"2026-07-13T17:59:30.000Z","signerPublicKey":"' + bob.publicKey + '","streamId":"stage3b-stream","ttlSeconds":120,"type":"location","version":2,"payload":{"accuracyMeters":8,"capturedAt":"2026-07-13T17:59:30.000Z","latitude":53.5,"longitude":-115.2}}');
  const service = await ready();
  const first = await service.sign(unsigned, createCanonicalSigner(bobSeed));
  const second = await service.sign(unsigned, createCanonicalSigner(bobSeed));
  assert.equal(first.signature, second.signature);
  const firstDecision = service.decide(first, now);
  assert.equal(firstDecision.accepted, true);
  const secondDecision = service.decide(first, now);
  assert.equal(secondDecision.accepted, true, 'validation is side-effect-free before commit');
  if (firstDecision.accepted) service.commitAccepted(firstDecision);
  assert.deepEqual(service.decide(first, now), { accepted: false, reason: 'duplicate' });
});

test('tampering and type substitution fail before acceptance', async () => {
  const service = await ready();
  const signed = await service.sign(location(2), createCanonicalSigner(bobSeed));
  assert.deepEqual(service.decide({ ...signed, payload: { ...signed.payload, latitude: 53.6 } }, now), { accepted: false, reason: 'invalid_signature' });
  assert.deepEqual(service.decide({ ...signed, type: 'ack', payload: { acknowledgedMessageId: signed.messageId, receivedAt: at, status: 'received' } }, now), { accepted: false, reason: 'invalid_signature' });
});

test('membership epoch and revocation block delayed access without partial mutation', async () => {
  const service = await ready();
  const delayed = await service.sign(location(2, 'before-revocation', 2), createCanonicalSigner(bobSeed));
  const member = service.membership('ride-stage3b', bob.deviceId);
  assert.ok(member);
  const revocation = await service.createRevocation('ride-stage3b', member, createCanonicalSigner(ownerSeed), fields('revoke-bob', 3));
  const decision = service.decideMembership(revocation, now);
  assert.equal(decision.accepted, true);
  if (decision.accepted) service.commitMembership(decision);
  assert.deepEqual(service.decide(delayed, now), { accepted: false, reason: 'revoked' });
  assert.deepEqual(service.decideMembership(revocation, now), { accepted: false, reason: 'stale_epoch' });
});

test('trusted is not authorized and a key change is rejected', async () => {
  const service = new VerifiedMembershipService();
  service.trust(owner); service.trust(bob);
  service.createGroup({ groupId: 'ride-stage3b', authorityDeviceId: owner.deviceId, authorityPublicKey: owner.publicKey, epoch: 1, origin: 'local_owned' });
  const trustedOnly = await service.sign(location(1), createCanonicalSigner(bobSeed));
  assert.deepEqual(service.decide(trustedOnly, now), { accepted: false, reason: 'unauthorized_sender' });
  service.trust({ deviceId: bob.deviceId, publicKey: publicKeyFromSeed(Uint8Array.from({ length: 32 }, (_, index) => index + 65)) });
  assert.deepEqual(service.decide(trustedOnly, now), { accepted: false, reason: 'key_changed' });
});

test('signed repository commands revalidate membership, replay, ACK, and scoped deletion', async () => {
  const service = new VerifiedMembershipService();
  service.trust(owner); service.trust(bob);
  service.createGroup({ groupId: 'ride-stage3b', authorityDeviceId: owner.deviceId, authorityPublicKey: owner.publicKey, epoch: 1, origin: 'local_owned' });
  const repository = new InMemorySignedCrewRepository();
  await repository.upsertTrustedDevice(owner); await repository.upsertTrustedDevice(bob);
  assert.equal((await repository.createVerifiedGroup({ group: { groupId: 'ride-stage3b', authorityDeviceId: owner.deviceId, authorityPublicKey: owner.publicKey, epoch: 1, origin: 'local_owned' }, createdAt: at, localDevice: owner })).accepted, true);
  const grant = await service.createGrant('ride-stage3b', { ...bob, displayName: 'Bob' }, createCanonicalSigner(ownerSeed), fields('repository-grant', 1));
  assert.equal((await repository.applySignedMembershipTransition({ envelope: grant, receivedAt: at })).accepted, true);
  if ((service.decideMembership(grant, now)).accepted) service.commitMembership(service.decideMembership(grant, now) as Extract<ReturnType<typeof service.decideMembership>, { accepted: true }>);
  const signed = await service.sign(location(2, 'repository-location', 5), createCanonicalSigner(bobSeed));
  if (signed.type !== 'location') throw new Error('Expected a signed location');
  assert.deepEqual(await repository.acceptVerifiedSignedLocation({ envelope: signed, receivedAt: at, transport: 'simulated' }), { accepted: true, value: 'accepted' });
  assert.deepEqual(await repository.acceptVerifiedSignedLocation({ envelope: signed, receivedAt: at, transport: 'simulated' }), { accepted: true, value: 'duplicate' });
  assert.equal((await repository.listSignedObservations(signed.messageId)).length, 2);
  assert.equal((await repository.enqueueSignedLocation({ envelope: signed, ownerDeviceId: bob.deviceId, state: 'queued', attempts: 0, nextAttemptAt: at, sentVia: [] })).accepted, true);
  const forgedAck = { ...signed, type: 'ack' as const, payload: { acknowledgedMessageId: signed.messageId, receivedAt: at, status: 'received' as const } };
  assert.equal((await repository.acceptVerifiedSignedAck({ envelope: forgedAck, receivedAt: at })).accepted, false);
  assert.ok(await repository.getSignedOutbox(signed.messageId));
  await repository.deleteSignedGroupData('ride-stage3b');
  assert.equal(await repository.getVerifiedGroup('ride-stage3b'), undefined);
  assert.equal((await repository.listSignedObservations(signed.messageId)).length, 0);
});

test('v2 coordinator queues only verified signed locations and records malformed transport input', async () => {
  const repository = new InMemorySignedCrewRepository() as InMemorySignedCrewRepository & { getSharePolicy(peerId: string): Promise<{ peerId: string; enabled: boolean; groupIds: string[]; precision: 'exact'; retentionMinutes: number; emergencyOverride: false; consentConfirmed: true; updatedAt: string } | undefined> };
  repository.getSharePolicy = async (peerId) => peerId === owner.deviceId ? { peerId, enabled: true, groupIds: ['ride-stage3b'], precision: 'exact', retentionMinutes: 15, emergencyOverride: false, consentConfirmed: true, updatedAt: at } : undefined;
  await repository.upsertTrustedDevice(owner);
  assert.equal((await repository.createVerifiedGroup({ group: { groupId: 'ride-stage3b', authorityDeviceId: owner.deviceId, authorityPublicKey: owner.publicKey, epoch: 1, origin: 'local_owned' }, createdAt: at, localDevice: owner })).accepted, true);
  const sent: unknown[] = [];
  const coordinator = new SignedCrewLinkCoordinator({
    repository, signer: createCanonicalSigner(ownerSeed), localDeviceId: owner.deviceId,
    clock: { now: () => new Date(now) }, ids: { next: () => 'coordinator-location-1' },
    transports: [{ kind: 'simulated', sendSigned: async (message) => { sent.push(message); return { accepted: true }; }, subscribeSigned: () => () => undefined }],
  });
  await coordinator.start();
  const message = await coordinator.createAndEnqueue('ride-stage3b', 'owner-stream', { latitude: 53.5, longitude: -115.2, capturedAt: at }, 120);
  assert.equal(message.version, 2);
  await coordinator.flushOutbox();
  assert.equal(sent.length, 1);
  await coordinator.receive({ version: 1, type: 'location' }, 'simulated');
  assert.equal((await repository.listSignedRejections())[0]?.reason, 'malformed_v2_envelope');
  await coordinator.stop();
});


test('owner grants require a paired target and bootstrap an imported group only once', async () => {
  const ownerRepository = new InMemorySignedCrewRepository() as InMemorySignedCrewRepository & { getSharePolicy(peerId: string): Promise<undefined> };
  ownerRepository.getSharePolicy = async () => undefined;
  await ownerRepository.upsertTrustedDevice(owner); await ownerRepository.upsertTrustedDevice(bob);
  const ownerCoordinator = new SignedCrewLinkCoordinator({ repository: ownerRepository, signer: createCanonicalSigner(ownerSeed), localDeviceId: owner.deviceId, clock: { now: () => new Date(now) }, ids: { next: () => 'owner-grant-1' }, transports: [] });
  await ownerCoordinator.start(); await ownerCoordinator.createVerifiedGroup('ride-imported');
  const grant = await ownerCoordinator.createAndApplyMembershipGrant('ride-imported', { ...bob, displayName: 'Bob' });
  const recipient = new InMemorySignedCrewRepository();
  await recipient.upsertTrustedDevice(owner);
  assert.equal((await recipient.bootstrapImportedGroup({ envelope: grant, receivedAt: at, localDevice: bob })).accepted, true);
  assert.equal((await recipient.getVerifiedGroup('ride-imported'))?.origin, 'imported');
  assert.equal((await recipient.bootstrapImportedGroup({ envelope: grant, receivedAt: at, localDevice: bob })).accepted, false);
  await ownerCoordinator.stop();

  const unpaired = new InMemorySignedCrewRepository() as InMemorySignedCrewRepository & { getSharePolicy(peerId: string): Promise<undefined> };
  unpaired.getSharePolicy = async () => undefined; await unpaired.upsertTrustedDevice(owner);
  const coordinator = new SignedCrewLinkCoordinator({ repository: unpaired, signer: createCanonicalSigner(ownerSeed), localDeviceId: owner.deviceId, clock: { now: () => new Date(now) }, ids: { next: () => 'unpaired' }, transports: [] });
  await coordinator.createVerifiedGroup('ride-unpaired');
  await assert.rejects(() => coordinator.createAndApplyMembershipGrant('ride-unpaired', { ...bob, displayName: 'Bob' }), /paired, trusted target/);
});


test('membership transitions require the deterministic authority stream and strictly increase it', async () => {
  const repository = new InMemorySignedCrewRepository();
  const service = new VerifiedMembershipService();
  service.trust(owner); service.trust(bob);
  await repository.upsertTrustedDevice(owner); await repository.upsertTrustedDevice(bob);
  assert.equal((await repository.createVerifiedGroup({ group: { groupId: 'ride-stream', authorityDeviceId: owner.deviceId, authorityPublicKey: owner.publicKey, epoch: 1, origin: 'local_owned' }, createdAt: at, localDevice: owner })).accepted, true);
  service.createGroup({ groupId: 'ride-stream', authorityDeviceId: owner.deviceId, authorityPublicKey: owner.publicKey, epoch: 1, origin: 'local_owned' });
  const grant = await service.createGrant('ride-stream', { ...bob, displayName: 'Bob' }, createCanonicalSigner(ownerSeed), { ...fields('stream-grant', 7), streamId: 'ignored-by-authoring' });
  assert.equal(grant.streamId, `membership-${owner.deviceId}`);
  assert.equal((await repository.applySignedMembershipTransition({ envelope: grant, receivedAt: at })).accepted, true);
  const { signature: _signature, ...unsigned } = grant;
  const changedStream = await service.sign({ ...unsigned, messageId: 'stream-reset', streamId: 'membership-reset', sequence: 8, membershipEpoch: 3, payload: { ...grant.payload, grantedEpoch: 3 } }, createCanonicalSigner(ownerSeed));
  assert.equal((await repository.applySignedMembershipTransition({ envelope: changedStream, receivedAt: at })).accepted, false);
  const equalSequence = await service.sign({ ...unsigned, messageId: 'stream-equal', sequence: 7, membershipEpoch: 3, payload: { ...grant.payload, grantedEpoch: 3 } }, createCanonicalSigner(ownerSeed));
  assert.equal((await repository.applySignedMembershipTransition({ envelope: equalSequence, receivedAt: at })).accepted, false);
  assert.equal((await repository.getVerifiedGroup('ride-stream'))?.epoch, 2);
});

test('local signed sequences are scoped to group lifecycle and restart at zero after deletion', async () => {
  const repository = new InMemorySignedCrewRepository();
  const command = { group: { groupId: 'ride-delete-sequences', authorityDeviceId: owner.deviceId, authorityPublicKey: owner.publicKey, epoch: 1, origin: 'local_owned' as const }, createdAt: at, localDevice: owner };
  assert.equal((await repository.createVerifiedGroup(command)).accepted, true);
  assert.equal(await repository.allocateLocalSignedSequence(command.group.groupId, owner.deviceId, 'locations-a', at), 0);
  assert.equal(await repository.allocateLocalSignedSequence(command.group.groupId, owner.deviceId, 'acks-a', at), 0);
  assert.equal(await repository.allocateLocalSignedSequence(command.group.groupId, owner.deviceId, 'locations-a', at), 1);
  await repository.deleteSignedGroupData(command.group.groupId);
  assert.equal((await repository.createVerifiedGroup(command)).accepted, true);
  assert.equal(await repository.allocateLocalSignedSequence(command.group.groupId, owner.deviceId, 'locations-a', at), 0);
  assert.equal(await repository.allocateLocalSignedSequence(command.group.groupId, owner.deviceId, 'acks-a', at), 0);
});

test('imported authority revocation blocks later membership mutation while a trusted authority can revoke', async () => {
  const ownerRepository = new InMemorySignedCrewRepository() as InMemorySignedCrewRepository & { getSharePolicy(peerId: string): Promise<undefined> };
  ownerRepository.getSharePolicy = async () => undefined;
  await ownerRepository.upsertTrustedDevice(owner); await ownerRepository.upsertTrustedDevice(bob);
  const ownerCoordinator = new SignedCrewLinkCoordinator({ repository: ownerRepository, signer: createCanonicalSigner(ownerSeed), localDeviceId: owner.deviceId, clock: { now: () => new Date(now) }, ids: { next: (() => { let i = 0; return () => `imported-${i++}`; })() }, transports: [] });
  await ownerCoordinator.createVerifiedGroup('ride-import-authority');
  const grant = await ownerCoordinator.createAndApplyMembershipGrant('ride-import-authority', { ...bob, displayName: 'Bob' });
  const trustedRecipient = new InMemorySignedCrewRepository();
  await trustedRecipient.upsertTrustedDevice(owner);
  assert.equal((await trustedRecipient.bootstrapImportedGroup({ envelope: grant, receivedAt: at, localDevice: bob })).accepted, true);
  const revocation = await ownerCoordinator.createAndApplyMembershipRevocation('ride-import-authority', bob.deviceId);
  assert.equal((await trustedRecipient.applySignedMembershipTransition({ envelope: revocation, receivedAt: at })).accepted, true);
  const revokedRecipient = new InMemorySignedCrewRepository();
  await revokedRecipient.upsertTrustedDevice(owner);
  assert.equal((await revokedRecipient.bootstrapImportedGroup({ envelope: grant, receivedAt: at, localDevice: bob })).accepted, true);
  await revokedRecipient.upsertTrustedDevice({ ...owner, revokedAt: at });
  assert.equal((await revokedRecipient.applySignedMembershipTransition({ envelope: revocation, receivedAt: at })).accepted, false);
  assert.equal((await revokedRecipient.getVerifiedGroup('ride-import-authority'))?.epoch, 2);
});
