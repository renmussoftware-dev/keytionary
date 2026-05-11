import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONT_FAMILY, SPACE } from '../constants/theme';
import { NOTES, SCALES, CHORDS } from '../constants/music';
import { useStore } from '../store/useStore';
import { getScaleNotes, getChordNotes } from '../utils/theory';

const INTERVAL_NAMES = ['R','♭2','2','♭3','3','4','♭5','5','♭6','6','♭7','7'];

export default function InfoPanel() {
  const { root, scaleKey, chordKey, mode, customNotes } = useStore();

  let notes: number[];
  if (mode === 'chords') notes = getChordNotes(root, chordKey);
  else if (mode === 'custom') notes = customNotes;
  else notes = getScaleNotes(root, scaleKey);

  const notesStr = notes.length > 0 ? notes.map(n => NOTES[n]).join(' ') : '—';

  let formula = '—';
  let degrees = '—';
  let description = '';
  let formulaLabel = 'Formula';
  let degreesLabel = 'Degrees';

  if (mode === 'scales') {
    const sc = SCALES[scaleKey];
    formula = sc?.formula || '—';
    degrees = sc?.degrees.join(' ') || '—';
    description = sc?.description || '';
  } else if (mode === 'chords') {
    const ch = CHORDS[chordKey];
    formula = ch?.intervalNames.join(' ') || '—';
    degrees = ch?.description || '—';
    formulaLabel = 'Intervals';
    degreesLabel = 'About';
  } else if (mode === 'custom') {
    formula = customNotes.length > 0
      ? customNotes.map(n => INTERVAL_NAMES[(n - root + 12) % 12]).join(' ')
      : '—';
    degrees = `${customNotes.length} note${customNotes.length === 1 ? '' : 's'}`;
    formulaLabel = 'Intervals';
    degreesLabel = 'Count';
    description = customNotes.length === 0
      ? 'Tap notes below to build your own scale or chord shape.'
      : `Custom selection in ${NOTES[root]}`;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={[styles.col, { flex: 1.25 }]}>
          <Text style={styles.label}>Notes</Text>
          <Text style={styles.value} numberOfLines={2}>{notesStr}</Text>
        </View>
        <View style={[styles.col, styles.colDivider]}>
          <Text style={styles.label}>{formulaLabel}</Text>
          <Text style={styles.value} numberOfLines={2}>{formula}</Text>
        </View>
        <View style={[styles.col, styles.colDivider]}>
          <Text style={styles.label}>{degreesLabel}</Text>
          <Text style={styles.value} numberOfLines={2}>{degrees}</Text>
        </View>
      </View>
      {description ? (
        <Text style={styles.desc} numberOfLines={2}>{description}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: SPACE.md,
    paddingHorizontal: SPACE.lg,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
  },
  col: {
    flex: 1,
    paddingHorizontal: 8,
  },
  colDivider: {
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
  },
  label: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.textFaint,
    letterSpacing: 1.0,
    textTransform: 'uppercase',
    marginBottom: 4,
    fontFamily: FONT_FAMILY.mono,
  },
  value: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.text,
    fontFamily: FONT_FAMILY.mono,
    letterSpacing: 0,
    lineHeight: 15,
  },
  desc: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 18,
    paddingHorizontal: 12,
  },
});
