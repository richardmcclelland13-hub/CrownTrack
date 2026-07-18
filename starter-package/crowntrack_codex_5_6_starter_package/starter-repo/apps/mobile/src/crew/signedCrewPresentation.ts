import type { SignedDevelopmentSafeSnapshot } from '@crowntrack/crewlink';

export type SignedCrewActionGate = { enabled: boolean; reason?: string };
export type SignedCrewPresentation = {
  summary: string;
  localFingerprint: string;
  group: SignedDevelopmentSafeSnapshot['group'];
  membership: SignedDevelopmentSafeSnapshot['remoteMembership'];
  tombstonePresent: boolean;
  freshness: SignedDevelopmentSafeSnapshot['latestLocation'];
  revokedLastKnown: boolean;
  localPairingConfirmed: boolean;
  reciprocalTrust: boolean;
  policy: SignedDevelopmentSafeSnapshot['policy'];
  transports: SignedDevelopmentSafeSnapshot['transportStates'];
  outbox: SignedDevelopmentSafeSnapshot['outbox'];
  lastAckOutcome: SignedDevelopmentSafeSnapshot['lastAckOutcome'];
  lastInboundOutcome: SignedDevelopmentSafeSnapshot['lastInboundOutcome'];
  duplicateObservationCount: number;
  lastRejectionCategory: string;
  diagnostics: SignedDevelopmentSafeSnapshot['diagnostics'];
  capabilities: SignedDevelopmentSafeSnapshot['capabilities'];
  actionGates: Record<'grant' | 'sharing' | 'queue' | 'inbound' | 'duplicate' | 'forgedAck' | 'tamper' | 'revoke' | 'oldEpoch' | 'reload' | 'delete', SignedCrewActionGate>;
};

const gate = (enabled: boolean, reason: string): SignedCrewActionGate => enabled ? { enabled } : { enabled, reason };

/** Pure UI mapper: it consumes the safe snapshot only, never protocol state. */
export const presentSignedCrew = (snapshot: SignedDevelopmentSafeSnapshot): SignedCrewPresentation => {
  const active = snapshot.remoteMembership === 'active';
  const sharing = snapshot.policy.sharingEnabled && snapshot.policy.consentConfirmed;
  const revokedLastKnown = Boolean(snapshot.latestLocation?.lastKnownRevoked);
  const freshness = snapshot.latestLocation;
  return {
    localFingerprint: snapshot.localFingerprint, group: snapshot.group, membership: snapshot.remoteMembership, tombstonePresent: snapshot.tombstonePresent, freshness, revokedLastKnown, localPairingConfirmed: snapshot.localPairingConfirmed, reciprocalTrust: snapshot.reciprocalTrust, policy: snapshot.policy, transports: snapshot.transportStates, outbox: snapshot.outbox, lastAckOutcome: snapshot.lastAckOutcome, lastInboundOutcome: snapshot.lastInboundOutcome, duplicateObservationCount: snapshot.duplicateObservationCount, lastRejectionCategory: snapshot.lastRejectionCategory, diagnostics: snapshot.diagnostics, capabilities: snapshot.capabilities,
    summary: revokedLastKnown ? 'LAST KNOWN — REVOKED' : freshness ? `${freshness.freshness.toUpperCase()} · ${Math.max(0, Math.floor(freshness.ageMs / 1000))} sec ago` : 'No usable buddy position',
    actionGates: {
      grant: gate(Boolean(snapshot.group?.owner && snapshot.localPairingConfirmed && snapshot.reciprocalTrust && snapshot.remoteMembership === 'unauthorized'), 'Grant requires owner group, confirmed pairing, reciprocal trust, and an unauthorized rider.'),
      sharing: gate(active && snapshot.policy.consentConfirmed, 'Sharing requires active membership and confirmed consent.'),
      queue: gate(active && sharing, 'Queueing requires active membership and enabled sharing.'),
      inbound: gate(active && !revokedLastKnown, 'Inbound buddy delivery requires an active, non-revoked development rider.'),
      duplicate: gate(snapshot.capabilities.canDeliverDuplicate, 'Duplicate delivery requires a retained accepted update and nearby transport.'),
      forgedAck: gate(snapshot.capabilities.canRunForgedAck, 'Forged-ACK testing requires a second queued local outbound update.'),
      tamper: gate(snapshot.capabilities.canRunTamper, 'Tamper testing requires a retained accepted inbound buddy update.'),
      revoke: gate(snapshot.capabilities.canRevoke, 'Revocation requires an active rider.'),
      oldEpoch: gate(snapshot.capabilities.canDeliverOldEpoch, 'Old-epoch delivery requires a revoked retained update.'),
      reload: gate(snapshot.capabilities.canReconstruct, 'Reload requires an existing local signed group.'),
      delete: gate(snapshot.capabilities.canDeleteSignedState, 'Complete deletion requires locally stored signed CrewLink state.'),
    },
  };
};
