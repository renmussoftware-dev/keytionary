import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { COLORS, FONT_FAMILY, RADIUS, SPACE } from '../../constants/theme';
import { isExerciseFree } from '../../constants/subscription';
import { useProGate } from '../../hooks/useProGate';
import { useStore, todayKey } from '../../store/useStore';
import { NOTES, NOTE_FLAT } from '../../constants/music';
import ExercisePlayer, { type ExerciseResult } from './ExercisePlayer';
import {
  CATEGORIES, exercisesIn, getDailySession, type ExerciseDef,
} from './exerciseCatalog';

interface Props {
  // The Exercises | Progress switch, rendered above the library but hidden
  // while an exercise is open.
  tabs: React.ReactNode;
  onScrollTop: () => void;
}

interface Active {
  def: ExerciseDef;
  root: number;
  sessionIdx: number | null;   // position in today's session, or null from the library
}

/**
 * Practice → Exercises. Hands-on-the-keys play-alongs. Opens on today's
 * guided session, with the full library grouped by category underneath.
 */
export default function Exercises({ tabs, onScrollTop }: Props) {
  const { isPro, requirePro } = useProGate();
  const appRoot = useStore(s => s.root);
  const currentStreak = useStore(s => s.currentStreak);
  const stats = useStore(s => s.exerciseStats);
  const sessionState = useStore(s => s.exerciseSession);
  const recordExerciseDone = useStore(s => s.recordExerciseDone);
  const recordPositiveAction = useStore(s => s.recordPositiveAction);
  const [active, setActive] = useState<Active | null>(null);

  const session = useMemo(() => getDailySession(), []);
  const doneToday = sessionState.date === todayKey() ? sessionState.done : [];
  const sessionDone = (def: ExerciseDef) => doneToday.includes(def.id);
  const sessionComplete = session.items.every(it => sessionDone(it.def));
  const nextIdx = session.items.findIndex(it => !sessionDone(it.def));

  // The exercise that opens today's session is free whatever it is, so the
  // free tier always has a guided start to the day.
  const sessionLocked = (idx: number) =>
    !isPro && idx > 0 && !isExerciseFree(session.items[idx].def.id);

  function open(next: Active, locked: boolean) {
    const launch = () => {
      setActive(next);
      onScrollTop();
    };
    if (locked) requirePro(launch, `exercise:${next.def.id}`);
    else launch();
  }

  function openSessionItem(idx: number) {
    open({ def: session.items[idx].def, root: session.root, sessionIdx: idx }, sessionLocked(idx));
  }

  function handleFinish(result: ExerciseResult) {
    if (!active) return;
    const inSession = active.sessionIdx !== null;
    recordExerciseDone(active.def.id, { ...result, inSession });

    if (inSession) {
      const remaining = session.items.findIndex(
        (it, i) => i !== active.sessionIdx && !sessionDone(it.def),
      );
      if (remaining === -1) {
        // Finishing the whole session is a good moment to ask for a rating.
        recordPositiveAction();
      } else if (!sessionLocked(remaining)) {
        setActive({ def: session.items[remaining].def, root: session.root, sessionIdx: remaining });
        onScrollTop();
        return;
      }
    }
    setActive(null);
    onScrollTop();
  }

  if (active) {
    return (
      <ExercisePlayer
        // Remount per exercise so tempo, timer and pickers start fresh.
        key={`${active.def.id}:${active.sessionIdx}`}
        def={active.def}
        initialRoot={active.root}
        sessionLabel={active.sessionIdx !== null
          ? `Today's session · ${active.sessionIdx + 1} of ${session.items.length}`
          : undefined}
        onFinish={handleFinish}
        onExit={() => { setActive(null); onScrollTop(); }}
      />
    );
  }

  return (
    <View style={styles.wrap}>
      {tabs}

      <Text style={styles.intro}>
        Sit at your piano or keyboard. Each exercise shows a pattern on the keys and runs a click to play along with.
      </Text>

      {/* Today's session */}
      <View style={styles.sessionCard}>
        <View style={styles.sessionHeader}>
          <Text style={styles.eyebrow}>Today's session</Text>
          {currentStreak > 0 && (
            <Text style={styles.streak}>
              {currentStreak}-day streak
            </Text>
          )}
        </View>
        <Text style={styles.sessionTitle}>
          {session.totalMinutes} minutes · Key of {NOTE_FLAT[NOTES[session.root]] ?? NOTES[session.root]}
        </Text>

        {session.items.map((it, i) => {
          const done = sessionDone(it.def);
          const locked = sessionLocked(i);
          return (
            <TouchableOpacity
              key={it.def.id}
              onPress={() => openSessionItem(i)}
              activeOpacity={0.7}
              style={styles.sessionRow}
            >
              <Text style={[styles.check, done && styles.checkDone]}>{done ? '✓' : '○'}</Text>
              <Text style={[styles.sessionItem, locked && styles.lockedText]} numberOfLines={1}>
                {it.def.title}
              </Text>
              <Text style={styles.sessionMeta}>{locked ? '🔒 PRO' : `${it.minutes} min`}</Text>
            </TouchableOpacity>
          );
        })}

        {sessionComplete ? (
          <Text style={styles.sessionCompleteText}>
            Session complete. Come back tomorrow for a new one.
          </Text>
        ) : (
          <TouchableOpacity
            onPress={() => openSessionItem(nextIdx)}
            activeOpacity={0.85}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnText}>
              {doneToday.length > 0 ? 'Continue session' : 'Start session'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {!isPro && (
        <View style={styles.proHint}>
          <Text style={styles.proHintText}>
            <Text style={{ fontWeight: '700' }}>Free:</Text> the first exercise in each category and the
            opener of today's session. The full library and daily session unlock with Pro.
          </Text>
          <TouchableOpacity onPress={() => router.push('/paywall')} activeOpacity={0.85} style={styles.upgradeBtn}>
            <Text style={styles.upgradeBtnText}>Unlock Pro →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Library */}
      {CATEGORIES.map(cat => {
        const list = exercisesIn(cat.key);
        const doneCount = list.filter(e => (stats[e.id]?.completions ?? 0) > 0).length;
        return (
          <View key={cat.key} style={styles.category}>
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryTitle}>{cat.title}</Text>
              <Text style={styles.categoryCount}>{doneCount} / {list.length}</Text>
            </View>
            <Text style={styles.categoryBlurb}>{cat.blurb}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${(doneCount / list.length) * 100}%` }]} />
            </View>

            {list.map(def => {
              const stat = stats[def.id];
              const locked = !isPro && !isExerciseFree(def.id);
              const done = (stat?.completions ?? 0) > 0;
              return (
                <TouchableOpacity
                  key={def.id}
                  onPress={() => open({ def, root: appRoot, sessionIdx: null }, locked)}
                  activeOpacity={0.7}
                  style={[styles.exRow, locked && styles.exRowLocked]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.exTitle, locked && styles.lockedText]}>
                      {done ? '✓ ' : ''}{def.title}
                    </Text>
                    <Text style={styles.exSummary}>{def.summary}</Text>
                  </View>
                  {locked ? (
                    <Text style={styles.exPro}>🔒 PRO</Text>
                  ) : (
                    <Text style={styles.exMeta}>
                      {stat?.bestBpm ? `${stat.bestBpm} bpm` : `${def.minutes} min`}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md },
  intro: { fontSize: 13, color: COLORS.textMuted, lineHeight: 19, marginBottom: SPACE.lg },

  eyebrow: {
    flex: 1,
    fontSize: 10, fontWeight: '600', color: COLORS.textFaint,
    letterSpacing: 1.6, textTransform: 'uppercase', fontFamily: FONT_FAMILY.mono,
  },

  sessionCard: {
    marginBottom: SPACE.lg, padding: SPACE.lg,
    borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.accent,
    backgroundColor: COLORS.surface,
  },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  streak: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  sessionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: SPACE.sm },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  check: { width: 16, fontSize: 14, fontWeight: '700', color: COLORS.textFaint, textAlign: 'center' },
  checkDone: { color: '#3FCB9C' },
  sessionItem: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.text },
  sessionMeta: { fontSize: 12, color: COLORS.textMuted, fontVariant: ['tabular-nums'] },
  sessionCompleteText: { fontSize: 13, fontWeight: '600', color: '#3FCB9C', marginTop: SPACE.sm },

  primaryBtn: {
    marginTop: SPACE.md,
    paddingVertical: 12, alignItems: 'center', borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  proHint: {
    padding: SPACE.md, marginBottom: SPACE.lg,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(83,74,183,0.10)',
    borderWidth: 1, borderColor: 'rgba(83,74,183,0.3)',
  },
  proHintText: { fontSize: 12, color: COLORS.text, lineHeight: 18, marginBottom: 8 },
  upgradeBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent,
  },
  upgradeBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  category: {
    marginBottom: SPACE.md, padding: SPACE.lg,
    borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  categoryTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.text },
  categoryCount: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, fontVariant: ['tabular-nums'] },
  categoryBlurb: { fontSize: 12, color: COLORS.textMuted, marginBottom: SPACE.sm },
  barTrack: {
    height: 4, borderRadius: 2, overflow: 'hidden',
    backgroundColor: COLORS.surfaceActive, marginBottom: SPACE.md,
  },
  barFill: { height: '100%', backgroundColor: COLORS.accent },

  exRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceHigh,
  },
  exRowLocked: { opacity: 0.6 },
  exTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  exSummary: { fontSize: 11, color: COLORS.textFaint, lineHeight: 15 },
  exMeta: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, fontVariant: ['tabular-nums'] },
  exPro: { fontSize: 10, fontWeight: '800', color: '#E8D44D', letterSpacing: 0.6 },
  lockedText: { color: COLORS.textMuted },
});
