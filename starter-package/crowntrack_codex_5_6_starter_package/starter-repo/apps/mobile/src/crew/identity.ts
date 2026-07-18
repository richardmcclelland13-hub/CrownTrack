import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { base64UrlToBytes, bytesToBase64Url, createPairingInvitation, createPublicIdentity, derivePublicKey, pairingAuthenticationCode, resolveIdentityStorageStatus, signBytes, trustedPeerFromInvitation, verifyBytes, verifyPairingInvitation, type CanonicalSigner, type PairingInvitation, type PublicDeviceIdentity, type TrustedPeer } from '@crowntrack/crew-identity';
import { ExpoSqliteCrewRepository } from './repository';
import { createDevelopmentRiderInvitation, DEVELOPMENT_RIDER_SEED } from './development-rider';

const SEED_KEY = 'crowntrack.crew.identity.seed.v1';
const DATABASE_NAME = 'crowntrack-crew.db';
const now = () => new Date().toISOString();
const db = async () => { const { openDatabaseAsync } = await import('expo-sqlite'); return openDatabaseAsync(DATABASE_NAME); };
const idFromBytes = (bytes: Uint8Array) => 'device-' + bytesToBase64Url(bytes).slice(0, 22);
type IdentityRow = { device_id: string; display_name: string; public_key: string; fingerprint: string; created_at: string };
export type NativeIdentityState = { status: 'not_created' | 'ready' | 'missing_private_key' | 'reset_required'; identity?: PublicDeviceIdentity; provider: 'Expo SecureStore' };

const identityFrom = (row: IdentityRow): PublicDeviceIdentity => ({ version: 1, deviceId: row.device_id, displayName: row.display_name, publicKey: row.public_key, fingerprint: row.fingerprint, createdAt: row.created_at });
const initialize = async () => { await new ExpoSqliteCrewRepository().initialize(); return db(); };
const row = async (database: Awaited<ReturnType<typeof db>>) => database.getFirstAsync<IdentityRow>('SELECT device_id, display_name, public_key, fingerprint, created_at FROM crew_identity WHERE id = 1');
const requireSeed = async (): Promise<{ seed: Uint8Array; identity: PublicDeviceIdentity }> => {
  const state = await loadNativeIdentity();
  if (state.status !== 'ready' || !state.identity) throw new Error('Identity is not ready. Create or reset it explicitly.');
  const stored = await SecureStore.getItemAsync(SEED_KEY);
  if (!stored) throw new Error('Identity private key is unavailable.');
  return { seed: base64UrlToBytes(stored), identity: state.identity };
};

export const loadNativeIdentity = async (): Promise<NativeIdentityState> => {
  const database = await initialize();
  const publicRow = await row(database);
  const stored = await SecureStore.getItemAsync(SEED_KEY);
  const publicIdentity = publicRow ? identityFrom(publicRow) : undefined;
  let derivedIdentity: PublicDeviceIdentity | undefined;
  if (stored && publicIdentity) {
    try {
      derivedIdentity = createPublicIdentity(base64UrlToBytes(stored), {
        deviceId: publicIdentity.deviceId,
        displayName: publicIdentity.displayName,
        createdAt: publicIdentity.createdAt,
      });
    } catch {
      return { status: 'reset_required', identity: publicIdentity, provider: 'Expo SecureStore' };
    }
  } else if (stored) {
    return { status: 'reset_required', provider: 'Expo SecureStore' };
  }
  const status = resolveIdentityStorageStatus(publicIdentity, derivedIdentity);
  return { status, identity: publicIdentity, provider: 'Expo SecureStore' };
};

export const createNativeIdentity = async (): Promise<NativeIdentityState> => {
  const before = await loadNativeIdentity();
  if (before.status !== 'not_created') throw new Error('Identity already exists or requires an explicit reset.');
  const seed = Uint8Array.from(await Crypto.getRandomBytesAsync(32));
  const identity = createPublicIdentity(seed, { deviceId: idFromBytes(Uint8Array.from(await Crypto.getRandomBytesAsync(16))), displayName: 'This device', createdAt: now() });
  await SecureStore.setItemAsync(SEED_KEY, bytesToBase64Url(seed), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  try { const database = await initialize(); await database.runAsync('INSERT INTO crew_identity (id, device_id, display_name, public_key, fingerprint, created_at) VALUES (1, ?, ?, ?, ?, ?)', identity.deviceId, identity.displayName, identity.publicKey, identity.fingerprint, identity.createdAt); }
  catch (error) { throw new Error('Identity creation did not complete; reset is required.'); }
  return { status: 'ready', identity, provider: 'Expo SecureStore' };
};

export const resetNativeIdentity = async (): Promise<void> => {
  // The database removal is one transaction; deleting the SecureStore seed is deliberately last so a failed database cleanup remains recoverable.
  try {
    const database = await initialize();
    await database.withExclusiveTransactionAsync(async (tx) => tx.execAsync([
      'DELETE FROM crew_verified_group', 'DELETE FROM crew_pairing_invitation', 'DELETE FROM crew_trusted_peer',
      'DELETE FROM crew_identity', 'DELETE FROM crew_message_rejection',
    ].join('; ')));
  } catch { throw new Error('Local identity/trust cleanup failed; the secure key was retained so reset can be retried.'); }
  try { await SecureStore.deleteItemAsync(SEED_KEY); }
  catch { throw new Error('Identity records were removed but the secure key remains; reset must be retried.'); }
};

const validShape = (value: unknown): value is PairingInvitation => Boolean(value) && typeof value === 'object' && typeof (value as PairingInvitation).invitationId === 'string' && typeof (value as PairingInvitation).signature === 'string' && typeof (value as PairingInvitation).issuer?.publicKey === 'string' && typeof (value as PairingInvitation).expiresAt === 'string';

/** A signing capability only: private seed bytes never cross this module boundary. */
export const nativeCanonicalSigner = async (): Promise<CanonicalSigner> => {
  const { identity } = await requireSeed();
  return {
    publicKey: identity.publicKey,
    sign: async (bytes) => {
      const current = await requireSeed();
      if (current.identity.publicKey !== identity.publicKey) throw new Error('Identity changed while signing.');
      return bytesToBase64Url(signBytes(current.seed, bytes));
    },
  };
};

export const createNativePairingInvitation = async (): Promise<PairingInvitation> => {
  const { seed, identity } = await requireSeed(); const issuedAt = now(); const nonce = bytesToBase64Url(Uint8Array.from(await Crypto.getRandomBytesAsync(16)));
  return createPairingInvitation(seed, { invitationId: 'invite-' + nonce.slice(0, 20), issuedAt, expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(), nonce, issuer: identity });
};

export const stageNativePairingInvitation = async (value: unknown): Promise<{ invitationId: string; code: string; displayName: string }> => {
  if (!validShape(value)) throw new Error('Pairing invitation is malformed.');
  verifyPairingInvitation(value);
  const { identity } = await requireSeed(); const database = await initialize();
  const expiredAt = now();
  await database.runAsync("UPDATE crew_pairing_invitation SET status = 'cancelled', cancelled_at = ?, payload_json = NULL WHERE status = 'staged' AND expires_at <= ?", expiredAt, expiredAt);
  const prior = await database.getFirstAsync<{ status: string }>('SELECT status FROM crew_pairing_invitation WHERE invitation_id = ?', value.invitationId);
  if (prior?.status === 'used' || prior?.status === 'cancelled') throw new Error('Pairing invitation cannot be reused.');
  const peer = await database.getFirstAsync<{ public_key: string; revoked_at: string | null }>('SELECT public_key, revoked_at FROM crew_trusted_peer WHERE device_id = ?', value.issuer.deviceId);
  if (peer && peer.public_key !== value.issuer.publicKey) throw new Error('key_changed');
  if (peer?.revoked_at) throw new Error('A revoked peer requires a new pairing identity.');
  await database.runAsync('INSERT INTO crew_pairing_invitation (invitation_id, issuer_device_id, expires_at, status, payload_json, cancelled_at, used_at) VALUES (?, ?, ?, ?, ?, NULL, NULL) ON CONFLICT(invitation_id) DO UPDATE SET payload_json = excluded.payload_json, status = excluded.status, expires_at = excluded.expires_at', value.invitationId, value.issuer.deviceId, value.expiresAt, 'staged', JSON.stringify(value));
  return { invitationId: value.invitationId, code: pairingAuthenticationCode(value, identity), displayName: value.issuer.displayName };
};

export const inspectNativePairingInvitation = async (invitationId: string) => { const database = await initialize(); return database.getFirstAsync<{ invitation_id: string; status: string; expires_at: string }>('SELECT invitation_id, status, expires_at FROM crew_pairing_invitation WHERE invitation_id = ?', invitationId); };
export const confirmNativePairing = async (invitationId: string): Promise<TrustedPeer> => {
  const database = await initialize(); const staged = await database.getFirstAsync<{ payload_json: string | null; status: string }>('SELECT payload_json, status FROM crew_pairing_invitation WHERE invitation_id = ?', invitationId);
  if (!staged?.payload_json || staged.status !== 'staged') throw new Error('Pairing invitation is not awaiting confirmation.');
  const value = JSON.parse(staged.payload_json) as PairingInvitation; verifyPairingInvitation(value); const peer = trustedPeerFromInvitation(value, now());
  const existing = await database.getFirstAsync<{ public_key: string; revoked_at: string | null }>('SELECT public_key, revoked_at FROM crew_trusted_peer WHERE device_id = ?', peer.deviceId);
  if (existing && existing.public_key !== peer.publicKey) throw new Error('key_changed');
  if (existing?.revoked_at) throw new Error('A revoked peer cannot be restored by an old invitation.');
  await database.withExclusiveTransactionAsync(async (tx) => { await tx.runAsync('INSERT INTO crew_trusted_peer (device_id, display_name, public_key, fingerprint, trusted_at, revoked_at) VALUES (?, ?, ?, ?, ?, NULL) ON CONFLICT(device_id) DO UPDATE SET display_name = excluded.display_name, public_key = excluded.public_key, fingerprint = excluded.fingerprint, trusted_at = excluded.trusted_at, revoked_at = NULL', peer.deviceId, peer.displayName, peer.publicKey, peer.fingerprint, peer.trustedAt); await tx.runAsync('UPDATE crew_pairing_invitation SET status = ?, used_at = ?, payload_json = NULL WHERE invitation_id = ?', 'used', peer.trustedAt, invitationId); });
  return peer;
};
export const cancelNativePairing = async (invitationId: string) => { const database = await initialize(); const result = await database.runAsync('UPDATE crew_pairing_invitation SET status = ?, cancelled_at = ?, payload_json = NULL WHERE invitation_id = ? AND status = ?', 'cancelled', now(), invitationId, 'staged'); if (!result.changes) throw new Error('Pairing invitation is not cancellable.'); };
export const revokeNativePeer = async (deviceId: string) => { const database = await initialize(); const result = await database.runAsync('UPDATE crew_trusted_peer SET revoked_at = ? WHERE device_id = ?', now(), deviceId); if (!result.changes) throw new Error('Trusted peer does not exist.'); };
export const listNativeTrustedPeers = async (): Promise<TrustedPeer[]> => { const database = await initialize(); const rows = await database.getAllAsync<{ deviceId: string; displayName: string; publicKey: string; fingerprint: string; trustedAt: string; revokedAt?: string }>('SELECT device_id AS deviceId, display_name AS displayName, public_key AS publicKey, fingerprint, trusted_at AS trustedAt, revoked_at AS revokedAt FROM crew_trusted_peer ORDER BY trusted_at'); return rows.map((x) => ({ ...x, version: 1, createdAt: x.trustedAt })); };
export const createDevelopmentPairingScenario = async (scenario: 'valid' | 'expired' | 'tampered' | 'malformed' | 'replacement'): Promise<unknown> => {
  if (!__DEV__) throw new Error('Development pairing simulation is unavailable.');
  if (scenario === 'malformed') return { version: 1, type: 'development-malformed' };
  if (scenario === 'valid') {
    const issuedAt = now(); const nonce = bytesToBase64Url(Uint8Array.from(await Crypto.getRandomBytesAsync(16)));
    return createDevelopmentRiderInvitation({ invitationId: 'dev-invite-' + nonce.slice(0, 18), issuedAt, expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(), nonce });
  }
  // Fixed development-only seeds let the local simulator represent the same fake rider across reloads. They are not production identity material.
  const seed = scenario === 'replacement' ? Uint8Array.from({ length: 32 }, (_, index) => 255 - index) : DEVELOPMENT_RIDER_SEED;
  const issuedAt = scenario === 'expired' ? new Date(Date.now() - 20 * 60_000).toISOString() : now();
  const identity = createPublicIdentity(seed, { deviceId: 'development-second-rider', displayName: scenario === 'replacement' ? 'Development Rider — replacement key' : 'Development Rider With A Deliberately Long Display Name', createdAt: issuedAt });
  const nonce = bytesToBase64Url(Uint8Array.from(await Crypto.getRandomBytesAsync(16)));
  const invitation = createPairingInvitation(seed, { invitationId: 'dev-invite-' + nonce.slice(0, 18), issuedAt, expiresAt: scenario === 'expired' ? new Date(Date.now() - 60_000).toISOString() : new Date(Date.now() + 10 * 60_000).toISOString(), nonce, issuer: identity });
  return scenario === 'tampered' ? { ...invitation, expiresAt: new Date(Date.now() + 20 * 60_000).toISOString() } : invitation;
};
export const simulateMissingPrivateKeyForQa = async (): Promise<NativeIdentityState> => { if (!__DEV__) throw new Error('Development identity simulation is unavailable.'); await SecureStore.deleteItemAsync(SEED_KEY); return loadNativeIdentity(); };
export const cryptoProof = async (): Promise<boolean> => { const { seed } = await requireSeed(); const message = Uint8Array.of(67, 84, 3, 65); const signature = signBytes(seed, message); const key = derivePublicKey(seed); return verifyBytes(key, message, signature) && !verifyBytes(key, Uint8Array.of(67, 84, 3, 66), signature) && !verifyBytes(Uint8Array.of(1), message, signature) && !verifyBytes(key, message, Uint8Array.of(1)); };
