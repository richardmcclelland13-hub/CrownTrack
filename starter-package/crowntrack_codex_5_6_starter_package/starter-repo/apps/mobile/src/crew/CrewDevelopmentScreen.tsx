import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, FieldCard, Panel, PrimaryButton, Screen, SecondaryButton, SectionHeader, StatusChip } from '@crowntrack/ui';
import type { TabKey } from '../screens';
import type { CrewDevelopmentModel } from './useCrewDevelopment';
import type { CrewPeer, PresenceState, TransportStatus } from './types';

type UiTone = 'ready' | 'info' | 'warning' | 'danger' | 'unknown';
const toneForPresence = (presence: PresenceState): UiTone => presence === 'live' ? 'ready' : presence === 'recent' ? 'info' : presence === 'stale' ? 'warning' : 'unknown';
const toneForLink = (state: string): UiTone => state === 'connected' ? 'ready' : state === 'degraded' || state === 'connecting' ? 'warning' : 'unknown';
const sourceLabel = (source?: string) => source ? source.replace('_', ' ') : 'none';

const Choice = ({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) => (
  <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onPress} style={({ pressed }) => [styles.choice, selected && styles.choiceSelected, pressed && styles.pressed]}>
    <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text>
  </Pressable>
);

const DangerButton = ({ children, onPress }: { children: React.ReactNode; onPress: () => void }) => (
  <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.dangerButton, pressed && styles.pressed]}><Text style={styles.dangerButtonText}>{children}</Text></Pressable>
);

const TransportRow = ({ status }: { status: TransportStatus }) => (
  <View style={styles.rowBetween}>
    <View style={styles.flex}>
      <Text style={styles.cardTitleSmall}>{status.label}</Text>
      <Text style={styles.body}>{status.kind === 'mesh_radio' ? 'External hardware path' : status.kind === 'nearby' ? 'Phone-to-phone development path' : 'Internet relay development path'}</Text>
    </View>
    <StatusChip label={status.state.toUpperCase()} tone={toneForLink(status.state)} />
  </View>
);

const BuddyCard = ({ peer, onPresence, onRevoke }: { peer: CrewPeer; onPresence: (state: PresenceState) => void; onRevoke: () => void }) => {
  if (peer.revoked) return <FieldCard style={styles.revokedCard}><View style={styles.rowBetween}><View style={styles.flex}><Text style={styles.cardTitleSmall}>{peer.displayName}</Text><Text style={styles.body}>Removed locally · sharing trust revoked</Text></View><StatusChip label="REVOKED" tone="danger" /></View></FieldCard>;
  return <FieldCard>
    <View style={styles.rowBetween}><View style={styles.flex}><Text style={styles.cardTitle}>{peer.displayName}</Text><Text style={styles.body}>{peer.vehicle}</Text></View><StatusChip label={peer.presence.toUpperCase()} tone={toneForPresence(peer.presence)} /></View>
    <Text style={styles.freshness}>Last update: {peer.ageLabel} · source: {sourceLabel(peer.source)}</Text>
    <Text style={styles.body}>{peer.presence === 'live' ? 'A recent remote position was received.' : peer.presence === 'recent' ? 'Position is aging; do not treat it as live.' : peer.presence === 'stale' ? 'Last known position only; rider may have moved.' : 'No usable buddy position is available.'}</Text>
    <View style={styles.scenarioRow}>
      {(['live', 'recent', 'stale', 'unknown'] as const).map((presence) => <Choice key={presence} label={presence} selected={peer.presence === presence} onPress={() => onPresence(presence)} />)}
    </View>
    <SecondaryButton accessibilityLabel={`Remove and revoke ${peer.displayName}`} onPress={onRevoke}>Remove / revoke peer</SecondaryButton>
  </FieldCard>;
};

export const CrewDevelopmentScreen = ({ onTab, crew }: { onTab: (tab: TabKey) => void; crew: CrewDevelopmentModel }) => {
  const { snapshot } = crew;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const activePeers = snapshot.peers.filter((peer) => !peer.revoked).length;
  return <Screen><ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
    <View style={styles.header}><View style={styles.headerCopy}><Text style={styles.kicker}>CROWNTRACK ADV</Text><Text style={styles.title}>CrewLink</Text></View><StatusChip label="DEVELOPMENT SIMULATOR" tone="unknown" /></View>

    {!snapshot.group ? <FieldCard style={styles.attentionCard}>
      <View style={styles.rowBetween}><View style={styles.flex}><Text style={styles.cardEyebrow}>NO RIDE GROUP</Text><Text style={styles.cardTitle}>Crew sharing is inactive</Text></View><StatusChip label="SHARING OFF" tone="unknown" /></View>
      <Text style={styles.body}>Create a local development group to exercise consent, transport, freshness, and revocation states. Nothing leaves this device.</Text>
      <PrimaryButton onPress={crew.createGroup}>Create simulator ride group</PrimaryButton>
    </FieldCard> : <FieldCard>
      <View style={styles.rowBetween}><View style={styles.flex}><Text style={styles.cardEyebrow}>CURRENT RIDE GROUP</Text><Text style={styles.cardTitle}>{snapshot.group.name}</Text></View><StatusChip label={`${activePeers} PEERS`} tone="info" /></View>
      <Text style={styles.body}>Local development group · ID {snapshot.group.id}</Text>
    </FieldCard>}

    {snapshot.group ? <>
      <SectionHeader eyebrow="EXPLICIT CONSENT" title="Location sharing" action={snapshot.policy.enabled ? 'On' : 'Off'} />
      <FieldCard style={snapshot.policy.enabled ? styles.sharingCard : undefined}>
        <View style={styles.rowBetween}><View style={styles.flex}><Text style={styles.cardTitle}>{snapshot.policy.enabled ? 'Sharing on' : 'Sharing off'}</Text><Text style={styles.body}>Applies only to {snapshot.group.name}.</Text></View><StatusChip label={snapshot.policy.enabled ? 'ON' : 'OFF'} tone={snapshot.policy.enabled ? 'ready' : 'unknown'} /></View>
        <Text style={styles.label}>Precision shared</Text>
        <View style={styles.choiceRow}><Choice label="Reduced" selected={snapshot.policy.precision === 'reduced'} onPress={() => crew.setPolicy({ precision: 'reduced' })} /><Choice label="Exact" selected={snapshot.policy.precision === 'exact'} onPress={() => crew.setPolicy({ precision: 'exact' })} /></View>
        <Text style={styles.label}>Local retention</Text>
        <View style={styles.choiceRow}><Choice label="30 minutes" selected={snapshot.policy.retentionMinutes === 30} onPress={() => crew.setPolicy({ retentionMinutes: 30 })} /><Choice label="2 hours" selected={snapshot.policy.retentionMinutes === 120} onPress={() => crew.setPolicy({ retentionMinutes: 120 })} /></View>
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: snapshot.consentConfirmed }} onPress={crew.confirmConsent} style={({ pressed }) => [styles.consentRow, snapshot.consentConfirmed && styles.consentRowSelected, pressed && styles.pressed]}>
          <View style={[styles.checkbox, snapshot.consentConfirmed && styles.checkboxSelected]}><Text style={styles.checkmark}>{snapshot.consentConfirmed ? '✓' : ''}</Text></View>
          <Text style={styles.consentText}>I consent to share {snapshot.policy.precision} location with this group and retain it locally for {snapshot.policy.retentionMinutes} minutes.</Text>
        </Pressable>
        {snapshot.policy.enabled ? <SecondaryButton onPress={() => crew.setSharing(false)}>Turn sharing off and revoke</SecondaryButton> : <PrimaryButton disabled={!snapshot.consentConfirmed} accessibilityState={{ disabled: !snapshot.consentConfirmed }} onPress={() => crew.setSharing(true)}>Turn sharing on</PrimaryButton>}
        <Text style={styles.limitText}>Emergency override is off. This simulator does not acquire GPS or transmit data.</Text>
      </FieldCard>

      <SectionHeader eyebrow="TRANSPORT SUMMARY" title="How updates could move" action={`${snapshot.queuedOutbox} queued`} />
      <FieldCard>{snapshot.transports.map((status) => <TransportRow key={status.kind} status={status} />)}{snapshot.queuedOutbox > 0 ? <Text style={styles.queueText}>{snapshot.queuedOutbox} outbound location update queued locally. Reconnecting an enabled simulator clears this development queue.</Text> : null}</FieldCard>

      <SectionHeader eyebrow="BUDDY STATUS" title="Freshness and source" />
      {snapshot.peers.map((peer) => <BuddyCard key={peer.peerId} peer={peer} onPresence={(presence) => crew.setPeerPresence(peer.peerId, presence)} onRevoke={() => crew.revokePeer(peer.peerId)} />)}

      <Panel>
        <View style={styles.rowBetween}><View style={styles.flex}><Text style={styles.cardEyebrow}>DEVELOPER PANEL</Text><Text style={styles.cardTitle}>Simulated transports only</Text></View><StatusChip label="SIMULATOR" tone="unknown" /></View>
        <Text style={styles.body}>These controls do not use a real network, Bluetooth, nearby radios, GPS, or background services.</Text>
        <Text style={styles.label}>Cloud relay simulator</Text>
        <View style={styles.choiceRow}><Choice label="Connected" selected={snapshot.transports[0].state === 'connected'} onPress={() => crew.setTransport('cloud', 'connected')} /><Choice label="Unavailable" selected={snapshot.transports[0].state === 'unavailable'} onPress={() => crew.setTransport('cloud', 'unavailable')} /></View>
        <Text style={styles.label}>Nearby-phone simulator</Text>
        <View style={styles.choiceRow}><Choice label="Available" selected={snapshot.transports[1].state === 'connected'} onPress={() => crew.setTransport('nearby', 'connected')} /><Choice label="Unavailable" selected={snapshot.transports[1].state === 'unavailable'} onPress={() => crew.setTransport('nearby', 'unavailable')} /></View>
        <View style={styles.hardwareNotice}><Text style={styles.cardTitleSmall}>Mesh radio not paired</Text><Text style={styles.body}>Compatible external mesh hardware is required for a real connection. No hardware or range is claimed here.</Text></View>
        <View style={styles.choiceRow}><Choice label="Sim connected" selected={snapshot.transports[2].state === 'connected'} onPress={() => crew.setTransport('mesh_radio', 'connected')} /><Choice label="Not paired" selected={snapshot.transports[2].state === 'unavailable'} onPress={() => crew.setTransport('mesh_radio', 'unavailable')} /></View>
        <SecondaryButton onPress={crew.setAllOfflineAndQueue}>Simulate offline + queue update</SecondaryButton>
        <Text accessibilityLiveRegion="polite" style={styles.actionStatus}>{crew.lastAction}</Text>
        {snapshot.diagnostics ? <Text style={styles.limitText}>Storage: {snapshot.diagnostics.adapter} · schema v{snapshot.diagnostics.schemaVersion} · queue {snapshot.diagnostics.rowCounts.outbox ?? 0}. No coordinates or secrets are shown.</Text> : null}
      </Panel>

      <FieldCard style={styles.deleteCard}>
        <Text style={styles.cardTitleSmall}>Local crew and location data</Text>
        <Text style={styles.body}>Deletes this group, consent, peers, latest/history positions, acknowledgements, transport state, and queued updates from this device.</Text>
        {!showDeleteConfirm ? <SecondaryButton onPress={() => setShowDeleteConfirm(true)}>Delete local crew/location data</SecondaryButton> : <View style={styles.confirmBox}><Text accessibilityLiveRegion="polite" style={styles.dangerText}>Delete all local CrewLink data? This cannot be undone.</Text><View style={styles.choiceRow}><SecondaryButton onPress={() => setShowDeleteConfirm(false)}>Cancel</SecondaryButton><DangerButton onPress={() => { setShowDeleteConfirm(false); void crew.deleteAll(); }}>Confirm delete</DangerButton></View></View>}
      </FieldCard>
    </> : null}

    <Panel><Text style={styles.cardTitleSmall}>Safety boundary</Text><Text style={styles.body}>A connected transport is not proof that a buddy position is live. Always use the freshness age and source text.</Text><SecondaryButton onPress={() => onTab('Map')}>View buddy on map</SecondaryButton><SecondaryButton onPress={() => onTab('SOS')}>Open rescue tools</SecondaryButton></Panel>
  </ScrollView></Screen>;
};

const styles = StyleSheet.create({
  scroll: { gap: 14, paddingBottom: 32 }, header: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 2 }, headerCopy: { flexGrow: 1, minWidth: 180 }, kicker: { color: colors.textTertiary, fontSize: 11, fontWeight: '900', letterSpacing: 1.4 }, title: { color: colors.textPrimary, fontSize: 26, fontWeight: '900', marginTop: 3 }, rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }, flex: { flex: 1, minWidth: 0, gap: 3 }, cardEyebrow: { color: colors.textTertiary, fontSize: 11, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' }, cardTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '900', marginTop: 3 }, cardTitleSmall: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' }, body: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 }, freshness: { color: colors.textPrimary, fontSize: 14, fontWeight: '800', lineHeight: 20 }, label: { color: colors.textPrimary, fontSize: 13, fontWeight: '800' }, choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, scenarioRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, choice: { minHeight: 48, minWidth: 76, flexGrow: 1, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }, choiceSelected: { borderColor: colors.gps, backgroundColor: colors.surfacePressed }, choiceText: { color: colors.textSecondary, fontSize: 13, fontWeight: '800', textTransform: 'capitalize' }, choiceTextSelected: { color: colors.textPrimary }, consentRow: { minHeight: 64, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }, consentRowSelected: { borderColor: colors.trail, backgroundColor: colors.surfacePressed }, checkbox: { width: 28, height: 28, borderRadius: 7, borderWidth: 2, borderColor: colors.textTertiary, alignItems: 'center', justifyContent: 'center' }, checkboxSelected: { borderColor: colors.trail, backgroundColor: colors.trail }, checkmark: { color: colors.background, fontSize: 18, fontWeight: '900' }, consentText: { flex: 1, color: colors.textPrimary, fontSize: 14, lineHeight: 20, fontWeight: '700' }, sharingCard: { borderColor: colors.trail }, attentionCard: { borderColor: colors.warning }, revokedCard: { opacity: 0.8 }, queueText: { color: colors.warning, fontSize: 14, lineHeight: 20, fontWeight: '800' }, limitText: { color: colors.textTertiary, fontSize: 12, lineHeight: 18 }, hardwareNotice: { borderLeftWidth: 3, borderLeftColor: colors.warning, paddingLeft: 12, gap: 4 }, actionStatus: { color: colors.gps, fontSize: 13, lineHeight: 19, fontWeight: '700' }, deleteCard: { borderColor: '#6B3D39' }, confirmBox: { gap: 12, padding: 12, borderRadius: 12, backgroundColor: '#241917' }, dangerText: { color: colors.danger, fontWeight: '800', lineHeight: 20 }, dangerButton: { minHeight: 48, flexGrow: 1, borderRadius: 14, borderWidth: 1, borderColor: colors.danger, backgroundColor: '#3A1D1A', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }, dangerButtonText: { color: colors.textPrimary, fontSize: 15, fontWeight: '900' }, pressed: { opacity: 0.72 },
});
