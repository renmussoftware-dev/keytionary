import React, { useMemo, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions,
} from 'react-native';
import { COLORS, RADIUS, SPACE, FONT_FAMILY } from '../constants/theme';
import { NOTES, CHORDS } from '../constants/music';
import { identifyChords } from '../utils/chordIdentify';
import { useAudioEngine } from '../hooks/useAudioEngine';

// ── Chord Identifier ─────────────────────────────────────────────────────────
// User taps notes on a 2-octave keyboard, we spell them back into a chord
// name in real time. Reverse lookup — the "what did I just play?" utility.
// Free; no Pro gate. Handles inversions via slash notation (Cmaj7/G).

const OCTAVES = 2;
const BASE_MIDI = 60; // C4 = leftmost visible C
const WHITE_CLASSES = [0, 2, 4, 5, 7, 9, 11];
const BLACK_CLASSES = [1, 3, 6, 8, 10];
const KEY_X_IN_OCTAVE: Record<number, number> = {
  0: 0,    1: 0.7,  2: 1,    3: 1.7,  4: 2,
  5: 3,    6: 3.7,  7: 4,    8: 4.7,  9: 5,    10: 5.7,  11: 6,
};
const WHITE_PER_OCTAVE = 7;
const BLACK_W_RATIO = 0.62;
const BLACK_H_RATIO = 0.62;

interface TappableKeyProps {
  midi: number;
  selected: boolean;
  isBlack: boolean;
  left: number;
  width: number;
  height: number;
  onToggle: (midi: number) => void;
}

function TappableKey({ midi, selected, isBlack, left, width, height, onToggle }: TappableKeyProps) {
  return (
    <TouchableOpacity
      onPress={() => onToggle(midi)}
      activeOpacity={0.85}
      style={{
        position: 'absolute',
        left, top: 0,
        width, height,
        borderRadius: isBlack ? 3 : 4,
        borderWidth: isBlack ? 0 : 1,
        borderColor: '#2A2A30',
        backgroundColor: selected
          ? COLORS.accent
          : isBlack ? '#1A1A1F' : '#F5F2EA',
        zIndex: isBlack ? 2 : 1,
      }}
    />
  );
}

export default function ChordIdentifier() {
  const { width: screenW } = useWindowDimensions();
  const [selected, setSelected] = useState<number[]>([]);
  const { playChord, preloadMidi } = useAudioEngine();

  const identifications = useMemo(() => identifyChords(selected), [selected]);

  function toggle(midi: number) {
    setSelected(prev =>
      prev.includes(midi) ? prev.filter(n => n !== midi) : [...prev, midi],
    );
  }
  function clear() { setSelected([]); }
  function play() { if (selected.length) playChord(selected); }

  // Pre-warm samples for the whole 2-octave range so tap-to-hear never
  // stutters.
  useEffect(() => {
    const range: number[] = [];
    for (let i = 0; i < OCTAVES * 12; i++) range.push(BASE_MIDI + i);
    preloadMidi(range);
  }, [preloadMidi]);

  // Geometry — fit the keyboard to the available screen width, clamped so
  // tap targets stay usable on tablets.
  const HORIZONTAL_PAD = SPACE.lg * 2;
  const availW = Math.min(screenW - HORIZONTAL_PAD, 640);
  const totalWhite = OCTAVES * WHITE_PER_OCTAVE;
  const whiteW = availW / totalWhite;
  const whiteH = Math.max(140, whiteW * 3.8);
  const blackW = whiteW * BLACK_W_RATIO;
  const blackH = whiteH * BLACK_H_RATIO;

  function midiFor(octaveIdx: number, noteClass: number): number {
    return BASE_MIDI + octaveIdx * 12 + noteClass;
  }
  function xFor(noteClass: number, octaveIdx: number): number {
    return (octaveIdx * WHITE_PER_OCTAVE + KEY_X_IN_OCTAVE[noteClass]) * whiteW;
  }

  const selectedSet = new Set(selected);
  const primary = identifications[0];
  const alternates = identifications.slice(1);

  return (
    <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
      <Text style={styles.eyebrow}>REVERSE LOOKUP</Text>
      <Text style={styles.title}>What chord is this?</Text>
      <Text style={styles.sub}>
        Tap keys to build a chord. We'll spell it for you.
      </Text>

      {/* Tappable 2-octave piano. Black keys are drawn on top of the white
          keys, indexed higher via zIndex so their tap targets win. */}
      <View style={[styles.keyboard, { width: availW, height: whiteH }]}>
        {/* White keys first */}
        {Array.from({ length: OCTAVES }).flatMap((_, o) =>
          WHITE_CLASSES.map(nc => {
            const midi = midiFor(o, nc);
            return (
              <TappableKey
                key={`w-${o}-${nc}`}
                midi={midi}
                selected={selectedSet.has(midi)}
                isBlack={false}
                left={xFor(nc, o)}
                width={whiteW - 1}
                height={whiteH}
                onToggle={toggle}
              />
            );
          }),
        )}
        {/* Black keys overlaid */}
        {Array.from({ length: OCTAVES }).flatMap((_, o) =>
          BLACK_CLASSES.map(nc => {
            const midi = midiFor(o, nc);
            return (
              <TappableKey
                key={`b-${o}-${nc}`}
                midi={midi}
                selected={selectedSet.has(midi)}
                isBlack
                left={xFor(nc, o)}
                width={blackW}
                height={blackH}
                onToggle={toggle}
              />
            );
          }),
        )}
      </View>

      {/* Selected notes readout */}
      {selected.length > 0 && (
        <Text style={styles.selectedNotes}>
          {[...selected].sort((a, b) => a - b).map(noteName).join(' · ')}
        </Text>
      )}

      {/* Identification result */}
      {selected.length === 0 && (
        <Text style={styles.hint}>Tap at least 3 keys.</Text>
      )}
      {selected.length > 0 && selected.length < 3 && (
        <Text style={styles.hint}>Add {3 - selected.length} more note{3 - selected.length === 1 ? '' : 's'} to identify.</Text>
      )}
      {selected.length >= 3 && !primary && (
        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>NOT A STANDARD CHORD</Text>
          <Text style={styles.resultHint}>
            These notes don't spell any of the {Object.keys(CHORDS).length} chord types in the library. Try swapping a note.
          </Text>
        </View>
      )}
      {primary && (
        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>IDENTIFIED</Text>
          <Text style={styles.resultShort}>{primary.shortName}</Text>
          <Text style={styles.resultFull}>
            {primary.chordName}
            {!primary.isRootPosition && (
              <Text style={styles.resultInversion}>{'  ·  '}{primary.bassName} in the bass</Text>
            )}
          </Text>
          {alternates.length > 0 && (
            <View style={styles.altsWrap}>
              <Text style={styles.altsLabel}>Also spells</Text>
              <View style={styles.altsRow}>
                {alternates.slice(0, 4).map((alt, i) => (
                  <View key={i} style={styles.altPill}>
                    <Text style={styles.altText}>{alt.shortName}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {/* Actions */}
      {selected.length > 0 && (
        <View style={styles.actions}>
          <TouchableOpacity onPress={play} style={styles.playBtn} activeOpacity={0.85}>
            <Text style={styles.playBtnText}>▶ Play</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={clear} style={styles.clearBtn} activeOpacity={0.7}>
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

function noteName(midi: number): string {
  return NOTES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: SPACE.lg,
    paddingTop: SPACE.md,
    paddingBottom: SPACE.xxl,
    alignItems: 'center',
    gap: SPACE.md,
  },
  eyebrow: {
    fontSize: 10, fontWeight: '700',
    color: COLORS.textFaint, letterSpacing: 1.5,
    fontFamily: FONT_FAMILY.mono,
    alignSelf: 'flex-start',
  },
  title: {
    fontSize: 24, fontWeight: '700', color: COLORS.text,
    alignSelf: 'flex-start',
    letterSpacing: -0.4,
  },
  sub: {
    fontSize: 13, color: COLORS.textMuted,
    alignSelf: 'flex-start',
    marginBottom: SPACE.sm,
  },
  keyboard: {
    position: 'relative',
    marginTop: SPACE.sm,
    marginBottom: SPACE.md,
    backgroundColor: '#0d0d10',
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  selectedNotes: {
    fontSize: 12, color: COLORS.textMuted,
    fontFamily: FONT_FAMILY.mono,
    letterSpacing: 0.4,
  },
  hint: {
    fontSize: 13, color: COLORS.textFaint,
    fontStyle: 'italic',
    marginTop: SPACE.md,
  },
  resultCard: {
    width: '100%',
    backgroundColor: COLORS.accentSoft,
    borderWidth: 1, borderColor: COLORS.accent,
    borderRadius: RADIUS.lg,
    padding: SPACE.lg,
    marginTop: SPACE.md,
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: 10, fontWeight: '700',
    color: COLORS.accent, letterSpacing: 1.5,
    fontFamily: FONT_FAMILY.mono,
    marginBottom: SPACE.sm,
  },
  resultShort: {
    fontSize: 44, fontWeight: '800', color: COLORS.text,
    letterSpacing: -1.5,
    marginBottom: 4,
    fontFamily: FONT_FAMILY.mono,
  },
  resultFull: {
    fontSize: 14, color: COLORS.textMuted,
  },
  resultInversion: {
    fontSize: 12, color: COLORS.textFaint,
  },
  resultHint: {
    fontSize: 13, color: COLORS.textMuted,
    textAlign: 'center', lineHeight: 19,
  },
  altsWrap: {
    marginTop: SPACE.md,
    alignItems: 'center',
  },
  altsLabel: {
    fontSize: 9, fontWeight: '700',
    color: COLORS.textFaint, letterSpacing: 1.5,
    fontFamily: FONT_FAMILY.mono,
    marginBottom: 8,
  },
  altsRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 6, justifyContent: 'center',
  },
  altPill: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
  },
  altText: {
    fontSize: 12, fontWeight: '600',
    color: COLORS.textMuted,
    fontFamily: FONT_FAMILY.mono,
  },
  actions: {
    flexDirection: 'row', gap: SPACE.sm,
    marginTop: SPACE.md,
  },
  playBtn: {
    paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent,
  },
  playBtnText: {
    color: '#fff', fontWeight: '700', fontSize: 14,
    letterSpacing: 0.3,
  },
  clearBtn: {
    paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
  },
  clearBtnText: {
    color: COLORS.textMuted, fontWeight: '600', fontSize: 14,
  },
});
