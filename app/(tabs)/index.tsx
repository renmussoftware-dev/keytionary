import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Piano from '../../src/components/Piano';
import TopBar from '../../src/components/TopBar';
import InfoPanel from '../../src/components/InfoPanel';
import PillSelector from '../../src/components/PillSelector';
import { COLORS, SPACE, RADIUS, FONT_FAMILY } from '../../src/constants/theme';
import { SCALES, CHORDS } from '../../src/constants/music';
import { useStore } from '../../src/store/useStore';
import { useProGate } from '../../src/hooks/useProGate';
import { isScaleFree, isChordFree } from '../../src/constants/subscription';

const LABEL_OPTIONS = [
  { label: 'Note', value: 'name' },
  { label: 'Degree', value: 'degree' },
  { label: 'Interval', value: 'interval' },
  { label: 'None', value: 'none' },
];

export default function KeyboardScreen() {
  const { width: screenW } = useWindowDimensions();
  const isTablet = screenW >= 768;
  const { isPro, requirePro } = useProGate();

  const {
    mode, root, scaleKey, setScaleKey,
    chordKey, setChordKey, labelMode, setLabelMode,
  } = useStore();

  const scaleOptions = Object.keys(SCALES).map(k => ({ label: k, value: k }));
  const chordOptions = Object.keys(CHORDS).map(k => ({ label: k, value: k }));

  const controlsContent = (
    <>
      {mode === 'scales' && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Scale</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillRow}>
            {scaleOptions.map(opt => {
              const locked = !isPro && !isScaleFree(opt.value);
              return (
                <TouchableOpacity key={opt.value}
                  onPress={() => locked ? requirePro(() => setScaleKey(opt.value)) : setScaleKey(opt.value)}
                  style={[styles.pill, scaleKey === opt.value && styles.pillActive, locked && styles.pillLocked]}
                  activeOpacity={0.7}>
                  <Text style={[styles.pillText, scaleKey === opt.value && styles.pillTextActive]}>
                    {locked ? '🔒 ' : ''}{opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
      {mode === 'chords' && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Chord type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillRow}>
            {chordOptions.map(opt => {
              const locked = !isPro && !isChordFree(opt.value);
              return (
                <TouchableOpacity key={opt.value}
                  onPress={() => locked ? requirePro(() => setChordKey(opt.value)) : setChordKey(opt.value)}
                  style={[styles.pill, chordKey === opt.value && styles.pillActive, locked && styles.pillLocked]}
                  activeOpacity={0.7}>
                  <Text style={[styles.pillText, chordKey === opt.value && styles.pillTextActive]}>
                    {locked ? '🔒 ' : ''}{opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
      <View style={styles.section}>
        <PillSelector label="Note labels" options={LABEL_OPTIONS} value={labelMode}
          onChange={v => v && setLabelMode(v as any)} allowDeselect={false} />
      </View>
      <View style={{ height: SPACE.xxl }} />
    </>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopBar />

      {isTablet ? (
        <View style={styles.tabletLayout}>
          <View style={styles.tabletFbWrap}>
            <Piano />
          </View>
          <ScrollView style={styles.tabletControls} showsVerticalScrollIndicator={false}>
            {controlsContent}
          </ScrollView>
          <InfoPanel />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={styles.fbWrap}>
            <Piano />
          </View>
          <ScrollView style={styles.controls} showsVerticalScrollIndicator={false}>
            {controlsContent}
          </ScrollView>
          <InfoPanel />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  fbWrap: {
    backgroundColor: COLORS.bgElevated,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: SPACE.md,
  },
  controls: { flex: 1 },
  tabletLayout:    { flex: 1 },
  tabletFbWrap:    { backgroundColor: COLORS.bgElevated, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingVertical: SPACE.lg },
  tabletControls:  { flex: 1 },
  section: { marginTop: SPACE.lg },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textFaint,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: SPACE.sm,
    paddingHorizontal: SPACE.lg,
    fontFamily: FONT_FAMILY.mono,
  },
  pillRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACE.lg,
    gap: 6,
    flexWrap: 'nowrap',
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pillActive: {
    backgroundColor: COLORS.accentSoft,
    borderColor: COLORS.accent,
  },
  pillLocked: {
    opacity: 0.5,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textMuted,
    letterSpacing: 0.1,
  },
  pillTextActive: {
    color: COLORS.text,
    fontWeight: '600',
  },
});
