import * as Crypto from 'expo-crypto';
import { createCanonicalSigner } from '@crowntrack/crew-identity';
import { SignedDevelopmentHarness, type LocationFix, type SignedDevelopmentSafeSnapshot } from '@crowntrack/crewlink';
import { createSignedRuntimeRepository } from './repository';
import { cryptoProof, loadNativeIdentity, nativeCanonicalSigner, simulateMissingPrivateKeyForQa } from './identity';
import { DEVELOPMENT_RIDER_DEVICE_ID, DEVELOPMENT_RIDER_SEED } from './development-rider';

export type SignedDevelopmentRuntimeActions = {
  start: () => Promise<void>; stop: () => Promise<void>; reconstructLocalCoordinator: () => Promise<void>; refreshConfirmedLocalPairing: () => Promise<void>; confirmReciprocalDevelopmentTrust: () => Promise<void>; createLocalGroup: () => Promise<unknown>; configurePolicy: (precision: 'exact' | 'reduced', retentionMinutes?: number) => Promise<void>; confirmConsent: (confirmed: boolean) => Promise<void>; setSharing: (enabled: boolean) => Promise<void>; setTransportAvailable: (kind: 'cloud' | 'nearby' | 'mesh_radio', available: boolean) => Promise<void>; setAllTransportsOffline: () => Promise<void>; grantDevelopmentRider: () => Promise<unknown>; revokeDevelopmentRider: () => Promise<unknown>; queueLocation: (fix: LocationFix) => Promise<void>; queueDevelopmentLocation: () => Promise<void>; deliverDevelopmentRiderLocation: () => Promise<void>; flushCloud: () => Promise<void>; duplicateViaNearby: () => Promise<void>; injectForgedAck: () => Promise<void>; injectTamperedLocation: () => Promise<void>; deliverDelayedOldEpochLocation: () => Promise<void>; proofNativeCrypto: () => Promise<boolean>; simulateMissingPrivateKey: () => Promise<void>; deleteHarnessSignedState: () => Promise<void>;
};
export type SignedDevelopmentRuntimeFacade = { identity: { deviceId: string; fingerprint: string }; safeSnapshot: () => Promise<SignedDevelopmentSafeSnapshot>; actions: SignedDevelopmentRuntimeActions };

const developmentLocation = (): LocationFix => ({ latitude: 53.533, longitude: -115.281, accuracyMeters: 8, capturedAt: new Date().toISOString() });

/** Development-only native facade; its safe snapshot is the only signed authority consumed by the primary Crew hook. */
export const createSignedDevelopmentRuntime = async (): Promise<SignedDevelopmentRuntimeFacade> => {
  if (!__DEV__) throw new Error('Signed development runtime is unavailable outside development builds');
  const identityState = await loadNativeIdentity();
  if (identityState.status !== 'ready' || !identityState.identity) throw new Error('A ready native identity is required');
  const repository = createSignedRuntimeRepository();
  const signer = await nativeCanonicalSigner();
  const remoteSigner = createCanonicalSigner(DEVELOPMENT_RIDER_SEED);
  const local = { deviceId: identityState.identity.deviceId, displayName: identityState.identity.displayName, signer, fingerprint: identityState.identity.fingerprint };
  const harness = new SignedDevelopmentHarness({
    local,
    localRepository: repository,
    remote: { deviceId: DEVELOPMENT_RIDER_DEVICE_ID, displayName: 'Development Rider With A Deliberately Long Display Name', signer: remoteSigner, fingerprint: 'dev-remote' },
    ids: { next: () => { const id = Crypto.randomUUID(); if (!id) throw new Error('Secure native ID generation failed'); return id; } },
    localPairingConfirmed: async () => { const peer = await repository.getTrustedDevice(DEVELOPMENT_RIDER_DEVICE_ID); return Boolean(peer && !peer.revokedAt && peer.publicKey === remoteSigner.publicKey); },
  });
  return {
    identity: { deviceId: local.deviceId, fingerprint: identityState.identity.fingerprint },
    safeSnapshot: () => harness.safeSnapshot(),
    actions: {
      start: () => harness.start(), stop: () => harness.stop(), reconstructLocalCoordinator: () => harness.reconstructLocalCoordinator(),
      refreshConfirmedLocalPairing: () => harness.refreshConfirmedLocalPairing(), confirmReciprocalDevelopmentTrust: () => harness.confirmReciprocalDevelopmentTrust(), createLocalGroup: () => harness.createLocalGroup(),
      configurePolicy: (precision: 'exact' | 'reduced', retentionMinutes?: number) => harness.configureLocalPolicy(precision, retentionMinutes),
      confirmConsent: (confirmed: boolean) => harness.setLocalConsent(confirmed), setSharing: (enabled: boolean) => harness.setLocalSharing(enabled),
      setTransportAvailable: (kind: 'cloud' | 'nearby' | 'mesh_radio', available: boolean) => harness.setTransportAvailable(kind, available),
      setAllTransportsOffline: () => harness.setAllTransportsOffline(),
      grantDevelopmentRider: () => harness.grantRemote(), revokeDevelopmentRider: () => harness.revokeRemote(),
      queueLocation: async (fix: LocationFix) => { await harness.queueLocation(fix); },
      queueDevelopmentLocation: async () => { await harness.queueLocation(developmentLocation()); },
      deliverDevelopmentRiderLocation: async () => { await harness.deliverRemoteBuddyLocation(developmentLocation()); },
      flushCloud: () => harness.flushCloud(), duplicateViaNearby: () => harness.deliverDuplicateViaNearby(),
      injectForgedAck: () => harness.injectForgedAck(), injectTamperedLocation: () => harness.injectTamperedLocation(),
      deliverDelayedOldEpochLocation: () => harness.deliverDelayedOldEpochLocation(),
      proofNativeCrypto: () => cryptoProof(),
      simulateMissingPrivateKey: async () => { await harness.stop(); await simulateMissingPrivateKeyForQa(); },
      deleteHarnessSignedState: async () => { await harness.stop(); await harness.deleteHarnessSignedState(); await repository.deleteAllSignedCrewData(); await repository.deleteAllCrewData(); },
    },
  };
};
