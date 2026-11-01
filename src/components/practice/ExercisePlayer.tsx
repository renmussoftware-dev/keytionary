import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { COLORS, FONT_FAMILY, RADIUS, SPACE } from '../../constants/theme';
import { NOTES, NOTE_DISPLAY } from '../../constants/music';
import { isScaleFree } from '../../constants/subscription';
import { useProGate } from '../../hooks/useProGate';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { useMetronomeClock, BPM_MIN, BPM_MAX } from '../../hooks/useMetronomeClock';
import { useStore, CLEAN_BPM_STEP } from '../../store/useStore';
import PillSelector from '../PillSelector';
import ExerciseKeyboard from './ExerciseKeyboard';
import CleanRunCelebration from './CleanRunCelebration';
import { HAND_OPTIONS, type HandMode } from './exercisePatterns';
import type { ExerciseDef } from './exerciseCatalog';

export interface ExerciseResult {
  bpm: number;
  seconds: number;
  clean: boolean;
}

interface Props {
  def: ExerciseDef;
  initialRoot: number;
  sessionLabel?: string;            // "Today's session · 2 of 3"
  onFinish: (result: ExerciseResult) => void;
  onExit: () => void;
}

const KEY_TAG = 'keytionary-exercise';

// The screen has to stay on: both hands are on the keys for minutes at a
// time. Lazy require + try/catch so a binary without the module just falls
// back to the normal sleep timer.
function setKeepAwake(on: boolean) {
  try {
    const KA = require('expo-keep-awake');
    if (on) KA.activateKeepAwakeAsync(KEY_TAG).catch(() => {});
    else KA.deactivateKeepAwake(KEY_TAG).catch(() => {});
  } catch {}
}

function clock(totalSec: number): string {
  return `${Math.floor(totalSec / 60)}:${String(totalSec % 60).padStart(2, '0')}`;
}

/**
 * Hands-on-the-keys play-along. Shows a pattern on the keyboard, runs the
 * click, and walks a highlight through the pattern in time. The app can't
 * hear the piano, so finishing is self-reported: "Felt clean" banks the
 * tempo as a personal best and opens a few bpm faster next time.
 */
export default function ExercisePlayer({ def, initialRoot, sessionLabel, onFinish, onExit }: Props) {
  const { isPro, requirePro } = useProGate();
  const stat = useStore(s => s.exerciseStats[def.id]);
  const { playChord, preloadMidi } = useAudioEngine();

  const [root, setRoot] = useState(initialRoot);
  const [variant, setVariant] = useState(def.variants?.[0] ?? '');
  const [hands, setHands] = useState<HandMode>('right');
  // Sound the pattern's notes along with the click — handy for hearing how
  // it should go before playing it yourself.
  const [guideNotes, setGuideNotes] = useState(false);
  const [bpm, setBpm] = useState(
    () => Math.max(BPM_MIN, Math.min(BPM_MAX, stat?.nextBpm ?? def.defaultBpm)),
  );
  const [running, setRunning] = useState(false);
  const [stepIdx, setStepIdx] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(def.minutes * 60);
  const [elapsed, setElapsed] = useState(0);
  // Set on "Felt clean": the best as it stood before this run, so the
  // celebration can count up from it. Finishing waits for Continue.
  const [celebrate, setCelebrate] = useState<{ prevBest: number | null } | null>(null);

  const pattern = useMemo(() => def.build(root, variant, hands), [def, root, variant, hands]);

  // Clicks since Start. Negative during the one-bar count-in.
  const clickRef = useRef(0);
  const patternRef = useRef(pattern);
  useEffect(() => { patternRef.current = pattern; }, [pattern]);
  const guideRef = useRef(guideNotes);
  useEffect(() => { guideRef.current = guideNotes; }, [guideNotes]);

  const onBeat = useCallback(() => {
    const n = clickRef.current;
    clickRef.current = n + 1;
    if (n < 0) { setStepIdx(null); return; }
    const p = patternRef.current;
    const idx = Math.floor(n / p.clicksPerStep) % p.steps.length;
    setStepIdx(idx);
    if (guideRef.current && n % p.clicksPerStep === 0) {
      playChord(p.steps[idx].notes.map(x => x.midi));
    }
  }, [playChord]);

  useMetronomeClock({ bpm, beats: pattern.beats, running, onBeat });

  // Changing key, variant or hands mid-run pauses: the new pattern should
  // start from its first note on a fresh count-in, not mid-bar.
  useEffect(() => {
    setRunning(false);
    setStepIdx(null);
  }, [pattern]);

  useEffect(() => {
    if (guideNotes) preloadMidi(pattern.steps.flatMap(s => s.notes.map(n => n.midi)));
  }, [guideNotes, pattern, preloadMidi]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setElapsed(e => e + 1);
      setSecondsLeft(s => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const timeUp = secondsLeft === 0;
  useEffect(() => {
    if (timeUp) setRunning(false);
  }, [timeUp]);

  useEffect(() => {
    setKeepAwake(running);
    return () => setKeepAwake(false);
  }, [running]);

  // Stop the click when the user switches tabs — the tab stays mounted.
  useFocusEffect(useCallback(() => () => setRunning(false), []));

  function toggle() {
    if (running) {
      setRunning(false);
      return;
    }
    clickRef.current = -pattern.beats;
    setStepIdx(null);
    setRunning(true);
  }

  function bumpBpm(delta: number) {
    setBpm(b => Math.max(BPM_MIN, Math.min(BPM_MAX, b + delta)));
  }

  function pickVariant(v: string) {
    if (def.variantKind === 'scale' && !isPro && !isScaleFree(v)) {
      requirePro(() => setVariant(v), `scale:${v}`);
      return;
    }
    setVariant(v);
  }

  function finish(clean: boolean) {
    setRunning(false);
    if (clean) {
      setCelebrate({ prevBest: stat?.bestBpm ?? null });
      return;
    }
    onFinish({ bpm, seconds: elapsed, clean });
  }

  const keyOptions = useMemo(
    () => NOTES.map((n, i) => ({ value: String(i), label: NOTE_DISPLAY[n] ?? n })),
    [],
  );

  const variantOptions = useMemo(
    () => (def.variants ?? []).map(v => ({
      value: v,
      label: def.variantKind === 'scale' && !isPro && !isScaleFree(v) ? `🔒 ${v}` : v,
    })),
    [def, isPro],
  );

  const started = elapsed > 0;
  let caption = 'Tap start, then play along with the click.';
  if (timeUp) caption = "Time's up. How did it feel?";
  else if (running && stepIdx === null) caption = 'Count in…';
  else if (running && stepIdx !== null) caption = pattern.groupNames?.[pattern.steps[stepIdx].group] ?? ' ';
  else if (started) caption = 'Paused';

  return (
    <View style={styles.wrap}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onExit} activeOpacity={0.7} style={styles.exitBtn}>
          <Text style={styles.exitText}>← Back</Text>
        </TouchableOpacity>
        {sessionLabel && <Text style={styles.sessionLabel}>{sessionLabel}</Text>}
      </View>

      <Text style={styles.title}>{def.title}</Text>
      <Text style={styles.summary}>{def.summary}</Text>

      {def.usesKey && (
        <View style={styles.picker}>
          <PillSelector
            label="Key"
            options={keyOptions}
            value={String(root)}
            onChange={v => v !== null && setRoot(Number(v))}
            allowDeselect={false}
          />
        </View>
      )}
      {variantOptions.length > 0 && (
        <View style={styles.picker}>
          <PillSelector
            label={def.variantLabel}
            options={variantOptions}
            value={variant}
            onChange={v => v !== null && pickVariant(v)}
            allowDeselect={false}
          />
        </View>
      )}
      {def.usesHands && (
        <View style={styles.picker}>
          <PillSelector
            label="Hands"
            options={HAND_OPTIONS}
            value={hands}
            onChange={v => v !== null && setHands(v as HandMode)}
            allowDeselect={false}
          />
        </View>
      )}

      <View style={styles.board}>
        <Text style={styles.caption} numberOfLines={1}>{caption}</Text>
        <ExerciseKeyboard pattern={pattern} stepIdx={running ? stepIdx : null} />
      </View>

      <View style={styles.tempoCard}>
        <View style={styles.tempoHeader}>
          <Text style={styles.eyebrow}>Tempo</Text>
          <Text style={styles.best}>
            {stat?.bestBpm ? `Best clean: ${stat.bestBpm} bpm` : 'No clean tempo logged yet'}
          </Text>
        </View>
        <View style={styles.tempoRow}>
          <TouchableOpacity onPress={() => bumpBpm(-5)} activeOpacity={0.7} style={styles.bpmStep}>
            <Text style={styles.bpmStepTxt}>−5</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => bumpBpm(-1)} activeOpacity={0.7} style={styles.bpmStep}>
            <Text style={styles.bpmStepTxt}>−1</Text>
          </TouchableOpacity>
          <View style={styles.bpmReadout}>
            <Text style={styles.bpmValue}>{bpm}</Text>
            <Text style={styles.bpmUnit}>BPM</Text>
          </View>
          <TouchableOpacity onPress={() => bumpBpm(1)} activeOpacity={0.7} style={styles.bpmStep}>
            <Text style={styles.bpmStepTxt}>+1</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => bumpBpm(5)} activeOpacity={0.7} style={styles.bpmStep}>
            <Text style={styles.bpmStepTxt}>+5</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          onPress={() => setGuideNotes(g => !g)}
          activeOpacity={0.7}
          style={[styles.guideToggle, guideNotes && styles.guideToggleOn]}
        >
          <Text style={[styles.guideText, guideNotes && styles.guideTextOn]}>
            {guideNotes ? '♪ Hearing the notes with the click' : '♪ Hear the notes with the click'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.tip}>{def.tip}</Text>

      {!timeUp && (
        <TouchableOpacity onPress={toggle} activeOpacity={0.85} style={[styles.primaryBtn, running && styles.primaryBtnOn]}>
          <Text style={styles.primaryBtnText}>
            {running ? `❚❚  Pause · ${clock(secondsLeft)}` : started ? `▶  Resume · ${clock(secondsLeft)}` : `▶  Start · ${clock(secondsLeft)}`}
          </Text>
        </TouchableOpacity>
      )}

      {started && (
        <View style={styles.finishRow}>
          <TouchableOpacity onPress={() => finish(true)} activeOpacity={0.85} style={[styles.finishBtn, styles.cleanBtn]}>
            <Text style={styles.cleanBtnText}>✓ Felt clean</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => finish(false)} activeOpacity={0.7} style={styles.finishBtn}>
            <Text style={styles.finishBtnText}>Still working on it</Text>
          </TouchableOpacity>
        </View>
      )}
      {started && (
        <Text style={styles.finishHint}>
          Felt clean saves {bpm} bpm as your best and starts you a little faster next time.
        </Text>
      )}

      {celebrate && (
        <CleanRunCelebration
          bpm={bpm}
          prevBest={celebrate.prevBest}
          nextBpm={Math.min(BPM_MAX, bpm + CLEAN_BPM_STEP)}
          onContinue={() => onFinish({ bpm, seconds: elapsed, clean: true })}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: SPACE.md },
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACE.lg, marginBottom: SPACE.sm,
  },
  exitBtn: { paddingVertical: 6, paddingRight: 12 },
  exitText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  sessionLabel: { flex: 1, textAlign: 'right', fontSize: 12, fontWeight: '600', color: COLORS.accent },

  title: { fontSize: 20, fontWeight: '700', color: COLORS.text, paddingHorizontal: SPACE.lg },
  summary: {
    fontSize: 13, color: COLORS.textMuted, lineHeight: 19,
    paddingHorizontal: SPACE.lg, marginTop: 2, marginBottom: SPACE.md,
  },
  picker: { marginBottom: SPACE.sm },

  board: {
    marginTop: SPACE.sm, marginBottom: SPACE.md,
    paddingVertical: SPACE.md, paddingHorizontal: SPACE.lg,
    backgroundColor: COLORS.bgElevated,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border,
  },
  caption: {
    fontSize: 13, fontWeight: '700', color: COLORS.text,
    textAlign: 'center', marginBottom: SPACE.sm, minHeight: 18,
  },

  tempoCard: {
    marginHorizontal: SPACE.lg, marginBottom: SPACE.md,
    padding: SPACE.md,
    borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  tempoHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACE.sm },
  eyebrow: {
    flex: 1,
    fontSize: 10, fontWeight: '600', color: COLORS.textFaint,
    letterSpacing: 1.6, textTransform: 'uppercase', fontFamily: FONT_FAMILY.mono,
  },
  best: { fontSize: 12, color: COLORS.textMuted },
  tempoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bpmStep: {
    minWidth: 46, paddingVertical: 9, alignItems: 'center',
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceHigh,
  },
  bpmStepTxt: { fontSize: 13, fontWeight: '700', color: COLORS.text, fontFamily: FONT_FAMILY.mono },
  bpmReadout: { alignItems: 'center', minWidth: 76 },
  bpmValue: {
    fontSize: 34, fontWeight: '700', lineHeight: 38, color: COLORS.text,
    fontFamily: FONT_FAMILY.mono, fontVariant: ['tabular-nums'],
  },
  bpmUnit: { fontSize: 10, fontWeight: '600', color: COLORS.textMuted, letterSpacing: 0.5 },
  guideToggle: {
    marginTop: SPACE.md, paddingVertical: 8, alignItems: 'center',
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border,
  },
  guideToggleOn: { borderColor: COLORS.accent, backgroundColor: COLORS.accentSoft },
  guideText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  guideTextOn: { color: COLORS.text },

  tip: {
    fontSize: 12, color: COLORS.textMuted, lineHeight: 18,
    paddingHorizontal: SPACE.lg, marginBottom: SPACE.lg,
  },

  primaryBtn: {
    marginHorizontal: SPACE.lg, marginBottom: SPACE.sm,
    paddingVertical: 13, alignItems: 'center', borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent,
  },
  primaryBtnOn: { backgroundColor: '#D45846' },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff', fontVariant: ['tabular-nums'] },

  finishRow: { flexDirection: 'row', gap: SPACE.sm, marginHorizontal: SPACE.lg },
  finishBtn: {
    flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  finishBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  cleanBtn: { borderColor: '#1D9E75', backgroundColor: 'rgba(29,158,117,0.18)' },
  cleanBtnText: { fontSize: 13, fontWeight: '700', color: '#3FCB9C' },
  finishHint: {
    fontSize: 11, color: COLORS.textFaint, lineHeight: 16, textAlign: 'center',
    marginHorizontal: SPACE.lg, marginTop: SPACE.sm,
  },
});
