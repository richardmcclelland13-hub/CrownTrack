import { canonicalInvitationPayload, canonicalPairingTranscript } from './canonical-pairing';
import { signBase64Url, verifyBase64Url } from './crypto-provider';
import { authenticationCode } from './fingerprints';
import { CrewIdentityError } from './errors';
import type { PairingInvitation, PublicDeviceIdentity, TrustedPeer } from './schemas';

export const createPairingInvitation = (
  seed: Uint8Array,
  value: Omit<PairingInvitation, 'version' | 'signature'>,
): PairingInvitation => {
  const unsigned = { version: 1 as const, ...value };
  return { ...unsigned, signature: signBase64Url(seed, canonicalInvitationPayload(unsigned)) };
};

export const verifyPairingInvitation = (value: PairingInvitation, now = new Date()): void => {
  const issuedAt = Date.parse(value.issuedAt);
  const expiresAt = Date.parse(value.expiresAt);
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt) || expiresAt <= issuedAt) {
    throw new CrewIdentityError('invalid_input', 'Pairing invitation timestamps are invalid');
  }
  if (expiresAt <= now.getTime()) {
    throw new CrewIdentityError('expired', 'Pairing invitation has expired');
  }
  if (issuedAt > now.getTime() + 120_000) {
    throw new CrewIdentityError('invalid_input', 'Pairing invitation is from the future');
  }
  const { signature, ...unsigned } = value;
  if (!verifyBase64Url(value.issuer.publicKey, canonicalInvitationPayload(unsigned), signature)) {
    throw new CrewIdentityError('invalid_signature', 'Pairing invitation signature is invalid');
  }
};

export const pairingAuthenticationCode = (
  value: PairingInvitation,
  recipient: PublicDeviceIdentity,
): string => {
  const { signature: _signature, ...unsigned } = value;
  return authenticationCode(canonicalPairingTranscript(unsigned, recipient));
};

export const trustedPeerFromInvitation = (
  value: PairingInvitation,
  trustedAt: string,
): TrustedPeer => ({ ...value.issuer, trustedAt });
