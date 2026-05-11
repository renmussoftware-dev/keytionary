import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import { Audio } from 'expo-av';
import { Sound } from 'expo-av/build/Audio';
import { COLORS, FONT_FAMILY, RADIUS, SPACE } from '../constants/theme';

interface TimeSig { name: string; beats: number; }

const TIME_SIGS: TimeSig[] = [
  { name: '2/4', beats: 2 },
  { name: '3/4', beats: 3 },
  { name: '4/4', beats: 4 },
  { name: '5/4', beats: 5 },
  { name: '6/8', beats: 6 },
  { name: '7/8', beats: 7 },
];

const ACCENT_VOLUME = 1.0;
const OFFBEAT_VOLUME = 0.55;
const CLICK_SAMPLE = require('../../assets/audio/WoodBlHi ExtraPerc V1.wav');

const BPM_MIN = 40;
const BPM_MAX = 240;
const TAP_WINDOW_MS = 2500;  // taps older than this expire

export default function Metronome() {
  const accentSoundRef = useRef<Sound | null>(null);
  const offbeatSoundRef = useRef<Sound | null>(null);

  // Load two Sound instances of the wood-block sample at different volumes —
  // pre-loading avoids per-tick volume change latency.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      const [{ sound: accent }, { sound: offbeat }] = await Promise.all([
        Audio.Sound.createAsync(CLICK_SAMPLE, { shouldPlay: false, volume: ACCENT_VOLUME }),
        Audio.Sound.createAsync(CLICK_SAMPLE, { shouldPlay: false, volume: OFFBEAT_VOLUME }),
      ]);
      if (cancelled) {
        accent.unloadAsync();
        offbeat.unloadAsync();
        return;
      }
      accentSoundRef.current = accent;
      offbeatSoundRef.current = offbeat;
    }
    load();
    return () => {
      cancelled = true;
      accentSoundRef.current?.unloadAsync();
      offbeatSoundRef.current?.unloadAsync();
      accentSoundRef.current = null;
      offbeatSoundRef.current = null;
    };
  }, []);

  function playClick(accent: boolean) {
    const sound = accent ? accentSoundRef.current : offbeatSoundRef.current;
    if (!sound) return;
    // replayAsync is a single native call that restarts the sample from the
    // beginning even if it's still ringing out — much more reliable at high
    // BPMs than setPositionAsync(0) + playAsync().
    sound.replayAsync().catch(() => {});
  }

  const [bpm, setBpm] = useState(100);
  const [sigIdx, setSigIdx] = useState(2); // default 4/4
  const [running, setRunning] = useState(false);
  const [beatIdx, setBeatIdx] = useState(0);

  const sig = TIME_SIGS[sigIdx];
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextTickRef = useRef<number>(0);
  const beatRef = useRef(0);
  const tapTimesRef = useRef<number[]>([]);
  const pulseAnim = useRef(new Animated.Value(0)).current;

  // Self-correcting tick scheduler: targets absolute tick times to avoid drift
  useEffect(() => {
    if (!running) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      return;
    }

    beatRef.current = 0;
    setBeatIdx(0);
    nextTickRef.current = Date.now();

    function tick() {
      const beat = beatRef.current;
      const isAccent = beat === 0;
      playClick(isAccent);
      setBeatIdx(beat);

      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();

      beatRef.current = (beat + 1) % sig.beats;
      const interval = 60_000 / bpm;
      nextTickRef.current += interval;
      const delay = Math.max(0, nextTickRef.current - Date.now());
      timerRef.current = setTimeout(tick, delay);
    }
    // First tick immediately
    tick();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [running, bpm, sig.beats, pulseAnim]);

  function bumpBpm(delta: number) {
    setBpm(b => Math.max(BPM_MIN, Math.min(BPM_MAX, b + delta)));
  }

  function tapTempo() {
    const now = Date.now();
    const taps = tapTimesRef.current.filter(t => now - t < TAP_WINDOW_MS);
    taps.push(now);
    tapTimesRef.current = taps;
    if (taps.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < taps.length; i++) intervals.push(taps[i] - taps[i - 1]);
      const avg = intervals.reduce((s, v) => s + v, 0) / intervals.length;
      const tappedBpm = Math.round(60_000 / avg);
      setBpm(Math.max(BPM_MIN, Math.min(BPM_MAX, tappedBpm)));
    }
  }

  return (
    <View style={styles.wrap}>
      {/* Hero BPM card — TEMPO label + giant mono number + beat dots */}
      <View style={styles.bpmCard}>
        <Text style={styles.bpmEyebrow}>Tempo</Text>
        <Text style={styles.bpmValue}>{bpm}</Text>
        <Text style={styles.bpmLabel}>BPM</Text>

        <View style={styles.beatRow}>
          {Array.from({ length: sig.beats }, (_, i) => {
            const isCurrent = running && i === beatIdx;
            const isAccent = i === 0;
            return (
              <View
                key={i}
                style={[
                  styles.beatDot,
                  isAccent && styles.beatDotAccent,
                  isCurrent && (isAccent ? styles.beatDotAccentLit : styles.beatDotLit),
                ]}
              />
            );
          })}
        </View>
      </View>

      {/* BPM step controls — fine-grained adjust + tap tempo */}
      <View style={styles.bpmRow}>
        <TouchableOpacity onPress={() => bumpBpm(-5)} activeOpacity={0.7} style={styles.bpmStep}>
          <Text style={styles.bpmStepTxt}>−5</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => bumpBpm(-1)} activeOpacity={0.7} style={styles.bpmStep}>
          <Text style={styles.bpmStepTxt}>−1</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={tapTempo} activeOpacity={0.7} style={styles.tapBtn}>
          <Text style={styles.tapTxt}>TAP</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => bumpBpm(1)} activeOpacity={0.7} style={styles.bpmStep}>
          <Text style={styles.bpmStepTxt}>+1</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => bumpBpm(5)} activeOpacity={0.7} style={styles.bpmStep}>
          <Text style={styles.bpmStepTxt}>+5</Text>
        </TouchableOpacity>
      </View>

      {/* Time signature */}
      <Text style={styles.secLabel}>Time signature</Text>
      <View style={styles.sigRow}>
        {TIME_SIGS.map((s, i) => (
          <TouchableOpacity
            key={s.name}
            onPress={() => setSigIdx(i)}
            activeOpacity={0.7}
            style={[styles.sigPill, i === sigIdx && styles.sigPillActive]}
          >
            <Text style={[styles.sigText, i === sigIdx && styles.sigTextActive]}>{s.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Glowing accent play circle */}
      <Animated.View style={{
        transform: [{
          scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }),
        }],
      }}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setRunning(v => !v)}
          style={[styles.playCircle, running && styles.playCircleOn]}
        >
          <Text style={styles.playGlyph}>{running ? '■' : '▶'}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: SPACE.lg, paddingTop: SPACE.lg, alignItems: 'center' },

  // Hero BPM card — large rounded panel with mono number + beat dots
  bpmCard: {
    alignSelf: 'stretch',
    backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACE.xl,
    paddingHorizontal: SPACE.lg,
    alignItems: 'center',
    marginBottom: SPACE.lg,
  },
  bpmEyebrow: {
    fontSize: 10, fontWeight: '600',
    color: COLORS.textFaint, letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 6,
    fontFamily: FONT_FAMILY.mono,
  },
  bpmValue: {
    fontSize: 88, fontWeight: '700', lineHeight: 92,
    color: COLORS.text, letterSpacing: -3,
    fontFamily: FONT_FAMILY.mono,
  },
  bpmLabel: {
    fontSize: 12, fontWeight: '600',
    color: COLORS.textMuted, letterSpacing: 0.5,
    marginTop: 4,
    fontFamily: FONT_FAMILY.mono,
  },

  // Beat dots, sit inside the BPM card
  beatRow: {
    flexDirection: 'row', gap: 10, justifyContent: 'center',
    marginTop: SPACE.lg,
  },
  beatDot: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: COLORS.surfaceHigh,
    borderWidth: 1, borderColor: COLORS.border,
  },
  beatDotAccent: { borderColor: COLORS.textMuted },
  beatDotLit: {
    backgroundColor: COLORS.accent, borderColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 8,
    elevation: 4,
  },
  beatDotAccentLit: {
    backgroundColor: '#E0CC58', borderColor: '#B49E2E',
    shadowColor: '#E0CC58',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 8,
    elevation: 4,
  },

  // BPM step controls + tap
  bpmRow: {
    flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: SPACE.lg,
  },
  bpmStep: {
    width: 44, height: 38, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  bpmStepTxt: {
    fontSize: 13, fontWeight: '700', color: COLORS.text,
    fontFamily: FONT_FAMILY.mono,
  },
  tapBtn: {
    width: 60, height: 38, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.accent, backgroundColor: COLORS.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  tapTxt: {
    fontSize: 12, fontWeight: '700', color: COLORS.accent, letterSpacing: 1.2,
    fontFamily: FONT_FAMILY.mono,
  },

  // Section label (mono uppercase)
  secLabel: {
    fontSize: 10, fontWeight: '600',
    color: COLORS.textFaint, letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: SPACE.sm, marginTop: SPACE.sm,
    fontFamily: FONT_FAMILY.mono,
    alignSelf: 'flex-start',
  },

  // Time signature pills
  sigRow: {
    flexDirection: 'row', gap: 6, flexWrap: 'wrap',
    marginBottom: SPACE.lg,
    alignSelf: 'stretch', justifyContent: 'center',
  },
  sigPill: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: 'transparent',
  },
  sigPillActive: { backgroundColor: COLORS.accentSoft, borderColor: COLORS.accent },
  sigText: {
    fontSize: 13, fontWeight: '600', color: COLORS.textMuted,
    fontFamily: FONT_FAMILY.mono, letterSpacing: 0.4,
  },
  sigTextActive: { color: COLORS.text },

  // Big circular accent play button at the bottom
  playCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center',
    marginTop: SPACE.lg,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 18,
    elevation: 10,
  },
  playCircleOn: { backgroundColor: '#D45846' },
  playGlyph: { fontSize: 32, color: '#fff', fontWeight: '700', lineHeight: 36 },
});
