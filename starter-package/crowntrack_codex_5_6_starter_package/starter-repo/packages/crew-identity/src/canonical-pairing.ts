import { utf8 } from './encoding';
import type { PairingInvitation, PublicDeviceIdentity } from './schemas';
const identity = (value: PublicDeviceIdentity) => ({ createdAt: value.createdAt, deviceId: value.deviceId, displayName: value.displayName, fingerprint: value.fingerprint, publicKey: value.publicKey, version: value.version });
export const canonicalInvitationPayload = (value: Omit<PairingInvitation, 'signature'>): Uint8Array => utf8(JSON.stringify({ expiresAt: value.expiresAt, invitationId: value.invitationId, issuer: identity(value.issuer), issuedAt: value.issuedAt, nonce: value.nonce, purpose: 'crowntrack-crewlink-pairing', version: value.version }));
export const canonicalPairingTranscript = (invitation: Omit<PairingInvitation, 'signature'>, recipient: PublicDeviceIdentity): string => JSON.stringify({ invitation: new TextDecoder().decode(canonicalInvitationPayload(invitation)), recipient: identity(recipient), purpose: 'crowntrack-crewlink-pairing-transcript' });
