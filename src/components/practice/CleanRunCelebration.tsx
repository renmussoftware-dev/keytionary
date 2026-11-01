import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Animated, Easing } from 'react-native';
import { COLORS, FONT_FAMILY, RADIUS, SPACE } from '../../constants/theme';

interface Props {
  bpm: number;
  prevBest: number | null;
  nextBpm: number;
  onContinue: () => void;
}

const GREEN = '#3FCB9C';

/**
 * Pops up after "Felt clean". The tempo is the only progress signal an
 * exercise has, so it gets a moment: the best-bpm number counts up from the
 * old best to the new one, with the gain and next session's tempo under it.
 */
export default function CleanRunCelebration({ bpm, prevBest, nextBpm, onContinue }: Props) {
  const isFirst = prevBest === null;
  const isNewBest = isFirst || bpm > prevBest;
  const from = isNewBest ? (prevBest ?? Math.max(0, bpm - 40)) : bpm;

  const [shown, setShown] = useState(from);
  const count = useRef(new Animated.Value(from)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const badge = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const id = count.addListener(({ value }) => setShown(Math.round(value)));
    Animated.sequence([
      Animated.spring(pop, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      Animated.timing(count, {
        toValue: bpm,
        duration: isNewBest ? 900 : 0,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.parallel([
        Animated.spring(badge, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(glow, { toValue: 1, duration: 220, useNativeDriver: true }),
          Animated.timing(glow, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]),
      ]),
    ]).start();
    return () => count.removeListener(id);
  }, []);

  const cardStyle = {
    opacity: pop,
    transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
  };
  const badgeStyle = {
    opacity: badge,
    transform: [{ scale: badge.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
  };
  const glowStyle = {
    opacity: glow,
    transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.25] }) }],
  };

  let eyebrow = 'Clean run';
  if (isFirst) eyebrow = 'First clean tempo';
  else if (isNewBest) eyebrow = 'New personal best';

  let badgeText = `Best stays ${prevBest} bpm`;
  if (isFirst) badgeText = 'Logged as your best';
  else if (isNewBest) badgeText = `▲ +${bpm - prevBest} bpm`;

  return (
    <Modal transparent animationType="fade" onRequestClose={onContinue}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.card, cardStyle]}>
          <Text style={styles.eyebrow}>{isNewBest ? '★ ' : '✓ '}{eyebrow}</Text>

          <View style={styles.numberWrap}>
            <Animated.View style={[styles.glow, glowStyle]} />
            <Text style={styles.number}>{shown}</Text>
          </View>
          <Text style={styles.unit}>BPM</Text>

          <Animated.View style={[styles.badge, !isNewBest && styles.badgeQuiet, badgeStyle]}>
            <Text style={[styles.badgeText, !isNewBest && styles.badgeTextQuiet]}>{badgeText}</Text>
          </Animated.View>

          {isNewBest && !isFirst && (
            <Text style={styles.fromTo}>{prevBest} → {bpm} bpm</Text>
          )}
          <Text style={styles.next}>
            Next time starts at <Text style={styles.nextBold}>{nextBpm} bpm</Text>
          </Text>

          <TouchableOpacity onPress={onContinue} activeOpacity={0.85} style={styles.btn}>
            <Text style={styles.btnText}>Continue</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: SPACE.lg, backgroundColor: 'rgba(0,0,0,0.6)',
  },
  card: {
    width: '100%', maxWidth: 340, alignItems: 'center',
    paddingVertical: SPACE.lg + 4, paddingHorizontal: SPACE.lg,
    borderRadius: RADIUS.lg, borderWidth: 1, borderColor: '#1D9E75',
    backgroundColor: COLORS.surface,
  },
  eyebrow: {
    fontSize: 11, fontWeight: '700', color: GREEN,
    letterSpacing: 1.6, textTransform: 'uppercase', fontFamily: FONT_FAMILY.mono,
    marginBottom: SPACE.sm,
  },
  numberWrap: { alignItems: 'center', justifyContent: 'center', minWidth: 160 },
  glow: {
    position: 'absolute', width: 150, height: 150, borderRadius: 75,
    backgroundColor: 'rgba(63,203,156,0.22)',
  },
  number: {
    fontSize: 72, fontWeight: '800', lineHeight: 80, color: COLORS.text,
    fontFamily: FONT_FAMILY.mono, fontVariant: ['tabular-nums'],
  },
  unit: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1, marginBottom: SPACE.md },
  badge: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: RADIUS.full,
    backgroundColor: 'rgba(29,158,117,0.22)', borderWidth: 1, borderColor: '#1D9E75',
    marginBottom: SPACE.sm,
  },
  badgeQuiet: { backgroundColor: COLORS.surfaceHigh, borderColor: COLORS.border },
  badgeText: { fontSize: 14, fontWeight: '800', color: GREEN, fontVariant: ['tabular-nums'] },
  badgeTextQuiet: { color: COLORS.textMuted, fontWeight: '600' },
  fromTo: { fontSize: 12, color: COLORS.textMuted, fontFamily: FONT_FAMILY.mono, marginBottom: 4 },
  next: { fontSize: 13, color: COLORS.textMuted, marginBottom: SPACE.lg },
  nextBold: { fontWeight: '700', color: COLORS.text },
  btn: {
    alignSelf: 'stretch', paddingVertical: 12, alignItems: 'center',
    borderRadius: RADIUS.full, backgroundColor: '#1D9E75',
  },
  btnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
