import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Share } from 'react-native';
import { validateCrewLinkMessage } from '@crowntrack/crew-protocol';
import { CrewLinkCoordinator, type CrewPeer as StoredPeer, type LocationEnvelope, type StoredSharePolicy, type TransportKind } from '@crowntrack/crewlink';
import { createCrewRepository } from './repository';
import { CrewDevelopmentRuntime } from './developmentRuntime';
import { cancelNativePairing, confirmNativePairing, createDevelopmentPairingScenario, createNativeIdentity, createNativePairingInvitation, cryptoProof, listNativeTrustedPeers, loadNativeIdentity, resetNativeIdentity, revokeNativePeer, simulateMissingPrivateKeyForQa, stageNativePairingInvitation, type NativeIdentityState } from './identity';
import type { PairingInvitation, TrustedPeer } from '@crowntrack/crew-identity';
import { sharingOffPolicy, type CrewPeer, type CrewSnapshot, type LinkState, type LocationSharePolicy, type PresenceState } from './types';

const GROUP = { id: 'sundance-saturday', name: 'Saturday north loop' };
const LOCAL_PEER = { peerId: 'mobile-simulator', displayName: 'This device', deviceId: 'mobile-simulator' };
const transportLabels = { cloud: 'Cloud relay', nearby: 'Nearby phones', mesh_radio: 'External mesh radio' } as const;
const initialSnapshot: CrewSnapshot = { policy: sharingOffPolicy, consentConfirmed: false, peers: [], transports: Object.entries(transportLabels).map(([kind, label]) => ({ kind: kind as 'cloud' | 'nearby' | 'mesh_radio', state: 'unavailable', label })), queuedOutbox: 0, updatedAt: new Date(0).toISOString() };
const developmentPeers: readonly StoredPeer[] = [
  { peerId: 'maya', displayName: 'Maya Chen', deviceId: 'device-maya', vehicle: 'KTM 890 Adventure', addedAt: '2026-07-11T18:00:00.000Z' },
  { peerId: 'jordan', displayName: 'Jordan Ellis', deviceId: 'device-jordan', vehicle: 'Africa Twin', addedAt: '2026-07-11T18:00:00.000Z' },
  { peerId: 'devon', displayName: 'Devon Park', deviceId: 'device-devon', vehicle: 'Ténéré 700', addedAt: '2026-07-11T18:00:00.000Z' },
  { peerId: 'sam', displayName: 'Sam Ortiz', deviceId: 'device-sam', vehicle: 'F 850 GS', addedAt: '2026-07-11T18:00:00.000Z' },
];

const ageLabel = (ageMs?: number) => {
  if (ageMs === undefined) return 'no position received';
  if (ageMs < 60_000) return `${Math.max(1, Math.floor(ageMs / 1_000))} sec ago`;
  return `${Math.floor(ageMs / 60_000)} min ago`;
};

export type CrewDevelopmentModel = ReturnType<typeof useCrewDevelopment>;

export const useCrewDevelopment = () => {
  const repository = useMemo(createCrewRepository, []);
  const runtime = useMemo(() => new CrewDevelopmentRuntime(), []);
  const sequence = useRef(0);
  const ids = useRef(0);
  const coordinator = useMemo(() => new CrewLinkCoordinator({ repository, transports: [], clock: { now: () => new Date() }, ids: { next: () => `mobile-dev-${++ids.current}` } }), [repository]);
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [hydrated, setHydrated] = useState(false);
  const [lastAction, setLastAction] = useState('Simulator ready. No ride group exists.');
  const [revokedPeers, setRevokedPeers] = useState<CrewPeer[]>([]);
  const [identityState, setIdentityState] = useState<NativeIdentityState>({ status: 'not_created', provider: 'Expo SecureStore' });
  const [trustedPeers, setTrustedPeers] = useState<TrustedPeer[]>([]);
  const [pendingPairing, setPendingPairing] = useState<{ invitationId: string; code: string; displayName: string }>();
  const lastDevelopmentInvitation = useRef<PairingInvitation>();

  const refresh = useCallback(async () => {
    const group = await repository.getGroup(GROUP.id);
    const diagnostics = await repository.getDiagnostics();
    if (!group) { setSnapshot({ ...initialSnapshot, diagnostics, updatedAt: new Date().toISOString() }); return; }
    const policy = await repository.getSharePolicy(LOCAL_PEER.peerId);
    const presence = await coordinator.getPresence(group.groupId);
    const peers: CrewPeer[] = await Promise.all(presence.map(async (entry) => {
      const observations = entry.lastPosition ? await repository.listObservations(entry.lastPosition.envelope.messageId) : [];
      return { peerId: entry.peer.peerId, displayName: entry.peer.displayName, vehicle: entry.peer.vehicle ?? 'Vehicle not recorded', presence: entry.state, ageLabel: ageLabel(entry.ageMs), source: observations[0]?.transport, revoked: false };
    }));
    const statuses = await repository.listTransportStatuses();
    const statusByKind = new Map(statuses.map((status) => [status.kind, status]));
    const outbox = await repository.listOutbox();
    setSnapshot({ group: { id: group.groupId, name: group.name }, policy: policy ? { enabled: policy.enabled, groupIds: policy.groupIds, precision: policy.precision, retentionMinutes: policy.retentionMinutes, emergencyOverride: policy.emergencyOverride } : { ...sharingOffPolicy, groupIds: [group.groupId] }, consentConfirmed: policy?.consentConfirmed ?? false, peers: [...peers, ...revokedPeers], transports: (Object.keys(transportLabels) as Array<'cloud' | 'nearby' | 'mesh_radio'>).map((kind) => ({ kind, label: transportLabels[kind], state: statusByKind.get(kind)?.state ?? 'unavailable' })), queuedOutbox: outbox.length, diagnostics, updatedAt: new Date().toISOString() });
  }, [coordinator, repository, revokedPeers]);

  useEffect(() => { let active = true; void repository.initialize().then(async () => { const identity = await loadNativeIdentity(); const peers = await listNativeTrustedPeers(); if (active) { setIdentityState(identity); setTrustedPeers(peers); await refresh(); } }).catch(() => setLastAction('Local CrewLink database could not initialize. Use the development reset path before retrying.')).finally(() => { if (active) setHydrated(true); }); return () => { active = false; }; }, [refresh, repository]);

  const currentPolicy = async (): Promise<StoredSharePolicy> => {
    const policy = await repository.getSharePolicy(LOCAL_PEER.peerId);
    if (!policy) throw new Error('Create a simulator ride group first');
    return policy;
  };
  const savePolicy = async (policy: StoredSharePolicy) => { await coordinator.setSharePolicy(policy); await refresh(); };
  const persistPeerPresence = async (peer: StoredPeer, presence: PresenceState) => {
    await repository.deletePeerData(GROUP.id, peer.peerId);
    await repository.putPeer(peer);
    await repository.putMembership({ groupId: GROUP.id, peerId: peer.peerId, joinedAt: new Date().toISOString() });
    if (presence === 'unknown') return;
    const ageByState = { live: 17_000, recent: 3 * 60_000, stale: 24 * 60_000, unknown: 0 };
    const capturedAt = new Date(Date.now() - ageByState[presence]).toISOString();
    const envelope = validateCrewLinkMessage({ version: 1, type: 'location', messageId: `peer-${peer.peerId}-${++sequence.current}`, groupId: GROUP.id, deviceId: peer.deviceId, streamId: `peer-${peer.peerId}`, sequence: sequence.current, sentAt: new Date().toISOString(), ttlSeconds: 3_600, payload: { latitude: 53.5, longitude: -115.2, accuracyMeters: 8, capturedAt } }, { expectedGroupId: GROUP.id, now: new Date() });
    if (!envelope.success || envelope.message.type !== 'location') throw new Error('Invalid simulator envelope');
    await repository.acceptInbound(envelope.message, new Date().toISOString(), presence === 'live' ? 'cloud' : presence === 'recent' ? 'nearby' : 'mesh_radio');
  };

  const createGroup = () => { void (async () => {
    const createdAt = new Date().toISOString();
    await repository.putGroup({ groupId: GROUP.id, name: GROUP.name, createdAt });
    for (const peer of developmentPeers) { await repository.putPeer(peer); await repository.putMembership({ groupId: GROUP.id, peerId: peer.peerId, joinedAt: createdAt }); }
    await savePolicy({ peerId: LOCAL_PEER.peerId, enabled: false, groupIds: [GROUP.id], precision: 'reduced', retentionMinutes: 120, emergencyOverride: false, consentConfirmed: false, updatedAt: createdAt });
    await persistPeerPresence(developmentPeers[0], 'live');
    await persistPeerPresence(developmentPeers[1], 'recent');
    await persistPeerPresence(developmentPeers[2], 'stale');
    await refresh();
    setLastAction('Development ride group and four local simulator peers were stored in the CrewLink repository.');
  })().catch(() => setLastAction('Could not create the local development group.')); };
  const setPolicy = (patch: Partial<LocationSharePolicy>) => { void currentPolicy().then((policy) => savePolicy({ ...policy, ...patch, enabled: false, consentConfirmed: false, updatedAt: new Date().toISOString() })).then(() => setLastAction('Consent details changed. Confirm them again before sharing.')).catch(() => setLastAction('Could not update local consent.')); };
  const confirmConsent = () => { void currentPolicy().then((policy) => savePolicy({ ...policy, enabled: false, consentConfirmed: !policy.consentConfirmed, updatedAt: new Date().toISOString() })).then(() => setLastAction('Consent acknowledgement stored locally.')).catch(() => setLastAction('Could not update local consent.')); };
  const setSharing = (enabled: boolean) => { void currentPolicy().then((policy) => savePolicy({ ...policy, enabled: enabled && policy.consentConfirmed, updatedAt: new Date().toISOString() })).then(() => setLastAction(enabled ? 'Location sharing enabled for this group only.' : 'Sharing revoked; queued local updates were removed.')).catch(() => setLastAction('Could not change sharing state.')); };
  const setTransport = (kind: 'cloud' | 'nearby' | 'mesh_radio', state: LinkState) => { void (async () => { runtime.setAvailable(kind, state === 'connected'); await repository.putTransportStatus({ kind, state, changedAt: new Date().toISOString() }); if (state === 'connected' && (await currentPolicy()).enabled) for (const item of await repository.listOutbox()) await repository.deleteOutbox(item.envelope.messageId); await refresh(); setLastAction(`${kind.replace('_', ' ')} simulator is ${state}.`); })().catch(() => setLastAction('Could not update transport state.')); };
  const setAllOfflineAndQueue = () => { void (async () => { const policy = await currentPolicy(); if (!policy.enabled || !policy.consentConfirmed) { setLastAction('Enable group-scoped sharing before queueing a development update.'); return; } for (const kind of ['cloud', 'nearby', 'mesh_radio'] as const) { runtime.setAvailable(kind, false); await repository.putTransportStatus({ kind, state: 'unavailable', changedAt: new Date().toISOString() }); } await coordinator.createAndEnqueue(LOCAL_PEER, GROUP.id, 'crew-development', ++sequence.current, { latitude: 53.533, longitude: -115.281, accuracyMeters: 8, capturedAt: new Date().toISOString() }, 120); await refresh(); setLastAction('Offline simulator queued one validated outbound location update in local CrewLink storage.'); })().catch(() => setLastAction('Crew protocol rejected the simulated update.')); };
  const setPeerPresence = (peerId: string, presence: PresenceState) => { void (async () => { const peer = developmentPeers.find((candidate) => candidate.peerId === peerId); if (!peer) throw new Error('Unknown simulator peer'); await persistPeerPresence(peer, presence); await refresh(); setLastAction(`Buddy freshness simulated as ${presence}.`); })().catch(() => setLastAction('Could not update buddy freshness.')); };
  const revokePeer = (peerId: string) => { void (async () => { const peer = snapshot.peers.find((candidate) => candidate.peerId === peerId); await repository.deletePeerData(GROUP.id, peerId); if (peer) setRevokedPeers((current) => [...current.filter((candidate) => candidate.peerId !== peerId), { ...peer, revoked: true }]); await refresh(); setLastAction(`${peer?.displayName ?? 'Peer'} was removed locally and their stored history was deleted.`); })().catch(() => setLastAction('Could not revoke the local peer.')); };
  const safeFailure = (prefix: string, error: unknown) => {
    const detail = error instanceof SyntaxError ? 'Invitation data is malformed.' : error instanceof Error && error.message === 'key_changed' ? 'KEY CHANGED: a known device presented an unexpected key; trust was not changed.' : error instanceof Error ? error.message : 'unknown error';
    setLastAction(`${prefix}: ${detail}`);
  };
  const refreshTrust = async () => setTrustedPeers(await listNativeTrustedPeers());
  const runCryptoProof = () => { void cryptoProof().then((passed) => setLastAction(passed ? 'Native secure-randomness and Ed25519 sign/verify proof passed.' : 'Native cryptography proof did not pass.')).catch((error) => safeFailure('Native cryptography proof could not run', error)); };
  const createIdentity = () => { void createNativeIdentity().then((state) => { setIdentityState(state); setLastAction('Secure device identity created.'); }).catch((error) => safeFailure('Identity creation did not complete', error)); };
  const resetIdentity = () => { void resetNativeIdentity().then(async () => { setIdentityState(await loadNativeIdentity()); setTrustedPeers([]); setPendingPairing(undefined); setLastAction('Identity and local trust were reset.'); }).catch((error) => safeFailure('Identity reset did not complete; retry is required', error)); };
  const shareInvitation = () => { void createNativePairingInvitation().then((invitation) => Share.share({ title: 'CrownTrack pairing invitation', message: JSON.stringify(invitation) })).then(() => setLastAction('Signed invitation opened in the system share sheet.')).catch((error) => safeFailure('Could not create invitation', error)); };
  const importInvitation = (raw: string) => { void (async () => { const staged = await stageNativePairingInvitation(JSON.parse(raw)); setPendingPairing(staged); setLastAction('Signature verified. Compare the code in person before confirming.'); })().catch((error) => safeFailure('Invitation rejected', error)); };
  const confirmPairing = () => { if (!pendingPairing) return; void confirmNativePairing(pendingPairing.invitationId).then(async () => { setPendingPairing(undefined); await refreshTrust(); setLastAction('Pairing explicitly confirmed and trusted peer stored.'); }).catch((error) => safeFailure('Pairing confirmation failed', error)); };
  const cancelPairing = () => { if (!pendingPairing) return; void cancelNativePairing(pendingPairing.invitationId).then(() => { setPendingPairing(undefined); setLastAction('Pending pairing cancelled; no trust was created.'); }).catch((error) => safeFailure('Pairing cancellation failed', error)); };
  const revokeTrustedPeer = (deviceId: string) => { void revokeNativePeer(deviceId).then(async () => { await refreshTrust(); setLastAction('Trusted peer revoked locally.'); }).catch((error) => safeFailure('Peer revocation failed', error)); };
  const runDevelopmentPairingScenario = (scenario: 'valid' | 'expired' | 'tampered' | 'malformed' | 'replay' | 'replacement') => { void (async () => {
    const value = scenario === 'replay' ? lastDevelopmentInvitation.current : await createDevelopmentPairingScenario(scenario);
    if (!value) throw new Error('Create and consume a valid development invitation first.');
    const staged = await stageNativePairingInvitation(value);
    if (scenario === 'valid' || scenario === 'replacement') lastDevelopmentInvitation.current = value as PairingInvitation;
    setPendingPairing(staged);
    setLastAction(`Development-only ${scenario} invitation verified; trust is still pending explicit confirmation.`);
  })().catch((error) => safeFailure(`Development-only ${scenario} scenario`, error)); };
  const simulateMissingPrivateKey = () => { void simulateMissingPrivateKeyForQa().then((state) => { setIdentityState(state); setLastAction('Development-only missing-private-key state active; no replacement identity was created.'); }).catch((error) => safeFailure('Missing-key simulation failed', error)); };
  const deleteAll = () => { void (async () => { await resetNativeIdentity(); await repository.deleteAllCrewData(); setIdentityState(await loadNativeIdentity()); setTrustedPeers([]); setPendingPairing(undefined); setRevokedPeers([]); await refresh(); setLastAction('All local CrewLink data, device identity, trust and pairing state was deleted.'); })().catch((error) => safeFailure('Complete local deletion did not finish; retry is required', error)); };

  return { snapshot, hydrated, lastAction, identityState, trustedPeers, pendingPairing, createIdentity, resetIdentity, shareInvitation, importInvitation, confirmPairing, cancelPairing, revokeTrustedPeer, runDevelopmentPairingScenario, simulateMissingPrivateKey, createGroup, setPolicy, confirmConsent, setSharing, setTransport, setAllOfflineAndQueue, setPeerPresence, revokePeer, runCryptoProof, deleteAll };
};
