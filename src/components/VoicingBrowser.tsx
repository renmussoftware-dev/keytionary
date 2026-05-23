import React, { useMemo, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, useWindowDimensions,
} from 'react-native';
import { COLORS, SPACE, RADIUS, FONT_FAMILY } from '../constants/theme';
import { NOTES } from '../constants/music';
import { buildVoicings } from '../utils/voicings';
import { useAudioEngine } from '../hooks/useAudioEngine';
import { useProGate } from '../hooks/useProGate';
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
  const { playChord } = useAudioEngine();
  const { isPro, requirePro } = useProGate();
  const voicings = useMemo(() => buildVoicings(root, chordKey), [root, chordKey]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Reset highlight when the chord/root changes so a stale id doesn't linger.
  useEffect(() => { setActiveId(null); }, [root, chordKey]);

  // Card spans the screen minus the screen's horizontal padding (SPACE.lg on
  // each side from the parent) and the card's own inner padding.
  const cardInner = screenW - SPACE.lg * 2 - SPACE.md * 2;

  if (voicings.length === 0) return null;

  // Tapping a card plays it — unless it's a Pro-gated voicing for a free user,
  // in which case requirePro routes to the paywall and logs a lock-hit tagged
  // with the voicing id (so Ads Manager shows which voicing converts best).
  function play(id: string, lh: number[], rh: number[]) {
    const fire = () => { setActiveId(id); playChord([...lh, ...rh]); };
    if (isVoicingFree(id)) { fire(); return; }
    requirePro(fire, `voicing:${id}`);
  }

  return (
    <View style={styles.wrap}>
      {voicings.map(v => {
        const active = v.id === activeId;
        const locked = !isPro && !isVoicingFree(v.id);
        return (
          <TouchableOpacity
            key={v.id}
            activeOpacity={0.85}
            onPress={() => play(v.id, v.lh, v.rh)}
            style={[styles.card, active && styles.cardActive, locked && styles.cardLocked]}
          >
            <View style={styles.headerRow}>
              <View style={styles.tagPill}>
                <Text style={styles.tagText}>{v.tag}</Text>
              </View>
              <Text style={styles.name}>{v.name}</Text>
              <View style={{ flex: 1 }} />
              <Text style={styles.playGlyph}>{locked ? '🔒' : active ? '♪' : '▶'}</Text>
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
                  lh={v.lh}
                  rh={v.rh}
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
                <Text style={styles.metaValue}>{v.leftHand}</Text>
                {v.lh.length > 0 && (
                  <Text style={styles.metaNotes}>
                    {v.lh.map(noteName).join(' · ')}
                  </Text>
                )}
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
  metaValue: { fontSize: 12, fontWeight: '600', color: COLORS.text },
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
