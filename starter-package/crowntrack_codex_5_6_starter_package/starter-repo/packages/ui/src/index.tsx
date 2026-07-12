import React from 'react';
import { Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

export const colors = {
  background: '#0B1110', surface: '#141C1A', surfaceElevated: '#1C2824', surfacePressed: '#24332E', border: '#2A3A35', textPrimary: '#F2F5F1', textSecondary: '#A8B5AB', textTertiary: '#7C8B82', trail: '#8BCF8A', gps: '#8FB9EE', route: '#D0A66F', warning: '#E0B45E', danger: '#E36E64', unknown: '#B0A99A', mapLand: '#17211C', mapTrail: '#A8C89C', mapRoute: '#D0A66F', mapGps: '#8FB9EE', mapHazard: '#E36E64', mapCrewLive: '#8BCF8A', mapCrewStale: '#E0B45E', mapBoundary: '#B0A99A',
} as const;
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;

type Tone = 'ready' | 'info' | 'warning' | 'danger' | 'unknown' | 'neutral';
const toneColor: Record<Tone, string> = { ready: colors.trail, info: colors.gps, warning: colors.warning, danger: colors.danger, unknown: colors.unknown, neutral: colors.textSecondary };

export const Screen = ({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) => <View style={[styles.screen, style]}>{children}</View>;
export const ScreenScroll = ({ children }: { children: React.ReactNode }) => <View style={styles.scroll}>{children}</View>;
export const SectionHeader = ({ title, eyebrow, action }: { title: string; eyebrow?: string; action?: string }) => <View style={styles.sectionHeader}><View>{eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}<Text style={styles.sectionTitle}>{title}</Text></View>{action ? <Text style={styles.sectionAction}>{action}</Text> : null}</View>;
export const FieldCard = ({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) => <View style={[styles.card, style]}>{children}</View>;
export const StatusChip = ({ label, tone = 'neutral' }: { label: string; tone?: Tone }) => <View style={[styles.chip, { borderColor: toneColor[tone] }]}><View style={[styles.chipDot, { backgroundColor: toneColor[tone] }]} /><Text style={[styles.chipText, { color: toneColor[tone] }]}>{label}</Text></View>;
export const Metric = ({ label, value, detail }: { label: string; value: string; detail?: string }) => <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text>{detail ? <Text style={styles.metricDetail}>{detail}</Text> : null}</View>;
export const ProgressBar = ({ progress, tone = 'ready' }: { progress: number; tone?: Tone }) => <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.max(0, Math.min(progress, 100))}%`, backgroundColor: toneColor[tone] }]} /></View>;
export const PrimaryButton = ({ children, ...props }: PressableProps & { children: React.ReactNode }) => <Pressable accessibilityRole="button" style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]} {...props}><Text style={styles.primaryText}>{children}</Text></Pressable>;
export const SecondaryButton = ({ children, ...props }: PressableProps & { children: React.ReactNode }) => <Pressable accessibilityRole="button" style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]} {...props}><Text style={styles.secondaryText}>{children}</Text></Pressable>;
export const IconButton = ({ label, ...props }: PressableProps & { label: string }) => <Pressable accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]} {...props}><Text style={styles.iconButtonText}>{label.slice(0, 1)}</Text></Pressable>;
export const Panel = ({ children }: { children: React.ReactNode }) => <View style={styles.panel}>{children}</View>;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  scroll: { gap: spacing.md, paddingBottom: 120 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: spacing.sm },
  eyebrow: { color: colors.textTertiary, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  sectionTitle: { color: colors.textPrimary, fontSize: 21, fontWeight: '800', marginTop: 3 },
  sectionAction: { color: colors.gps, fontSize: 13, fontWeight: '700' },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: spacing.lg, gap: spacing.md },
  chip: { alignSelf: 'flex-start', minHeight: 30, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  chipText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.2 },
  metric: { flex: 1, gap: 3 },
  metricLabel: { color: colors.textTertiary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  metricValue: { color: colors.textPrimary, fontSize: 25, fontWeight: '800' },
  metricDetail: { color: colors.textSecondary, fontSize: 12 },
  progressTrack: { height: 8, backgroundColor: colors.surfacePressed, borderRadius: 6, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 6 },
  primaryButton: { minHeight: 52, borderRadius: 14, backgroundColor: colors.trail, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  primaryText: { color: '#102017', fontSize: 16, fontWeight: '900' },
  secondaryButton: { minHeight: 48, borderRadius: 14, borderColor: colors.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  secondaryText: { color: colors.textPrimary, fontSize: 15, fontWeight: '800' },
  iconButton: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  iconButtonText: { color: colors.textPrimary, fontSize: 20, fontWeight: '900' },
  panel: { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: spacing.lg, gap: spacing.md },
  pressed: { opacity: 0.72 },
});
