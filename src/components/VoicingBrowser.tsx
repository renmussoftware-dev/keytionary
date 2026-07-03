import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, ScrollView,
} from 'react-native';
import { COLORS, SPACE, RADIUS, FONT_FAMILY } from '../constants/theme';
import { NOTES } from '../constants/music';
import {
  buildVoicings, realize, LEFT_HAND_PATTERNS, LeftHandId,
} from '../utils/voicings';
import { useAudioEngine } from '../hooks/useAudioEngine';
import { useProGate } from '../hooks/useProGate';
import { useStore } from '../store/useStore';
import { isVoicingFree } from '../constants/subscription';
import PianoVoicingBox from './PianoVoicingBox';

interface Props {
  root: number;
  chordKey: string;
}

// The voicing browser — the answer to "ok, I know it's Cmaj7, but how do I
// actually PLAY it so it sounds good, and what does my left hand do?". Lists
// real-world voicings of the selected chord; tap any card to hear it.
export default function VoicingBrowser({ root, chordKey }: Props) {
  const { width: screenW } = useWindowDimensions();
  const { playChord, preloadMidi } = useAudioEngine();
  const { isPro, requirePro } = useProGate();
  const recordVoicingPlay = useStore(s => s.recordVoicingPlay);
  const voicings = useMemo(() => buildVoicings(root, chordKey), [root, chordKey]);
  const [activeId, setActiveId] = useState<string | null>(null);
  // The left-hand foundation, applied to every voicing. Default to root+5th —
  // the most common comping left hand and an immediate "two-hand" payoff.
  const [lhId, setLhId] = useState<LeftHandId>('root5');

  // Pre-warm the sample pool with every note across every voicing for the
  // current LH pattern. Without this, the first tap of an unwarmed chord
  // staggers — some notes hit cached samples and fire instantly while
  // others lazy-load and arrive late, audible as a stuttered chord attack.
  // By the time the user taps, ensureLoaded is a cache hit for every note.
  const allChordNotes = useMemo(() => {
    const set = new Set<number>();
    voicings.forEach(v => {
      const { lh, rh } = realize(v, lhId, chordKey);
      lh.forEach(n => set.add(n));
      rh.forEach(n => set.add(n));
    });
    return [...set];
  }, [voicings, lhId, chordKey]);
  useEffect(() => {
    if (allChordNotes.length) preloadMidi(allChordNotes);
  }, [allChordNotes, preloadMidi]);

  // Reset highlight when the chord/root changes so a stale id doesn't linger.
  useEffect(() => { setActiveId(null); }, [root, chordKey]);

  // When the left hand changes, re-play whatever's active so you instantly
  // HEAR the foundation change under the same right-hand shape — the core
  // demonstration of the two-hand idea. Skip the initial mount.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    if (!activeId) return;
    const v = voicings.find(x => x.id === activeId);
    if (!v || (!isPro && !isVoicingFree(v.id))) return;
    const { lh, rh } = realize(v, lhId, chordKey);
    playChord([...lh, ...rh]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lhId]);

  // Card spans the screen minus the screen's horizontal padding (SPACE.lg on
  // each side from the parent) and the card's own inner padding.
  const cardInner = screenW - SPACE.lg * 2 - SPACE.md * 2;

  if (voicings.length === 0) return null;

  // Tapping a card plays it — unless it's a Pro-gated voicing for a free user,
  // in which case requirePro routes to the paywall and logs a lock-hit tagged
  // with the voicing id (so Ads Manager shows which voicing converts best).
  function play(id: string, lh: number[], rh: number[]) {
    const fire = () => { setActiveId(id); playChord([...lh, ...rh]); };
    if (isVoicingFree(id)) {
      fire();
      // Count toward the proactive Pro-prompt threshold (the store gates
      // internally on isPro + session/lifetime flags, so this is safe to
      // call unconditionally).
      recordVoicingPlay();
      return;
    }
    requirePro(fire, `voicing:${id}`);
  }

  return (
    <View style={styles.wrap}>
      {/* Left-hand picker — the second pillar. Swap the foundation under every
          voicing and hear it change. Free to use; only the gated RH shapes lock. */}
      <View style={styles.lhPicker}>
        <Text style={styles.lhPickerLabel}>LEFT HAND</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.lhPills}
        >
          {LEFT_HAND_PATTERNS.map(p => (
            <TouchableOpacity
              key={p.id}
              activeOpacity={0.7}
              onPress={() => setLhId(p.id)}
              style={[styles.lhPill, lhId === p.id && styles.lhPillActive]}
            >
              <Text style={[styles.lhPillText, lhId === p.id && styles.lhPillTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {voicings.map(v => {
        const active = v.id === activeId;
        const locked = !isPro && !isVoicingFree(v.id);
        const { lh, rh } = realize(v, lhId, chordKey);
        return (
          <TouchableOpacity
            key={v.id}
            activeOpacity={0.85}
            onPress={() => play(v.id, lh, rh)}
            style={[styles.card, active && styles.cardActive, locked && styles.cardLocked]}
          >
            <View style={styles.headerRow}>
              <View style={styles.tagPill}>
                <Text style={styles.tagText}>{v.tag}</Text>
              </View>
              <Text style={styles.name}>{v.name}</Text>
              <View style={{ flex: 1 }} />
              <Text style={styles.playGlyph}>{locked ? '🔒' : active ? '♪' : '▶ Play'}</Text>
            </View>

            <View style={styles.diagram}>
              {locked ? (
                <View style={[styles.lockedDiagram, { width: cardInner }]}>
                  <Text style={styles.lockIcon}>🔒</Text>
                  <Text style={styles.lockedText}>
                    {'Unlock with Pro to reveal & hear this voicing'}
                  </Text>
                </View>
              ) : (
                <PianoVoicingBox
                  lh={lh}
                  rh={rh}
                  root={root}
                  chordKey={chordKey}
                  maxWidth={cardInner}
                />
              )}
            </View>

            {/* Blurb is marketing copy — it sells the sound without revealing
                the actual notes, so it's safe to show on locked cards too. */}
            <Text style={styles.blurb}>{v.blurb}</Text>

            {/* The specific left-hand notes ARE the value — hide them when
                locked so the diagram can't be read off the screen for free. */}
            {!locked && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>LEFT HAND</Text>
                <Text style={styles.metaNotes}>
                  {lh.length > 0 ? lh.map(noteName).join(' · ') : '—'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={styles.legendCircle} />
          <Text style={styles.legendText}>Right hand</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendSquare} />
          <Text style={styles.legendText}>Left hand</Text>
        </View>
      </View>
    </View>
  );
}

function noteName(midi: number): string {
  return NOTES[midi % 12] + (Math.floor(midi / 12) - 1);
}

const styles = StyleSheet.create({
  wrap: { gap: SPACE.md, marginBottom: SPACE.lg },

  lhPicker: { gap: 6 },
  lhPickerLabel: {
    fontSize: 9, fontWeight: '700',
    color: COLORS.textFaint, letterSpacing: 1,
    fontFamily: FONT_FAMILY.mono,
  },
  lhPills: { flexDirection: 'row', gap: 6, paddingRight: SPACE.md },
  lhPill: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
  },
  lhPillActive: { backgroundColor: COLORS.accentSoft, borderColor: COLORS.accent },
  lhPillText: {
    fontSize: 12, fontWeight: '600',
    color: COLORS.textMuted,
    fontFamily: FONT_FAMILY.mono, letterSpacing: 0.2,
  },
  lhPillTextActive: { color: COLORS.text },

  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACE.md,
  },
  cardActive: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentSoft,
  },
  // Don't dim locked cards — keep the teaser copy readable and enticing. The
  // header lock glyph + locked diagram panel already signal it's gated. A faint
  // accent border reads as "premium" rather than "disabled".
  cardLocked: { borderColor: COLORS.accentGlow },

  lockedDiagram: {
    height: 92,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceHigh,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
    gap: 6,
  },
  lockIcon: { fontSize: 20 },
  lockedText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACE.sm },
  tagPill: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceHigh,
  },
  tagText: {
    fontSize: 9, fontWeight: '700',
    color: COLORS.textMuted, letterSpacing: 1,
    fontFamily: FONT_FAMILY.mono,
  },
  name: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  playGlyph: { fontSize: 14, color: COLORS.accent, fontWeight: '700' },

  diagram: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: SPACE.sm,
  },

  blurb: { fontSize: 12, color: COLORS.textMuted, lineHeight: 17, marginTop: 2 },

  metaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: SPACE.sm,
    paddingTop: SPACE.sm,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  metaLabel: {
    fontSize: 9, fontWeight: '700',
    color: COLORS.textFaint, letterSpacing: 1,
    fontFamily: FONT_FAMILY.mono,
  },
  metaNotes: {
    fontSize: 11, color: COLORS.textMuted,
    fontFamily: FONT_FAMILY.mono, marginLeft: 'auto',
  },

  legendRow: { flexDirection: 'row', gap: SPACE.lg, justifyContent: 'center', marginTop: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendCircle: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: COLORS.textMuted,
  },
  legendSquare: {
    width: 12, height: 12, borderRadius: 3,
    backgroundColor: COLORS.textMuted,
  },
  legendText: { fontSize: 11, color: COLORS.textMuted },
});
