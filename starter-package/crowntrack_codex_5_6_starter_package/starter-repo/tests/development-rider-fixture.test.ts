import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCanonicalSigner, verifyPairingInvitation } from '@crowntrack/crew-identity';
import { createDevelopmentRiderInvitation, DEVELOPMENT_RIDER_DEVICE_ID, DEVELOPMENT_RIDER_SEED } from '../apps/mobile/src/crew/development-rider';

test('development pairing fixture is the signed inbound rider, never the local device', () => {
  const invitation = createDevelopmentRiderInvitation({ invitationId: 'dev-invite-contract', nonce: 'nonce-contract', issuedAt: '2026-07-16T12:00:00.000Z', expiresAt: '2026-07-16T12:10:00.000Z' });
  verifyPairingInvitation(invitation, new Date('2026-07-16T12:01:00.000Z'));
  assert.equal(invitation.issuer.deviceId, DEVELOPMENT_RIDER_DEVICE_ID);
  assert.equal(invitation.issuer.publicKey, createCanonicalSigner(DEVELOPMENT_RIDER_SEED).publicKey);
});
