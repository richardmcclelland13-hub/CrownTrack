import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@crowntrack/ui';
import { transitionRideSession, type RideSessionState } from '@crowntrack/core';
import { CrewScreen, MapScreen, PacksScreen, PlanScreen, SosScreen, type TabKey } from './src/screens';
import { useCrewDevelopment } from './src/crew/useCrewDevelopment';

const tabs: TabKey[] = ['Map', 'Packs', 'Plan', 'Crew', 'SOS'];
const tabHint: Record<TabKey, string> = { Map: 'Ride', Packs: 'Offline', Plan: 'Audit', Crew: 'Room', SOS: 'Rescue' };

export default function App() {
  const [tab, setTab] = useState<TabKey>('Map');
  const [rideState, setRideState] = useState<RideSessionState>('idle');
  const crew = useCrewDevelopment();
  const updateRideState = (next: RideSessionState) => setRideState(next === 'recording' && rideState === 'idle' ? transitionRideSession(rideState, 'start') : next);
  const screenProps = { onTab: setTab, rideState, onRideState: updateRideState, crew };
  return <SafeAreaProvider><SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom', 'left']}><View style={styles.app}>{tab === 'Map' ? <MapScreen {...screenProps} /> : tab === 'Packs' ? <PacksScreen {...screenProps} /> : tab === 'Plan' ? <PlanScreen {...screenProps} /> : tab === 'Crew' ? <CrewScreen {...screenProps} /> : <SosScreen {...screenProps} />}<View style={styles.tabBar}>{tabs.map((item) => <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: item === tab }} accessibilityLabel={`${item} tab`} onPress={() => setTab(item)} style={({ pressed }) => [styles.tab, item === tab && styles.tabActive, pressed && styles.pressed]}><Text numberOfLines={2} style={[styles.tabLabel, item === tab && styles.tabLabelActive]}>{item}</Text><Text numberOfLines={2} style={[styles.tabHint, item === tab && styles.tabHintActive]}>{tabHint[item]}</Text></Pressable>)}</View></View></SafeAreaView></SafeAreaProvider>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background }, app: { flex: 1 }, tabBar: { minHeight: 82, backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', paddingHorizontal: 4, paddingTop: 8, paddingBottom: 6 }, tab: { flex: 1, minHeight: 64, alignItems: 'center', justifyContent: 'center', borderRadius: 12, gap: 2, paddingHorizontal: 2 }, tabActive: { backgroundColor: colors.surfaceElevated }, tabLabel: { color: colors.textTertiary, fontSize: 13, fontWeight: '800', textAlign: 'center', flexShrink: 1 }, tabLabelActive: { color: colors.textPrimary }, tabHint: { color: colors.textTertiary, fontSize: 10, fontWeight: '700', textAlign: 'center', flexShrink: 1 }, tabHintActive: { color: colors.trail }, pressed: { opacity: 0.7 } });
