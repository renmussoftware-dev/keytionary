import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { COLORS, FONT_FAMILY, RADIUS, SPACE } from '../../constants/theme';
import { useStore, type SavedItem } from '../../store/useStore';
import { SCALES, CHORDS, NOTES } from '../../constants/music';
import { PROGRESSIONS } from '../../constants/progressions';
import { chordShortName } from '../../utils/theory';
import { EXERCISES, exerciseById } from './exerciseCatalog';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Practice → Progress. Streak, this week's exercise time, tempo records,
 * and how much of the library the user has actually played.
 *
 * What counts:
 *  - Scales:        played via ▶ Play scale on the Keyboard tab
 *  - Chords:        played from the Chord library
 *  - Progressions:  named progressions played via ▶ on the Progressions tab
 *  - Exercises:     finished in the Exercises player (either button)
 *
 * Every counter gates on actually hearing or playing the thing, not just
 * tapping it in a picker, so the numbers going up feel earned.
 */
export default function Progress() {
  const currentStreak = useStore(s => s.currentStreak);
  const longestStreak = useStore(s => s.longestStreak);
  const scalesExplored = useStore(s => s.scalesExplored);
  const chordsLearned = useStore(s => s.chordsLearned);
  const progressionsPlayed = useStore(s => s.progressionsPlayed);
  const exerciseStats = useStore(s => s.exerciseStats);
  const practiceLog = useStore(s => s.practiceLog);
  const recents = useStore(s => s.recents);

  // The last seven days, oldest first, ending today.
  const week = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return { label: DAY_LABELS[d.getDay()], sec: practiceLog[dateKey(d)] ?? 0, today: i === 6 };
    });
  }, [practiceLog]);
  const weekMinutes = Math.round(week.reduce((sum, d) => sum + d.sec, 0) / 60);
  const weekMax = Math.max(...week.map(d => d.sec), 1);

  const exercisesTried = EXERCISES.filter(e => (exerciseStats[e.id]?.completions ?? 0) > 0).length;
  const totalExerciseMin = Math.round(
    Object.values(exerciseStats).reduce((sum, s) => sum + s.totalSec, 0) / 60,
  );
  // Fastest clean tempos, as a quick "look how far you've come" list.
  const records = useMemo(() => (
    Object.entries(exerciseStats)
      .filter(([id, s]) => s.bestBpm !== null && exerciseById(id))
      .sort(([, a], [, b]) => (b.bestBpm ?? 0) - (a.bestBpm ?? 0))
      .slice(0, 3)
      .map(([id, s]) => ({ title: exerciseById(id)!.title, bpm: s.bestBpm! }))
  ), [exerciseStats]);

  const totals = useMemo(() => ({
    scales:       { done: scalesExplored.length,     total: Object.keys(SCALES).length },
    chords:       { done: chordsLearned.length,      total: Object.keys(CHORDS).length },
    progressions: { done: progressionsPlayed.length, total: PROGRESSIONS.length },
  }), [scalesExplored, chordsLearned, progressionsPlayed]);

  // Encouraging next step. Tries scales → chords → progressions in order so
  // the message stays actionable after one category is finished.
  const nextUp = useMemo(() => {
    const scaleLeft = Object.keys(SCALES).filter(k => !scalesExplored.includes(k));
    if (scaleLeft.length > 0) return { label: 'scale', name: scaleLeft[0] };
    const chordLeft = Object.keys(CHORDS).filter(k => !chordsLearned.includes(k));
    if (chordLeft.length > 0) return { label: 'chord', name: chordLeft[0] };
    const progLeft = PROGRESSIONS.map(p => p.name).filter(n => !progressionsPlayed.includes(n));
    if (progLeft.length > 0) return { label: 'progression', name: progLeft[0] };
    return null;
  }, [scalesExplored, chordsLearned, progressionsPlayed]);

  const recentSlice = recents.slice(0, 5);

  // Same hand-off as the Saved sheet: scales load straight into the
  // Keyboard tab, chords and progressions go through pendingNav.
  function openRecent(it: SavedItem) {
    const s = useStore.getState();
    s.setRoot(it.root);
    if (it.kind === 'scale') {
      s.setScaleKey(it.scaleKey);
      s.setMode('scales');
      router.push('/');
    } else {
      s.setPendingNav(it);
      // Cast: the generated typed-routes union lags behind the tab files.
      router.push((it.kind === 'chord' ? '/chords' : '/progressions') as any);
    }
  }

  return (
    <View style={styles.wrap}>
      {/* Streak hero */}
      <View style={styles.streakCard}>
        <Text style={styles.streakEyebrow}>CURRENT STREAK</Text>
        <View style={styles.streakRow}>
          <Text style={styles.streakBig}>{currentStreak}</Text>
          <View style={{ flex: 1, marginLeft: SPACE.md }}>
            <Text style={styles.streakUnit}>
              {currentStreak === 1 ? 'day' : 'days'}
            </Text>
            <Text style={styles.streakSub}>
              {longestStreak > currentStreak
                ? `Longest: ${longestStreak} days`
                : longestStreak > 1
                  ? 'New personal best 🎹'
                  : 'Come back tomorrow to keep it going'}
            </Text>
          </View>
        </View>
      </View>

      {/* This week */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>This week</Text>
          <Text style={styles.cardCount}>{weekMinutes} min</Text>
        </View>
        <View style={styles.weekRow}>
          {week.map((d, i) => (
            <View key={i} style={styles.weekCol}>
              <View style={styles.weekTrack}>
                <View style={[
                  styles.weekFill,
                  { height: `${(d.sec / weekMax) * 100}%` },
                  d.sec > 0 && d.sec < weekMax * 0.08 && { height: '8%' },
                ]} />
              </View>
              <Text style={[styles.weekLabel, d.today && styles.weekLabelToday]}>{d.label}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.cardHint}>Minutes spent in exercises each day.</Text>
      </View>

      {/* Exercises */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>Exercises played</Text>
          <Text style={styles.cardCount}>{exercisesTried} / {EXERCISES.length}</Text>
        </View>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${(exercisesTried / EXERCISES.length) * 100}%` }]} />
        </View>
        {records.length > 0 ? (
          <View style={{ marginTop: SPACE.md }}>
            <Text style={styles.sectionLabel}>FASTEST CLEAN TEMPOS</Text>
            {records.map(r => (
              <View key={r.title} style={styles.recordRow}>
                <Text style={styles.recordTitle} numberOfLines={1}>{r.title}</Text>
                <Text style={styles.recordBpm}>{r.bpm} bpm</Text>
              </View>
            ))}
          </View>
        ) : null}
        <Text style={styles.cardHint}>
          {totalExerciseMin > 0
            ? `${totalExerciseMin} minutes of exercises so far. Tap “Felt clean” to log a tempo record.`
            : 'Finish an exercise to start tracking. “Felt clean” logs your tempo record.'}
        </Text>
      </View>

      {/* Library progress */}
      <ProgressBar
        title="Scales explored"
        done={totals.scales.done}
        total={totals.scales.total}
        hint="Tap ▶ Play scale on the Keyboard tab to count a scale."
      />
      <ProgressBar
        title="Chords learned"
        done={totals.chords.done}
        total={totals.chords.total}
        hint="Play any chord in the Chord library to count it."
      />
      <ProgressBar
        title="Progressions played"
        done={totals.progressions.done}
        total={totals.progressions.total}
        hint="Play a named progression via ▶ on the Progressions tab."
      />

      {nextUp && (
        <View style={styles.nextCard}>
          <Text style={styles.nextEyebrow}>UP NEXT</Text>
          <Text style={styles.nextText}>
            Try the <Text style={styles.nextName}>{nextUp.name}</Text> {nextUp.label} to keep the streak going.
          </Text>
        </View>
      )}

      {recentSlice.length > 0 && (
        <View style={styles.recentSection}>
          <Text style={styles.sectionLabel}>RECENTLY PRACTICED</Text>
          {recentSlice.map((r, i) => (
            <TouchableOpacity
              key={i}
              activeOpacity={0.7}
              style={styles.recentRow}
              onPress={() => openRecent(r)}
            >
              <Text style={styles.recentKind}>{r.kind === 'scale' ? '♪' : r.kind === 'chord' ? '♫' : '↝'}</Text>
              <Text style={styles.recentText} numberOfLines={1}>
                {r.kind === 'scale' ? `${NOTES[r.root]} ${r.scaleKey}` :
                 r.kind === 'chord' ? chordShortName(r.root, r.chordKey) :
                 `${NOTES[r.root]} · ${r.progName}`}
              </Text>
              <Text style={styles.recentChevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

function ProgressBar({ title, done, total, hint }: { title: string; done: number; total: number; hint: string }) {
  const pct = total > 0 ? (done / total) * 100 : 0;
  return (
    <View style={styles.card}>
      <View style={styles.cardTitleRow}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardCount}>{done} / {total}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.cardHint}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: SPACE.lg },

  streakCard: {
    padding: SPACE.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(224,204,88,0.32)',
    backgroundColor: 'rgba(224,204,88,0.06)',
    marginBottom: SPACE.lg,
  },
  streakEyebrow: {
    fontSize: 10, fontWeight: '700',
    color: '#E0CC58', letterSpacing: 1.5,
    fontFamily: FONT_FAMILY.mono,
    marginBottom: 6,
  },
  streakRow: { flexDirection: 'row', alignItems: 'center' },
  streakBig: {
    fontSize: 56, fontWeight: '800',
    color: COLORS.text, letterSpacing: -2,
    fontFamily: FONT_FAMILY.mono,
    lineHeight: 58,
  },
  streakUnit: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  streakSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  card: {
    padding: SPACE.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    marginBottom: SPACE.md,
  },
  cardTitleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  cardCount: {
    fontSize: 13, fontWeight: '700', color: COLORS.accent,
    fontFamily: FONT_FAMILY.mono, letterSpacing: 0.3,
  },
  cardHint: { fontSize: 11, color: COLORS.textFaint, marginTop: 8, lineHeight: 16 },

  barTrack: {
    height: 6, borderRadius: 3,
    backgroundColor: COLORS.surfaceHigh,
    overflow: 'hidden',
  },
  barFill: { height: '100%', backgroundColor: COLORS.accent, borderRadius: 3 },

  weekRow: { flexDirection: 'row', gap: 6, height: 76 },
  weekCol: { flex: 1, alignItems: 'center' },
  weekTrack: {
    flex: 1, width: '100%', justifyContent: 'flex-end',
    borderRadius: 4, overflow: 'hidden', backgroundColor: COLORS.surfaceHigh,
  },
  weekFill: { width: '100%', backgroundColor: COLORS.accent, borderRadius: 4 },
  weekLabel: { fontSize: 10, color: COLORS.textFaint, marginTop: 4, fontFamily: FONT_FAMILY.mono },
  weekLabelToday: { color: COLORS.text, fontWeight: '700' },

  recordRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  recordTitle: { flex: 1, fontSize: 13, color: COLORS.text },
  recordBpm: {
    fontSize: 12, fontWeight: '700', color: '#3FCB9C',
    fontFamily: FONT_FAMILY.mono, fontVariant: ['tabular-nums'],
  },

  nextCard: {
    marginTop: SPACE.sm,
    padding: SPACE.md,
    borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.accent,
    backgroundColor: COLORS.accentSoft,
  },
  nextEyebrow: {
    fontSize: 10, fontWeight: '700',
    color: COLORS.accent, letterSpacing: 1.2,
    marginBottom: 4,
  },
  nextText: { fontSize: 13, color: COLORS.text, lineHeight: 19 },
  nextName: { fontWeight: '700', color: COLORS.accent },

  recentSection: { marginTop: SPACE.lg },
  sectionLabel: {
    fontSize: 10, fontWeight: '700',
    color: COLORS.textFaint, letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: SPACE.sm,
  },
  recentRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: SPACE.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    marginBottom: 6,
    gap: SPACE.sm,
  },
  recentKind: { fontSize: 16, color: COLORS.accent, width: 20, textAlign: 'center' },
  recentText: { flex: 1, fontSize: 13, color: COLORS.text },
  recentChevron: { fontSize: 18, color: COLORS.textFaint, lineHeight: 20 },
});
