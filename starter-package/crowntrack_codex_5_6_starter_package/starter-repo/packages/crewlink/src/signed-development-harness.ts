import { createCanonicalSigner, type CanonicalSigner } from '@crowntrack/crew-identity';
import { SIGNED_CREWLINK_DOMAIN, SIGNED_CREWLINK_VERSION, canonicalSignedEnvelopeBytes, parseSignedCrewLinkEnvelope, type SignedCrewLinkAck, type SignedCrewLinkLocation } from '@crowntrack/crew-protocol';
import type { Clock, IdGenerator, LocationFix, StoredSharePolicy, TransportKind } from './entities';
import { SignedCrewLinkCoordinator, type SignedCoordinatorRepository } from './signed-coordinator';
import { InMemorySignedCrewRepository, type SignedOutboxItem } from './signed-repository';
import { SignedMockCloudTransport, SignedMockMeshRadioTransport, SignedMockNearbyTransport, SignedSimulatedTransportNetwork } from './signed-simulated-transports';
import { clone } from './clone';

export const DEVELOPMENT_RIDER_LABEL = 'In-process development rider — not a physical phone';
export const DEVELOPMENT_RIDER = { deviceId: 'development-second-rider', displayName: 'Development Rider With A Deliberately Long Display Name' };
/** The SQLite schema forbids a zero-minute policy, including during deletion cleanup. */
export const NATIVE_POLICY_MIN_RETENTION_MINUTES = 5;
export type SignedHarnessIdentity = { deviceId: string; displayName: string; signer: CanonicalSigner; fingerprint?: string };
export type SignedDevelopmentMembershipState = 'unauthorized' | 'active' | 'revoked';
export type SignedDevelopmentFreshness = 'live' | 'recent' | 'stale' | 'unknown';
export interface SignedDevelopmentScenarioCapabilities { canDeliverDuplicate: boolean; canRunForgedAck: boolean; canRunTamper: boolean; canRevoke: boolean; canDeliverOldEpoch: boolean; canReconstruct: boolean; canDeleteSignedState: boolean; }
export interface SignedDevelopmentSafeSnapshot {
  identityReady: boolean; localFingerprint: string; group?: { exists: true; origin: 'local_owned' | 'imported'; epoch: number; owner: boolean };
  localPairingConfirmed: boolean; reciprocalTrust: boolean; remoteMembership: SignedDevelopmentMembershipState; tombstonePresent: boolean;
  policy: { precision: 'exact' | 'reduced'; retentionMinutes: number; consentConfirmed: boolean; sharingEnabled: boolean };
  transportStates: { cloud: string; nearby: string; mesh_radio: string }; outbox: { count: number; state: string };
  lastAckOutcome: 'none' | 'accepted' | 'rejected'; lastInboundOutcome: 'none' | 'accepted' | 'duplicate' | 'rejected'; duplicateObservationCount: number; lastRejectionCategory: string;
  latestLocation?: { exists: true; ageMs: number; freshness: SignedDevelopmentFreshness; transport: string; lastKnownRevoked: boolean };
  diagnostics: { groups: number; memberships: number; tombstones: number; acknowledgements: number; locations: number }; capabilities: SignedDevelopmentScenarioCapabilities;
}
export type SignedRuntimeHarnessRepository = SignedCoordinatorRepository & { putSharePolicy?: (policy: StoredSharePolicy) => Promise<void> };
export type SignedDevelopmentHarnessOptions = {
  local: SignedHarnessIdentity; remote?: SignedHarnessIdentity; localRepository?: SignedRuntimeHarnessRepository;
  clock?: Clock; ids?: IdGenerator; localPairingConfirmed: () => Promise<boolean>;
};

/** In-memory adapter adds the retry-time policy check that the native transaction already has. */
class HarnessRepository extends InMemorySignedCrewRepository implements SignedCoordinatorRepository {
  private readonly policies = new Map<string, StoredSharePolicy>();
  async getSharePolicy(peerId: string) { const policy = this.policies.get(peerId); return policy && clone(policy); }
  async putSharePolicy(policy: StoredSharePolicy) { this.policies.set(policy.peerId, clone(policy)); }
  async clearSharePolicy(peerId: string) { this.policies.delete(peerId); }
  async updateSignedOutboxAttempt(item: SignedOutboxItem) {
    const policy = await this.getSharePolicy(item.ownerDeviceId);
    if (!policy || !policy.enabled || !policy.consentConfirmed || policy.emergencyOverride || !policy.groupIds.includes(item.envelope.groupId)) {
      await this.purgeSignedOutbox(item.ownerDeviceId, item.envelope.groupId);
      return { accepted: false as const, reason: 'retry_authorization_lost' };
    }
    return super.updateSignedOutboxAttempt(item);
  }
}

/** Platform-neutral signed two-endpoint development harness. No Expo, React Native, or UI imports. */
export class SignedDevelopmentHarness {
  readonly network = new SignedSimulatedTransportNetwork();
  readonly localRepository: SignedRuntimeHarnessRepository;
  readonly remoteRepository = new HarnessRepository();
  readonly localCloud = new SignedMockCloudTransport(this.network);
  readonly localNearby = new SignedMockNearbyTransport(this.network);
  readonly localMesh = new SignedMockMeshRadioTransport(this.network);
  readonly remoteCloud = new SignedMockCloudTransport(this.network);
  readonly remoteNearby = new SignedMockNearbyTransport(this.network);
  readonly remoteMesh = new SignedMockMeshRadioTransport(this.network);
  readonly local: SignedHarnessIdentity;
  readonly remote: SignedHarnessIdentity;
  localCoordinator: SignedCrewLinkCoordinator;
  readonly remoteCoordinator: SignedCrewLinkCoordinator;
  private readonly pairingConfirmed: () => Promise<boolean>;
  private readonly clock: Clock;
  private readonly ids: IdGenerator;
  private groupId?: string;
  private localTrust = false;
  private reciprocalTrust = false;
  /** Local outbound messages are retained only for local queue/ACK scenarios. */
  private firstOutbound?: SignedCrewLinkLocation;
  private secondOutbound?: SignedCrewLinkLocation;
  /** Volatile simulation input only; local repository state remains presentation authority. */
  private latestInboundCandidate?: SignedCrewLinkLocation;
  private latestGrant?: unknown;
  private latestRevocation?: unknown;
  private lastAckOutcome: 'none' | 'accepted' | 'rejected' = 'none';
  private lastInboundOutcome: 'none' | 'accepted' | 'duplicate' | 'rejected' = 'none';
  private lastRejectionCategory?: string;
  private retryRace?: () => Promise<void> | void;

  constructor(options: SignedDevelopmentHarnessOptions) {
    this.local = options.local;
    this.localRepository = options.localRepository ?? new HarnessRepository();
    const remoteSeed = Uint8Array.from({ length: 32 }, (_, i) => i + 101);
    this.remote = options.remote ?? { ...DEVELOPMENT_RIDER, signer: createCanonicalSigner(remoteSeed), fingerprint: 'dev-remote' };
    this.clock = options.clock ?? { now: () => new Date() };
    this.ids = options.ids ?? { next: () => { if (!globalThis.crypto?.randomUUID) throw new Error('Secure ID generation is unavailable'); return globalThis.crypto.randomUUID(); } };
    this.pairingConfirmed = options.localPairingConfirmed;
    this.localCoordinator = this.createLocalCoordinator();
    this.remoteCoordinator = new SignedCrewLinkCoordinator({ repository: this.remoteRepository, transports: [this.remoteCloud, this.remoteNearby, this.remoteMesh], signer: this.remote.signer, localDeviceId: this.remote.deviceId, clock: this.clock, ids: this.ids });
  }

  private createLocalCoordinator() {
    return new SignedCrewLinkCoordinator({
      repository: this.localRepository, transports: [this.localCloud, this.localNearby, this.localMesh],
      signer: this.local.signer, localDeviceId: this.local.deviceId, clock: this.clock, ids: this.ids,
      beforeRetryCommit: async () => this.retryRace?.(),
    });
  }
  private endpoints(kind: TransportKind) {
    if (kind === 'cloud') return [this.localCloud, this.remoteCloud] as const;
    if (kind === 'nearby') return [this.localNearby, this.remoteNearby] as const;
    return [this.localMesh, this.remoteMesh] as const;
  }
  private async policy(): Promise<StoredSharePolicy | undefined> { return this.localRepository.getSharePolicy(this.local.deviceId); }
  private async writePolicy(next: Partial<StoredSharePolicy>) {
    if (!this.groupId || !this.localRepository.putSharePolicy) throw new Error('Signed policy storage is unavailable');
    const current = await this.policy();
    await this.localRepository.putSharePolicy({
      peerId: this.local.deviceId, enabled: current?.enabled ?? false, groupIds: [this.groupId],
      precision: current?.precision ?? 'exact', retentionMinutes: current?.retentionMinutes ?? 15,
      emergencyOverride: false, consentConfirmed: current?.consentConfirmed ?? false, updatedAt: this.clock.now().toISOString(), ...next,
    });
  }
  private async purgeForDisabledPolicy() {
    const policy = await this.policy();
    if (!policy?.enabled || !policy.consentConfirmed) await this.localRepository.purgeSignedOutbox(this.local.deviceId, this.groupId);
  }

  async start(groupId = 'development-ride') {
    this.groupId = groupId;
    if (this.localRepository instanceof HarnessRepository) await this.localRepository.upsertTrustedDevice({ deviceId: this.local.deviceId, publicKey: this.local.signer.publicKey });
    const persistedPairing = await this.localRepository.getTrustedDevice(this.remote.deviceId);
    this.localTrust = Boolean((await this.pairingConfirmed()) && persistedPairing && !persistedPairing.revokedAt && persistedPairing.publicKey === this.remote.signer.publicKey);
    await this.localCoordinator.start(); await this.remoteCoordinator.start();
    for (const t of [this.localCloud, this.localNearby, this.localMesh, this.remoteCloud, this.remoteNearby, this.remoteMesh]) await t.startSigned([groupId]);
    await this.setAllTransportsOffline();
  }
  async stop() {
    await this.localCoordinator.stop(); await this.remoteCoordinator.stop();
    for (const t of [this.localCloud, this.localNearby, this.localMesh, this.remoteCloud, this.remoteNearby, this.remoteMesh]) await t.stopSigned();
  }
  async reconstructLocalCoordinator() { await this.localCoordinator.stop(); this.localCoordinator = this.createLocalCoordinator(); await this.localCoordinator.start(); }
  async setTransportAvailable(kind: 'cloud' | 'nearby' | 'mesh_radio', available: boolean) { for (const t of this.endpoints(kind)) t.setAvailable(available); }
  async setAllTransportsOffline() { await this.setTransportAvailable('cloud', false); await this.setTransportAvailable('nearby', false); await this.setTransportAvailable('mesh_radio', false); }
  async setAllOffline(value = true) { if (value) return this.setAllTransportsOffline(); for (const k of ['cloud', 'nearby', 'mesh_radio'] as const) await this.setTransportAvailable(k, true); }
  async createLocalGroup() { if (!this.groupId) throw new Error('Harness is not started'); return this.localCoordinator.createVerifiedGroup(this.groupId); }
  async refreshConfirmedLocalPairing() {
    if (!(await this.pairingConfirmed())) throw new Error('Local pairing was not explicitly confirmed');
    const existing = await this.localRepository.getTrustedDevice(this.remote.deviceId);
    if (!(this.localRepository instanceof HarnessRepository) && (!existing || existing.revokedAt || existing.publicKey !== this.remote.signer.publicKey)) throw new Error('Confirmed pairing key does not match the development rider.');
    await this.localRepository.upsertTrustedDevice({ deviceId: this.remote.deviceId, publicKey: this.remote.signer.publicKey }); this.localTrust = true;
  }
  async confirmReciprocalDevelopmentTrust() { await this.remoteRepository.upsertTrustedDevice({ deviceId: this.local.deviceId, publicKey: this.local.signer.publicKey }); this.reciprocalTrust = true; }
  async grantRemote() {
    if (!this.groupId || !this.localTrust || !this.reciprocalTrust) throw new Error('Bilateral trust is required before a grant');
    const grant = await this.localCoordinator.createAndApplyMembershipGrant(this.groupId, { deviceId: this.remote.deviceId, publicKey: this.remote.signer.publicKey, displayName: this.remote.displayName });
    this.latestGrant = grant;
    await this.setTransportAvailable('cloud', true);
    await this.localCloud.sendSigned(grant);
    await this.network.drain();
    return grant;
  }
  async configureLocalPolicy(precision: 'exact' | 'reduced', retentionMinutes = 15) {
    const old = await this.policy();
    const changed = Boolean(old && (old.precision !== precision || old.retentionMinutes !== retentionMinutes));
    await this.writePolicy({ precision, retentionMinutes, enabled: changed ? false : old?.enabled ?? false, consentConfirmed: changed ? false : old?.consentConfirmed ?? false });
    if (changed) await this.purgeForDisabledPolicy();
  }
  async setLocalConsent(confirmed: boolean) { await this.writePolicy({ consentConfirmed: confirmed, enabled: confirmed ? (await this.policy())?.enabled ?? false : false }); await this.purgeForDisabledPolicy(); }
  async setLocalSharing(enabled: boolean) { const policy = await this.policy(); if (enabled && !policy?.consentConfirmed) throw new Error('Confirmed consent is required before sharing.'); await this.writePolicy({ enabled }); await this.purgeForDisabledPolicy(); }
  async setLocalPolicy(precision: 'exact' | 'reduced', enabled = true) { await this.configureLocalPolicy(precision); await this.setLocalConsent(true); await this.setLocalSharing(enabled); }
  async queueLocation(fix: LocationFix) {
    if (!this.groupId) throw new Error('No group');
    const queued = await this.localCoordinator.createAndEnqueue(this.groupId, 'location-' + this.local.deviceId, fix, 120);
    if (!this.firstOutbound) this.firstOutbound = queued; else this.secondOutbound = queued;
    return queued;
  }
  /** Delivers a development-rider message to the local endpoint through one simulated transport. */
  async deliverRemoteBuddyLocation(fix: LocationFix, transport: 'cloud' | 'nearby' | 'mesh_radio' = 'cloud') {
    if (!this.groupId || !this.remoteRepository.putSharePolicy) throw new Error('Development rider is not ready for signed delivery.');
    await this.setAllTransportsOffline();
    await this.setTransportAvailable(transport, true);
    await this.remoteRepository.upsertTrustedDevice({ deviceId: this.remote.deviceId, publicKey: this.remote.signer.publicKey });
    await this.remoteRepository.putSharePolicy({ peerId: this.remote.deviceId, enabled: true, groupIds: [this.groupId], precision: 'reduced', retentionMinutes: 15, emergencyOverride: false, consentConfirmed: true, updatedAt: this.clock.now().toISOString() });
    const outbound = await this.remoteCoordinator.createAndEnqueue(this.groupId, `location-${this.remote.deviceId}`, fix, 120);
    this.latestInboundCandidate = outbound;
    await this.remoteCoordinator.flushOutbox();
    await this.network.drain();
    const accepted = (await this.localRepository.listSignedLatestPositions(this.groupId)).some((position) => position.messageId === outbound.messageId && position.senderDeviceId === this.remote.deviceId);
    this.lastInboundOutcome = accepted ? 'accepted' : 'rejected';
  }
  async flushCloud() {
    await this.setTransportAvailable('nearby', false); await this.setTransportAvailable('mesh_radio', false);
    const beforeAcks = (await this.localRepository.exportSignedState()).acknowledgements.length;
    const beforeOutbox = (await this.localRepository.listSignedOutbox()).length;
    await this.localCoordinator.flushOutbox(); await this.network.drain();
    const afterAcks = (await this.localRepository.exportSignedState()).acknowledgements.length;
    this.lastAckOutcome = afterAcks > beforeAcks ? 'accepted' : beforeOutbox > 0 ? 'rejected' : 'none';
  }
  async deliverDuplicateViaNearby() {
    if (!this.latestInboundCandidate) throw new Error('No retained accepted inbound buddy location.');
    await this.remoteNearby.sendSigned(this.latestInboundCandidate); await this.network.drain(); this.lastInboundOutcome = 'duplicate';
  }
  async injectForgedAck() {
    if (!this.groupId || !this.secondOutbound) throw new Error('Queue a second location before forged-ACK testing.');
    const attacker = createCanonicalSigner(Uint8Array.from({ length: 32 }, (_, i) => i + 201));
    const unsigned = { version: SIGNED_CREWLINK_VERSION, domain: SIGNED_CREWLINK_DOMAIN, type: 'ack' as const, messageId: 'attacker-forged-ack', groupId: this.groupId, senderDeviceId: 'untrusted-development-attacker', signerPublicKey: attacker.publicKey, streamId: 'ack-untrusted-development-attacker', sequence: 0, membershipEpoch: 2, sentAt: this.clock.now().toISOString(), ttlSeconds: 120, payload: { acknowledgedMessageId: this.secondOutbound.messageId, receivedAt: this.clock.now().toISOString(), status: 'received' as const } };
    const forged = parseSignedCrewLinkEnvelope({ ...unsigned, signature: await attacker.sign(canonicalSignedEnvelopeBytes(unsigned)) }) as SignedCrewLinkAck;
    await this.localCoordinator.receive(forged, 'cloud'); this.lastAckOutcome = 'rejected'; this.lastRejectionCategory = 'untrusted_or_revoked_key';
  }
  async injectTamperedLocation() {
    if (!this.latestInboundCandidate) throw new Error('No retained accepted inbound buddy location.');
    const tampered = { ...this.latestInboundCandidate, payload: { ...this.latestInboundCandidate.payload, accuracyMeters: (this.latestInboundCandidate.payload.accuracyMeters ?? 0) + 1 } };
    await this.localCoordinator.receive(tampered, 'cloud'); this.lastInboundOutcome = 'rejected'; this.lastRejectionCategory = 'invalid_signature_or_expired';
  }
  async revokeRemote() {
    if (!this.groupId) throw new Error('No group');
    const revocation = await this.localCoordinator.createAndApplyMembershipRevocation(this.groupId, this.remote.deviceId);
    this.latestRevocation = revocation;
    await this.setTransportAvailable('cloud', true);
    await this.localCloud.sendSigned(revocation);
    await this.network.drain();
    return revocation;
  }
  async deliverDelayedOldEpochLocation() {
    if (!this.latestInboundCandidate) throw new Error('No retained accepted inbound buddy location.');
    await this.localCoordinator.receive(this.latestInboundCandidate, 'cloud'); this.lastInboundOutcome = 'rejected'; this.lastRejectionCategory = 'stale_or_future_epoch';
  }
  setRetryRace(action?: () => Promise<void> | void) { this.retryRace = action; }
  async deleteHarnessSignedState() {
    if (this.groupId) { await this.localRepository.deleteSignedGroupData(this.groupId); await this.remoteRepository.deleteSignedGroupData(this.groupId); }
    if (this.localRepository instanceof HarnessRepository) await this.localRepository.clearSharePolicy(this.local.deviceId);
    else if (this.localRepository.putSharePolicy) await this.localRepository.putSharePolicy({ peerId: this.local.deviceId, enabled: false, groupIds: [], precision: 'exact', retentionMinutes: NATIVE_POLICY_MIN_RETENTION_MINUTES, emergencyOverride: false, consentConfirmed: false, updatedAt: this.clock.now().toISOString() });
    this.firstOutbound = undefined; this.secondOutbound = undefined; this.latestInboundCandidate = undefined; this.latestGrant = undefined; this.latestRevocation = undefined;
    this.lastAckOutcome = 'none'; this.lastInboundOutcome = 'none'; this.lastRejectionCategory = undefined; this.localTrust = false; this.reciprocalTrust = false; this.retryRace = undefined;
  }
  async safeSnapshot(): Promise<SignedDevelopmentSafeSnapshot> {
    const group = this.groupId ? await this.localRepository.getVerifiedGroup(this.groupId) : undefined;
    const remote = this.groupId ? await this.localRepository.getVerifiedMembership(this.groupId, this.remote.deviceId) : undefined;
    const tombstone = this.groupId ? await this.localRepository.getTombstone(this.groupId, this.remote.deviceId) : undefined;
    const policy = await this.policy(); const outbox = await this.localRepository.listSignedOutbox();
    const latest = this.groupId ? (await this.localRepository.listSignedLatestPositions(this.groupId)).find(position => position.senderDeviceId === this.remote.deviceId) : undefined;
    const duplicateCount = latest ? (await this.localRepository.listSignedObservations(latest.messageId)).filter(x => x.duplicate).length : 0;
    const rejections = await this.localRepository.listSignedRejections();
    const latestRejection = rejections[rejections.length - 1];
    const latestObservations = latest ? await this.localRepository.listSignedObservations(latest.messageId) : [];
    const exported = await this.localRepository.exportSignedState();
    const persistedPairing = await this.localRepository.getTrustedDevice(this.remote.deviceId);
    const latestObservedAt = latestObservations[latestObservations.length - 1]?.observedAt;
    const capturedAt = latest?.payload.capturedAt;
    const ageMs = capturedAt ? Math.max(0, this.clock.now().getTime() - Date.parse(capturedAt)) : undefined;
    const freshness: SignedDevelopmentFreshness = ageMs === undefined ? 'unknown' : ageMs <= 60_000 ? 'live' : ageMs <= 300_000 ? 'recent' : 'stale';
    const lastKnownRevoked = Boolean(tombstone || remote?.status === 'revoked');
    return {
      identityReady: Boolean(this.local.signer), localFingerprint: this.local.fingerprint ?? 'unavailable',
      group: group && { exists: true, origin: group.origin, epoch: group.epoch, owner: group.authorityDeviceId === this.local.deviceId },
      localPairingConfirmed: Boolean(persistedPairing && !persistedPairing.revokedAt && persistedPairing.publicKey === this.remote.signer.publicKey), reciprocalTrust: this.reciprocalTrust, remoteMembership: remote?.status ?? 'unauthorized', tombstonePresent: Boolean(tombstone),
      policy: { precision: policy?.precision ?? 'exact', retentionMinutes: policy?.retentionMinutes ?? 0, consentConfirmed: Boolean(policy?.consentConfirmed), sharingEnabled: Boolean(policy?.enabled) },
      transportStates: { cloud: this.localCloud.getState(), nearby: this.localNearby.getState(), mesh_radio: this.localMesh.getState() },
      outbox: { count: outbox.length, state: outbox[0]?.state ?? 'empty' }, lastAckOutcome: exported.acknowledgements.length ? 'accepted' : this.lastAckOutcome, lastInboundOutcome: latest ? 'accepted' : this.lastInboundOutcome,
      duplicateObservationCount: duplicateCount, lastRejectionCategory: this.lastRejectionCategory ?? latestRejection?.reason ?? 'none',
      latestLocation: latest && { exists: true, ageMs: ageMs ?? 0, freshness: lastKnownRevoked ? 'stale' : freshness, transport: latestObservedAt ? latestObservations[latestObservations.length - 1]?.transport ?? 'unknown' : 'unknown', lastKnownRevoked },
      diagnostics: { groups: exported.groups.length, memberships: exported.memberships.length, tombstones: exported.tombstones.length, acknowledgements: exported.acknowledgements.length, locations: exported.locations.length },
      capabilities: { canDeliverDuplicate: Boolean(this.latestInboundCandidate) && !lastKnownRevoked, canRunForgedAck: Boolean(this.secondOutbound), canRunTamper: Boolean(this.latestInboundCandidate), canRevoke: remote?.status === 'active', canDeliverOldEpoch: Boolean(this.latestInboundCandidate && lastKnownRevoked), canReconstruct: Boolean(group), canDeleteSignedState: Boolean(group) },
    };
  }
}
export const createDeterministicHarnessIdentity = (seed: Uint8Array, deviceId: string, displayName: string): SignedHarnessIdentity => ({ deviceId, displayName, signer: createCanonicalSigner(seed), fingerprint: deviceId.slice(0, 12) });
