import { publicKeyFromSeed } from './crypto-provider';
import { publicKeyFingerprint } from './fingerprints';
import { IDENTITY_VERSION, type PublicDeviceIdentity } from './schemas';

export type IdentityStorageStatus =
  | 'not_created'
  | 'ready'
  | 'missing_private_key'
  | 'reset_required';

export const createPublicIdentity = (
  seed: Uint8Array,
  fields: Pick<PublicDeviceIdentity, 'deviceId' | 'displayName' | 'createdAt'>,
): PublicDeviceIdentity => {
  const publicKey = publicKeyFromSeed(seed);
  return {
    version: IDENTITY_VERSION,
    ...fields,
    publicKey,
    fingerprint: publicKeyFingerprint(publicKey),
  };
};

export const resolveIdentityStorageStatus = (
  storedPublicIdentity?: PublicDeviceIdentity,
  identityDerivedFromPrivateSeed?: PublicDeviceIdentity,
): IdentityStorageStatus => {
  if (!storedPublicIdentity && !identityDerivedFromPrivateSeed) return 'not_created';
  if (!storedPublicIdentity) return 'reset_required';
  if (!identityDerivedFromPrivateSeed) return 'missing_private_key';
  return storedPublicIdentity.deviceId === identityDerivedFromPrivateSeed.deviceId &&
    storedPublicIdentity.publicKey === identityDerivedFromPrivateSeed.publicKey &&
    storedPublicIdentity.fingerprint === identityDerivedFromPrivateSeed.fingerprint
    ? 'ready'
    : 'reset_required';
};
