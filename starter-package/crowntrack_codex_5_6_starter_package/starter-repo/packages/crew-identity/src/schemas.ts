export const IDENTITY_VERSION = 1 as const;
export type PublicDeviceIdentity = { version: typeof IDENTITY_VERSION; deviceId: string; displayName: string; publicKey: string; fingerprint: string; createdAt: string };
export type PairingInvitation = { version: typeof IDENTITY_VERSION; invitationId: string; issuedAt: string; expiresAt: string; nonce: string; issuer: PublicDeviceIdentity; signature: string };
export type TrustedPeer = PublicDeviceIdentity & { trustedAt: string; revokedAt?: string };
export type StoredInvitation = PairingInvitation & { cancelledAt?: string; usedAt?: string };
