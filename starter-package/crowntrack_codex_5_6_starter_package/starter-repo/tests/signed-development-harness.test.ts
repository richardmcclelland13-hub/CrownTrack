import assert from 'node:assert/strict';
import test from 'node:test';
import { CREWLINK_MIGRATIONS, createDeterministicHarnessIdentity, NATIVE_POLICY_MIN_RETENTION_MINUTES, SignedDevelopmentHarness } from '@crowntrack/crewlink';

const fix = { latitude: 53.51234, longitude: -115.23456, accuracyMeters: 4, capturedAt: '2026-07-13T17:59:30.000Z' };
const makeHarness = async () => {
  const local = createDeterministicHarnessIdentity(Uint8Array.from({ length: 32 }, (_, i) => i + 1), 'harness-local', 'Harness Local');
  let id = 0;
  const harness = new SignedDevelopmentHarness({ local, ids: { next: () => `harness-${++id}` }, localPairingConfirmed: async () => true });
  await harness.start(); await harness.createLocalGroup(); await harness.setTransportAvailable('cloud', true);
  await harness.refreshConfirmedLocalPairing(); await harness.confirmReciprocalDevelopmentTrust(); await harness.grantRemote();
  await harness.configureLocalPolicy('reduced', 15); await harness.setLocalConsent(true); await harness.setLocalSharing(true);
  return harness;
};

test('signed harness cloud-only happy path and deterministic ACK drain', async () => {
  const harness = await makeHarness();
  const queued = await harness.queueLocation(fix);
  assert.notEqual(queued.payload.latitude, fix.latitude);
  assert.equal(harness.localNearby.getState(), 'unavailable');
  assert.equal(harness.localMesh.getState(), 'unavailable');
  await harness.flushCloud();
  assert.equal((await harness.localRepository.listSignedOutbox()).length, 0);
  assert.equal((await harness.remoteRepository.listSignedLatestPositions('development-ride')).length, 1);
  assert.equal((await harness.remoteRepository.listSignedObservations(queued.messageId)).every(x => x.transport === 'cloud'), true);
  assert.equal((await harness.safeSnapshot()).latestLocation, undefined, 'a local outbound update is never presented as a buddy position');
  await harness.stop();
});

test('reciprocal trust and grant work when the native runtime lacks structuredClone', async (t) => {
  const original = globalThis.structuredClone;
  Object.defineProperty(globalThis, 'structuredClone', { configurable: true, value: undefined, writable: true });
  t.after(() => Object.defineProperty(globalThis, 'structuredClone', { configurable: true, value: original, writable: true }));
  const local = createDeterministicHarnessIdentity(Uint8Array.from({ length: 32 }, (_, i) => i + 1), 'native-clone-local', 'Native Clone Local');
  const harness = new SignedDevelopmentHarness({ local, ids: { next: () => `native-clone-${Date.now()}` }, localPairingConfirmed: async () => true });
  await harness.start();
  await harness.createLocalGroup();
  await harness.refreshConfirmedLocalPairing();
  assert.equal((await harness.safeSnapshot()).reciprocalTrust, false);
  await harness.confirmReciprocalDevelopmentTrust();
  assert.equal((await harness.safeSnapshot()).reciprocalTrust, true);
  await harness.grantRemote();
  const safe = await harness.safeSnapshot();
  assert.equal(safe.group?.epoch, 2);
  assert.equal(safe.remoteMembership, 'active');
  await harness.stop();
});

test('fresh runtime restores confirmed local trust before reciprocal grant', async () => {
  const local = createDeterministicHarnessIdentity(Uint8Array.from({ length: 32 }, (_, i) => i + 1), 'rehydrated-trust-local', 'Rehydrated Trust Local');
  const initial = new SignedDevelopmentHarness({ local, ids: { next: () => `rehydrated-initial-${Date.now()}` }, localPairingConfirmed: async () => true });
  await initial.start();
  await initial.createLocalGroup();
  await initial.refreshConfirmedLocalPairing();
  await initial.stop();

  const reconstructed = new SignedDevelopmentHarness({ local, localRepository: initial.localRepository, ids: { next: () => `rehydrated-reconstructed-${Date.now()}` }, localPairingConfirmed: async () => true });
  await reconstructed.start();
  assert.equal((await reconstructed.safeSnapshot()).localPairingConfirmed, true);
  await reconstructed.confirmReciprocalDevelopmentTrust();
  await reconstructed.grantRemote();
  const safe = await reconstructed.safeSnapshot();
  assert.equal(safe.group?.epoch, 2);
  assert.equal(safe.remoteMembership, 'active');
  await reconstructed.stop();
});

test('signed harness accepts a remote buddy location locally and records a nearby duplicate', async () => {
  const harness = await makeHarness();
  await harness.deliverRemoteBuddyLocation({ ...fix, capturedAt: new Date().toISOString() }, 'cloud');
  assert.equal(harness.localNearby.getState(), 'unavailable');
  assert.equal((await harness.safeSnapshot()).capabilities.canDeliverDuplicate, true, 'the UI handler establishes nearby transport before delivery');
  await harness.setTransportAvailable('cloud', false); await harness.setTransportAvailable('nearby', true);
  await harness.deliverDuplicateViaNearby();
  const latest = (await harness.localRepository.listSignedLatestPositions('development-ride')).find(x => x.senderDeviceId === harness.remote.deviceId);
  assert.ok(latest);
  const observations = await harness.localRepository.listSignedObservations(latest.messageId);
  assert.equal((await harness.localRepository.listSignedLatestPositions('development-ride')).filter(x => x.senderDeviceId === harness.remote.deviceId).length, 1);
  assert.equal(observations.filter(x => x.duplicate && x.transport === 'nearby').length, 1);
  assert.equal(observations.filter(x => x.transport === 'mesh_radio').length, 0);
  const safe = await harness.safeSnapshot();
  assert.equal(safe.latestLocation?.transport, 'nearby');
  assert.equal(safe.lastInboundOutcome, 'accepted');
  assert.equal(safe.capabilities.canDeliverDuplicate, true);
  await harness.stop();
});

test('signed harness rejects untrusted forged ACK and retains outbox', async () => {
  const harness = await makeHarness(); await harness.queueLocation(fix); await harness.flushCloud();
  await harness.setTransportAvailable('cloud', false);
  const pending = await harness.queueLocation({ ...fix, capturedAt: '2026-07-13T17:59:31.000Z' });
  await harness.injectForgedAck();
  assert.ok(await harness.localRepository.getSignedOutbox(pending.messageId));
  assert.equal((await harness.localRepository.listSignedRejections()).slice(-1)[0]?.reason, 'untrusted_or_revoked_key');
  await harness.stop();
});

test('signed harness rejects tampered location and emits no ACK', async () => {
  const harness = await makeHarness();
  await harness.deliverRemoteBuddyLocation({ ...fix, capturedAt: new Date().toISOString() });
  const latest = (await harness.localRepository.listSignedLatestPositions('development-ride')).find(x => x.senderDeviceId === harness.remote.deviceId);
  assert.ok(latest);
  const ackCount = (await harness.localRepository.exportSignedState()).acknowledgements.length;
  await harness.injectTamperedLocation();
  assert.equal((await harness.localRepository.listSignedLatestPositions('development-ride')).find(x => x.senderDeviceId === harness.remote.deviceId)?.messageId, latest.messageId);
  assert.equal((await harness.localRepository.exportSignedState()).acknowledgements.length, ackCount);
  assert.equal((await harness.localRepository.listSignedRejections())[0]?.reason, 'invalid_signature_or_expired');
  await harness.stop();
});

test('signed harness applies revocation tombstone and rejects delayed old epoch', async () => {
  const harness = await makeHarness();
  await harness.deliverRemoteBuddyLocation({ ...fix, capturedAt: new Date().toISOString() });
  const accepted = (await harness.localRepository.listSignedLatestPositions('development-ride')).find(x => x.senderDeviceId === harness.remote.deviceId);
  assert.ok(accepted);
  await harness.revokeRemote();
  assert.equal((await harness.localRepository.getVerifiedGroup('development-ride'))?.epoch, 3);
  assert.equal((await harness.localRepository.getVerifiedMembership('development-ride', harness.remote.deviceId))?.status, 'revoked');
  assert.ok(await harness.localRepository.getTombstone('development-ride', harness.remote.deviceId));
  const acks = (await harness.localRepository.exportSignedState()).acknowledgements.length;
  await harness.deliverDelayedOldEpochLocation();
  assert.equal((await harness.localRepository.listSignedLatestPositions('development-ride')).find(x => x.senderDeviceId === harness.remote.deviceId)?.messageId, accepted.messageId);
  assert.equal((await harness.localRepository.exportSignedState()).acknowledgements.length, acks);
  assert.equal((await harness.safeSnapshot()).latestLocation?.lastKnownRevoked, true);
  await harness.stop();
});

test('signed harness reconstructs coordinator and hydrates repository state', async () => {
  const harness = await makeHarness(); await harness.localCoordinator.start();
  const queued = await harness.queueLocation(fix); await harness.flushCloud();
  assert.equal((await harness.remoteRepository.listSignedObservations(queued.messageId)).length, 1);
  await harness.revokeRemote();
  await harness.reconstructLocalCoordinator(); await harness.reconstructLocalCoordinator();
  assert.equal((await harness.localRepository.getVerifiedGroup('development-ride'))?.epoch, 3);
  assert.ok(await harness.localRepository.getTombstone('development-ride', harness.remote.deviceId));
  assert.equal((await harness.localRepository.listSignedOutbox()).length, 0);
  await harness.stop();
});

test('signed harness presents the newest rejection after runtime reconstruction', async () => {
  const harness = await makeHarness();
  await harness.localRepository.recordSignedRejection({ reason: 'older_rejection', recordedAt: '2026-07-13T17:59:30.000Z' });
  await harness.localRepository.recordSignedRejection({ reason: 'newest_rejection', recordedAt: '2026-07-13T17:59:31.000Z' });
  await harness.reconstructLocalCoordinator();
  assert.equal((await harness.safeSnapshot()).lastRejectionCategory, 'newest_rejection');
  await harness.stop();
});

test('fresh runtime reconstruction reads authoritative local membership, tombstone, and inbound buddy state', async () => {
  const harness = await makeHarness();
  await harness.deliverRemoteBuddyLocation({ ...fix, capturedAt: new Date().toISOString() }, 'mesh_radio');
  await harness.revokeRemote();
  const reconstructed = new SignedDevelopmentHarness({ local: harness.local, localRepository: harness.localRepository, ids: { next: () => `reconstructed-${Date.now()}` }, localPairingConfirmed: async () => true });
  await reconstructed.start();
  const safe = await reconstructed.safeSnapshot();
  assert.equal(safe.group?.epoch, 3);
  assert.equal(safe.remoteMembership, 'revoked');
  assert.equal(safe.tombstonePresent, true);
  assert.equal(safe.latestLocation?.lastKnownRevoked, true);
  assert.equal(safe.latestLocation?.transport, 'mesh_radio');
  await reconstructed.stop();
  await harness.stop();
});

test('safe buddy freshness uses the injected clock and accepted inbound capture time', async () => {
  let now = Date.parse('2026-07-16T12:00:00.000Z');
  const local = createDeterministicHarnessIdentity(Uint8Array.from({ length: 32 }, (_, i) => i + 1), 'clock-local', 'Clock Local');
  const harness = new SignedDevelopmentHarness({ local, clock: { now: () => new Date(now) }, ids: { next: () => `clock-${++now}` }, localPairingConfirmed: async () => true });
  await harness.start(); await harness.createLocalGroup(); await harness.refreshConfirmedLocalPairing(); await harness.confirmReciprocalDevelopmentTrust(); await harness.grantRemote();
  await harness.configureLocalPolicy('reduced', 15); await harness.setLocalConsent(true); await harness.setLocalSharing(true);
  const capturedAt = new Date(now).toISOString();
  await harness.deliverRemoteBuddyLocation({ latitude: 53.512, longitude: -115.235, accuracyMeters: 120, capturedAt });
  assert.equal((await harness.safeSnapshot()).latestLocation?.freshness, 'live');
  now += 61_000;
  assert.equal((await harness.safeSnapshot()).latestLocation?.freshness, 'recent');
  now += 240_001;
  assert.equal((await harness.safeSnapshot()).latestLocation?.freshness, 'stale');
  await harness.stop();
});

test('signed harness deletion clears all harness-owned signed state and safe outcomes', async () => {
  const harness = await makeHarness(); await harness.queueLocation(fix); await harness.flushCloud(); await harness.revokeRemote();
  await harness.deleteHarnessSignedState();
  assert.equal((await harness.localRepository.listVerifiedGroups()).length, 0);
  assert.equal((await harness.remoteRepository.listVerifiedGroups()).length, 0);
  assert.equal((await harness.localRepository.listSignedOutbox()).length, 0);
  const safe = await harness.safeSnapshot();
  assert.equal(safe.diagnostics.locations, 0); assert.equal(safe.diagnostics.tombstones, 0); assert.equal(safe.lastAckOutcome, 'none');
  await harness.stop();
});

test('native deletion fallback uses the persisted policy retention minimum', () => {
  assert.equal(NATIVE_POLICY_MIN_RETENTION_MINUTES, 5);
  assert.match(CREWLINK_MIGRATIONS[0].statements.join('\n'), /retention_minutes >= 5/);
});

test('signed retry race rejects stale metadata after consent changes', async () => {
  const harness = await makeHarness(); await harness.setTransportAvailable('cloud', false);
  const queued = await harness.queueLocation(fix);
  await harness.setTransportAvailable('cloud', true);
  harness.setRetryRace(async () => { await harness.setLocalConsent(false); });
  await harness.flushCloud();
  assert.equal(await harness.localRepository.getSignedOutbox(queued.messageId), undefined);
  assert.equal((await harness.localRepository.listSignedOutbox()).length, 0);
  assert.equal((await harness.localRepository.listSignedRejections()).some(x => x.reason === 'retry_authorization_lost'), true);
  await harness.stop();
});

test('signed safe snapshot contains no secrets raw frames or exact coordinates', async () => {
  const harness = await makeHarness(); await harness.queueLocation(fix); await harness.flushCloud();
  const serialized = JSON.stringify(await harness.safeSnapshot()).toLowerCase();
  for (const forbidden of ['latitude', 'longitude', 'signature', 'private', 'publickey', 'envelope', 'invitation', String(fix.latitude), String(fix.longitude)]) assert.equal(serialized.includes(forbidden.toLowerCase()), false, forbidden);
  await harness.stop();
});
