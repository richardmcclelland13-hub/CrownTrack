import { createPairingInvitation, createPublicIdentity, type PairingInvitation } from '@crowntrack/crew-identity';

/** Development-only public fixture; it is never a local device identity or production key. */
export const DEVELOPMENT_RIDER_DEVICE_ID = 'development-second-rider';
export const DEVELOPMENT_RIDER_SEED = Uint8Array.from({ length: 32 }, (_, index) => index + 101);

export const createDevelopmentRiderInvitation = (input: { invitationId: string; nonce: string; issuedAt: string; expiresAt: string }): PairingInvitation => {
  const issuer = createPublicIdentity(DEVELOPMENT_RIDER_SEED, {
    deviceId: DEVELOPMENT_RIDER_DEVICE_ID,
    displayName: 'Development Rider With A Deliberately Long Display Name',
    createdAt: input.issuedAt,
  });
  return createPairingInvitation(DEVELOPMENT_RIDER_SEED, { ...input, issuer });
};
