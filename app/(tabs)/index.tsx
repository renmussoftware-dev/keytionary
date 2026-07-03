import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Piano from '../../src/components/Piano';
import TopBar from '../../src/components/TopBar';
import InfoPanel from '../../src/components/InfoPanel';
import PillSelector from '../../src/components/PillSelector';
import DailyPickCard from '../../src/components/DailyPickCard';
import { COLORS, SPACE, RADIUS, FONT_FAMILY } from '../../src/constants/theme';
import { SCALES, CHORDS } from '../../src/constants/music';
import { useStore } from '../../src/store/useStore';
import { useProGate } from '../../src/hooks/useProGate';
import { useAudioEngine } from '../../src/hooks/useAudioEngine';
import { isScaleFree, isChordFree } from '../../src/constants/subscription';

// Scale playback tempo. 90 BPM = ~667ms per note — fast enough to feel
// like a scale run, slow enough for a learner to follow each highlight.
const SCALE_PLAY_BPM = 90;
const SCALE_NOTE_MS = (60 / SCALE_PLAY_BPM) * 1000;

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

  // ── Scale playback ────────────────────────────────────────────────────────
  // Cycles up the selected scale one note at a time, highlighting each note
  // on the keyboard as it sounds so the learner can follow visually. Stops
  // automatically when scale/root changes (otherwise notes from the old
  // scale would keep playing under the new one's highlights).
  const { playMidi, preloadMidi } = useAudioEngine();
  const [playingMidi, setPlayingMidi] = useState<number | null>(null);
  const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scalePlaySequence = useMemo(() => {
    const sc = SCALES[scaleKey];
    if (!sc) return [];
    // 60 = C4 in the audio engine's filename convention. Offset by root so
    // any key plays from its own tonic in the middle register.
    const base = 60 + root;
    const out: number[] = [base];
    let cur = 0;
    for (const step of sc.steps) {
      cur += step;
      out.push(base + cur);
    }
    return out;
  }, [root, scaleKey]);

  function stopScalePlay() {
    if (playTimerRef.current) {
      clearTimeout(playTimerRef.current);
      playTimerRef.current = null;
    }
    setPlayingMidi(null);
  }

  function startScalePlay() {
    // Belt-and-suspenders: scale SELECTION is already Pro-gated, but if a
    // Pro user downgrades while a locked scale is selected, refuse to play.
    if (!isPro && !isScaleFree(scaleKey)) { requirePro(() => {}); return; }
    stopScalePlay();
    let i = 0;
    const tick = () => {
      if (i >= scalePlaySequence.length) {
        setPlayingMidi(null);
        playTimerRef.current = null;
        return;
      }
      const midi = scalePlaySequence[i];
      setPlayingMidi(midi);
      playMidi(midi);
      i++;
      playTimerRef.current = setTimeout(tick, SCALE_NOTE_MS);
    };
    tick();
  }

  const isPlaying = playingMidi !== null;
  function toggleScalePlay() {
    if (isPlaying) stopScalePlay();
    else startScalePlay();
  }

  useEffect(() => stopScalePlay, [root, scaleKey]);

  // Pre-warm the scale's notes so the first Play press has every sample
  // ready and the scale runs without cold-load hiccups.
  useEffect(() => {
    if (scalePlaySequence.length) preloadMidi(scalePlaySequence);
  }, [scalePlaySequence, preloadMidi]);

  const controlsContent = (
    <>
      <DailyPickCard />
      {mode === 'scales' && (
        <View style={styles.section}>
          <View style={styles.scaleHeaderRow}>
            <Text style={[styles.sectionLabel, { paddingHorizontal: 0, marginBottom: 0 }]}>Scale</Text>
            <TouchableOpacity
              onPress={toggleScalePlay}
              style={[styles.scalePlayBtn, isPlaying && styles.scalePlayBtnOn]}
              activeOpacity={0.85}
            >
              <Text style={styles.scalePlayBtnText}>
                {isPlaying ? '⏸ Stop' : '▶ Play scale'}
              </Text>
            </TouchableOpacity>
          </View>
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
            <Piano playingMidi={playingMidi} />
          </View>
          <ScrollView style={styles.tabletControls} showsVerticalScrollIndicator={false}>
            {controlsContent}
          </ScrollView>
          <InfoPanel />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={styles.fbWrap}>
            <Piano playingMidi={playingMidi} />
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
  // Header row for the Scale section: label on the left, Play/Stop control
  // on the right. Padding lives here so the inner label can drop its own.
  scaleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACE.lg,
    marginBottom: SPACE.sm,
  },
  scalePlayBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent,
  },
  scalePlayBtnOn: { backgroundColor: '#D45846' },
  scalePlayBtnText: {
    color: '#1a1400', fontSize: 12, fontWeight: '700', letterSpacing: 0.3,
  },
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
