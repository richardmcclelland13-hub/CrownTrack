import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CrewIdentityError,
  createPairingInvitation,
  createPublicIdentity,
  InMemoryCrewIdentityRepository,
  PairingService,
  pairingAuthenticationCode,
  resolveIdentityStorageStatus,
  verifyPairingInvitation,
  type PairingInvitation,
} from '@crowntrack/crew-identity';

const seedA = Uint8Array.from({ length: 32 }, (_, index) => index + 1);
const seedB = Uint8Array.from({ length: 32 }, (_, index) => 32 - index);
const seedC = Uint8Array.from({ length: 32 }, (_, index) => (index + 7) % 32);
const issuer = createPublicIdentity(seedA, {
  deviceId: 'device-a',
  displayName: 'A',
  createdAt: '2026-07-12T00:00:00.000Z',
});
const recipient = createPublicIdentity(seedB, {
  deviceId: 'device-b',
  displayName: 'B',
  createdAt: '2026-07-12T00:00:00.000Z',
});
const now = () => new Date('2026-07-12T00:01:00.000Z');
const invitation = (invitationId = 'invite-1', signingSeed = seedA, invitationIssuer = issuer) =>
  createPairingInvitation(signingSeed, {
    invitationId,
    issuedAt: '2026-07-12T00:00:00.000Z',
    expiresAt: '2026-07-12T00:10:00.000Z',
    nonce: `nonce-${invitationId}`,
    issuer: invitationIssuer,
  });
const hasCode = (code: CrewIdentityError['code']) => (error: unknown) =>
  error instanceof CrewIdentityError && error.code === code;

test('Ed25519 pairing invitation verifies canonically and authentication codes agree', () => {
  const value = invitation();
  verifyPairingInvitation(value, now());
  assert.match(pairingAuthenticationCode(value, recipient), /^\d{6}$/);
  assert.equal(pairingAuthenticationCode(value, recipient), pairingAuthenticationCode(value, recipient));
});

test('modified, expired, malformed and invalid-time invitations fail safely', () => {
  const value = invitation();
  assert.throws(() => verifyPairingInvitation({ ...value, nonce: 'changed' }, now()));
  assert.throws(() =>
    verifyPairingInvitation({ ...value, expiresAt: '2026-07-11T00:00:00.000Z' }, now()),
  );
  assert.throws(() => verifyPairingInvitation({ ...value, signature: 'bad' } as PairingInvitation, now()));

  const invalidIssuedAt = createPairingInvitation(seedA, {
    invitationId: 'invalid-issued-at',
    issuedAt: 'not-a-date',
    expiresAt: '2026-07-12T00:10:00.000Z',
    nonce: 'invalid-issued-at',
    issuer,
  });
  const invalidExpiresAt = createPairingInvitation(seedA, {
    invitationId: 'invalid-expires-at',
    issuedAt: '2026-07-12T00:00:00.000Z',
    expiresAt: 'not-a-date',
    nonce: 'invalid-expires-at',
    issuer,
  });
  const reversedInterval = createPairingInvitation(seedA, {
    invitationId: 'reversed-interval',
    issuedAt: '2026-07-12T00:10:00.000Z',
    expiresAt: '2026-07-12T00:00:00.000Z',
    nonce: 'reversed-interval',
    issuer,
  });
  assert.throws(() => verifyPairingInvitation(invalidIssuedAt, now()), hasCode('invalid_input'));
  assert.throws(() => verifyPairingInvitation(invalidExpiresAt, now()), hasCode('invalid_input'));
  assert.throws(() => verifyPairingInvitation(reversedInterval, now()), hasCode('invalid_input'));
});

test('validation creates no trust, does not consume, and confirmation is explicit', async () => {
  const repository = new InMemoryCrewIdentityRepository();
  const service = new PairingService(repository, recipient, now);
  const value = invitation();

  const staged = await service.stage(value);
  assert.match(staged.authenticationCode, /^\d{6}$/);
  assert.equal((await repository.listTrustedPeers()).length, 0);
  assert.equal((await repository.getInvitation(value.invitationId))?.usedAt, undefined);

  const trusted = await service.confirm(value.invitationId);
  assert.equal(trusted.deviceId, issuer.deviceId);
  assert.equal((await repository.listTrustedPeers()).length, 1);
  assert.ok((await repository.getInvitation(value.invitationId))?.usedAt);
  await assert.rejects(() => service.stage(value), hasCode('replayed'));
});

test('cancellation creates no trust and persists across a service restart', async () => {
  const repository = new InMemoryCrewIdentityRepository();
  const value = invitation('invite-cancel');
  await new PairingService(repository, recipient, now).stage(value);
  await new PairingService(repository, recipient, now).cancel(value.invitationId);

  assert.equal((await repository.listTrustedPeers()).length, 0);
  assert.ok((await repository.getInvitation(value.invitationId))?.cancelledAt);
  await assert.rejects(
    () => new PairingService(repository, recipient, now).stage(value),
    hasCode('cancelled'),
  );
});

test('pending confirmation does not auto-confirm after a service restart', async () => {
  const repository = new InMemoryCrewIdentityRepository();
  const value = invitation('invite-pending');
  await new PairingService(repository, recipient, now).stage(value);

  const restarted = new PairingService(repository, recipient, now);
  assert.equal((await repository.listTrustedPeers()).length, 0);
  assert.equal((await repository.getInvitation(value.invitationId))?.usedAt, undefined);
  await restarted.confirm(value.invitationId);
  assert.equal((await repository.listTrustedPeers()).length, 1);
});

test('revocation persists and an old invitation cannot restore trust', async () => {
  const repository = new InMemoryCrewIdentityRepository();
  const service = new PairingService(repository, recipient, now);
  const first = invitation('invite-revoke');
  await service.stage(first);
  await service.confirm(first.invitationId);
  await service.revoke(issuer.deviceId);

  const restarted = new PairingService(repository, recipient, now);
  assert.ok((await repository.getTrustedPeer(issuer.deviceId))?.revokedAt);
  await assert.rejects(() => restarted.stage(invitation('invite-after-revoke')), hasCode('cancelled'));
  assert.ok((await repository.getTrustedPeer(issuer.deviceId))?.revokedAt);
});

test('an unexpected key for a known device becomes key_changed without creating trust', async () => {
  const repository = new InMemoryCrewIdentityRepository();
  await repository.putTrustedPeer({ ...issuer, trustedAt: '2026-07-12T00:00:30.000Z' });
  const replacement = createPublicIdentity(seedC, {
    deviceId: issuer.deviceId,
    displayName: issuer.displayName,
    createdAt: issuer.createdAt,
  });
  const value = invitation('invite-replacement', seedC, replacement);

  await assert.rejects(
    () => new PairingService(repository, recipient, now).stage(value),
    hasCode('key_changed'),
  );
  assert.equal((await repository.listTrustedPeers()).length, 1);
  assert.equal((await repository.getInvitation(value.invitationId)), undefined);
});

test('identity storage status never auto-creates or silently replaces a missing key', () => {
  assert.equal(resolveIdentityStorageStatus(), 'not_created');
  assert.equal(resolveIdentityStorageStatus(issuer), 'missing_private_key');
  assert.equal(resolveIdentityStorageStatus(undefined, issuer), 'reset_required');
  assert.equal(resolveIdentityStorageStatus(issuer, issuer), 'ready');
  assert.equal(resolveIdentityStorageStatus(issuer, recipient), 'reset_required');
  assert.equal('seed' in issuer, false);
  assert.doesNotMatch(JSON.stringify(issuer), /private|seed/i);
});

test('identity startup is empty, explicit creation persists, and complete deletion clears metadata', async () => {
  const repository = new InMemoryCrewIdentityRepository();
  await repository.initialize();
  assert.equal(await repository.getLocalIdentity(), undefined);

  await repository.putLocalIdentity(issuer);
  await repository.putTrustedPeer({ ...recipient, trustedAt: '2026-07-12T00:01:00.000Z' });
  await repository.putInvitation(invitation('invite-delete'));
  assert.equal((await repository.getLocalIdentity())?.fingerprint, issuer.fingerprint);

  await repository.deleteIdentityAndTrust();
  assert.equal(await repository.getLocalIdentity(), undefined);
  assert.equal((await repository.listTrustedPeers()).length, 0);
  assert.equal(await repository.getInvitation('invite-delete'), undefined);
});
