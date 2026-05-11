import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { COLORS, FONT_FAMILY, RADIUS, SPACE } from '../constants/theme';
import { NOTES, NOTE_DISPLAY } from '../constants/music';
import { useStore, type AppMode } from '../store/useStore';
import { useProGate } from '../hooks/useProGate';
import SavedSheet from './SavedSheet';

const MODES: { label: string; value: AppMode; pro?: boolean }[] = [
  { label: 'Scales', value: 'scales' },
  { label: 'Chords', value: 'chords' },
];

function SegmentedControl({
  value,
  onChange,
  isPro,
  requirePro,
}: {
  value: AppMode;
  onChange: (m: AppMode) => void;
  isPro: boolean;
  requirePro: (action: () => void) => void;
}) {
  const idx = MODES.findIndex(m => m.value === value);
  const slide = useRef(new Animated.Value(idx)).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: idx,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [idx, slide]);

  const translateX = slide.interpolate({
    inputRange: MODES.map((_, i) => i),
    outputRange: MODES.map((_, i) => `${100 * i}%`),
  });

  return (
    <View style={segStyles.track}>
      <Animated.View
        style={[
          segStyles.indicator,
          { width: `${100 / MODES.length}%`, transform: [{ translateX }] },
        ]}
      />
      {MODES.map(m => {
        const locked = m.pro && !isPro;
        return (
          <TouchableOpacity
            key={m.value}
            onPress={() => locked ? requirePro(() => onChange(m.value)) : onChange(m.value)}
            activeOpacity={0.7}
            style={segStyles.segment}
          >
            <Text style={[segStyles.label, value === m.value && segStyles.labelActive]} numberOfLines={1}>
              {locked ? '🔒 ' : ''}{m.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const segStyles = StyleSheet.create({
  track: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  indicator: {
    position: 'absolute',
    top: 3, bottom: 3, left: 3,
    backgroundColor: COLORS.surfaceActive,
    borderRadius: 9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  segment: {
    flex: 1, paddingVertical: 8,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 1,
  },
  label: {
    fontSize: 13, fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 0.1,
  },
  labelActive: { color: COLORS.text },
});

export default function TopBar() {
  const { root, setRoot, scaleKey, chordKey, mode, setMode } = useStore();
  const { isPro, requirePro } = useProGate();
  const [savedOpen, setSavedOpen] = useState(false);

  const titleSubject = mode === 'chords'
    ? `${NOTES[root]} ${chordKey}`
    : `${NOTES[root]} ${scaleKey}`;

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>Keyboard</Text>
          <Text style={styles.title} numberOfLines={1}>{titleSubject}</Text>
        </View>
        <TouchableOpacity
          onPress={() => setSavedOpen(true)}
          activeOpacity={0.7}
          style={styles.savedBtn}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Text style={styles.savedBtnText}>♥</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.topRow}>
        <SegmentedControl value={mode} onChange={setMode} isPro={isPro} requirePro={requirePro} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.noteRow}>
        {NOTES.map((note, i) => (
          <TouchableOpacity
            key={note}
            onPress={() => setRoot(i)}
            style={[styles.notePill, root === i && styles.notePillActive]}
            activeOpacity={0.7}
          >
            <Text style={[styles.noteText, root === i && styles.noteTextActive]}>
              {NOTE_DISPLAY[note] || note}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <SavedSheet visible={savedOpen} onClose={() => setSavedOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingTop: SPACE.sm,
    paddingBottom: SPACE.md,
    gap: SPACE.sm,
  },
  titleRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACE.lg,
    gap: SPACE.sm,
  },
  eyebrow: {
    fontSize: 11, fontWeight: '500',
    color: COLORS.textMuted, letterSpacing: 0.4,
    marginBottom: 1,
  },
  title: {
    fontSize: 17, fontWeight: '700',
    color: COLORS.text, letterSpacing: -0.2,
  },
  savedBtn: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  savedBtnText: { fontSize: 14, color: '#D45846', fontWeight: '700', lineHeight: 16 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACE.lg,
    gap: SPACE.sm,
  },
  noteRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACE.lg,
    gap: 6,
  },
  notePill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  notePillActive: {
    backgroundColor: COLORS.accentSoft,
    borderColor: COLORS.accent,
  },
  noteText: {
    fontSize: 13, fontWeight: '500',
    color: COLORS.textMuted,
    fontFamily: FONT_FAMILY.mono,
    letterSpacing: 0.2,
  },
  noteTextActive: {
    color: COLORS.text,
    fontWeight: '700',
  },
});
