import React, { useEffect, useMemo, useRef } from 'react';
import { ScrollView, View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Rect, Circle, Text as SvgText } from 'react-native-svg';
import { isBlackKey } from '../../constants/music';
import { COLORS, FONT_FAMILY, SPACE } from '../../constants/theme';
import type { ExercisePattern, Hand } from './exercisePatterns';

interface Props {
  pattern: ExercisePattern;
  stepIdx: number | null;     // step being played, or null when stopped
}

// White-key slot of each pitch class within an octave; black keys sit
// 0.7 of a white key in, matching the main Piano component.
const KEY_X_IN_OCTAVE: Record<number, number> = {
  0: 0, 1: 0.7, 2: 1, 3: 1.7, 4: 2, 5: 3, 6: 3.7, 7: 4, 8: 4.7, 9: 5, 10: 5.7, 11: 6,
};

// RH in the brand indigo, LH in the 5th-interval teal, so two-hand
// patterns read at a glance.
const HAND_COLOR: Record<Hand, string> = { R: COLORS.accent, L: '#3FA08A' };

/**
 * The keyboard for the exercise player. Shows every key the pattern uses as
 * a faint marker, lights the current step with finger numbers, and keeps
 * the current step scrolled into view on phones.
 */
export default function ExerciseKeyboard({ pattern, stepIdx }: Props) {
  const { width: screenW } = useWindowDimensions();
  const isTablet = screenW >= 768;
  const whiteW = isTablet ? 44 : 34;
  const whiteH = isTablet ? 170 : 132;
  const blackW = whiteW * 0.62;
  const blackH = whiteH * 0.62;
  const dotR = isTablet ? 14 : 11;
  const PAD = 6;
  const TOP = 4;

  // Whole octaves covering every note in the pattern.
  const { lo, octaves } = useMemo(() => {
    const all = pattern.steps.flatMap(s => s.notes.map(n => n.midi));
    const min = Math.min(...all);
    const max = Math.max(...all);
    const lo = Math.floor(min / 12) * 12;
    return { lo, octaves: Math.floor(max / 12) - lo / 12 + 1 };
  }, [pattern]);

  const used = useMemo(() => {
    const m = new Map<number, Hand>();
    for (const s of pattern.steps) for (const n of s.notes) if (!m.has(n.midi)) m.set(n.midi, n.hand);
    return m;
  }, [pattern]);

  const current = stepIdx !== null ? pattern.steps[stepIdx] : null;

  function keyX(midi: number): number {
    const rel = midi - lo;
    return PAD + (Math.floor(rel / 12) * 7 + KEY_X_IN_OCTAVE[rel % 12]) * whiteW;
  }
  function dotPos(midi: number): { cx: number; cy: number } {
    const black = isBlackKey(midi % 12);
    return {
      cx: keyX(midi) + (black ? blackW : whiteW - 1) / 2,
      cy: black ? TOP + blackH - dotR - 5 : TOP + whiteH - dotR - 8,
    };
  }

  const svgW = PAD * 2 + octaves * 7 * whiteW;
  const svgH = TOP + whiteH + 18;
  const keys = Array.from({ length: octaves * 12 }, (_, i) => lo + i);

  // Follow the playing step: centre it whenever it drifts out of the middle
  // half of the view. Resets to the pattern's start when stopped.
  const scrollRef = useRef<ScrollView>(null);
  const viewW = screenW - SPACE.lg * 2;
  const scrollX = useRef(0);
  useEffect(() => {
    if (svgW <= viewW) return;
    const target = current
      ? current.notes.reduce((sum, n) => sum + dotPos(n.midi).cx, 0) / current.notes.length
      : dotPos(pattern.steps[0].notes[0].midi).cx + viewW / 2 - whiteW * 2;
    const inView = target > scrollX.current + viewW * 0.25 && target < scrollX.current + viewW * 0.75;
    if (current && inView) return;
    const x = Math.max(0, Math.min(svgW - viewW, target - viewW / 2));
    scrollX.current = x;
    scrollRef.current?.scrollTo({ x, animated: current !== null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, pattern, svgW, viewW]);

  return (
    <View>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={e => { scrollX.current = e.nativeEvent.contentOffset.x; }}
        scrollEventThrottle={64}
      >
        <Svg width={svgW} height={svgH}>
          {keys.filter(m => !isBlackKey(m % 12)).map(m => (
            <Rect key={`w${m}`} x={keyX(m)} y={TOP} width={whiteW - 1} height={whiteH}
              rx={3} fill="#F5F2EA" stroke="#2A2A30" strokeWidth={1} />
          ))}
          {keys.filter(m => isBlackKey(m % 12)).map(m => (
            <Rect key={`b${m}`} x={keyX(m)} y={TOP} width={blackW} height={blackH}
              rx={2} fill="#1A1A1F" stroke="#000" strokeWidth={0.5} />
          ))}

          {/* Every key the pattern touches, faintly, so the shape is visible
              before you start. */}
          {[...used.entries()].map(([m, hand]) => {
            const { cx, cy } = dotPos(m);
            return (
              <Circle key={`u${m}`} cx={cx} cy={cy} r={dotR * 0.45}
                fill={HAND_COLOR[hand]} opacity={0.45} />
            );
          })}

          {current?.notes.map((n, i) => {
            const { cx, cy } = dotPos(n.midi);
            return (
              <React.Fragment key={`c${i}`}>
                <Circle cx={cx} cy={cy} r={dotR + 6} fill={HAND_COLOR[n.hand]} opacity={0.3} />
                <Circle cx={cx} cy={cy} r={dotR} fill={HAND_COLOR[n.hand]} stroke="#fff" strokeWidth={1.5} />
                {n.finger !== undefined && (
                  <SvgText x={cx} y={cy + 4.5} textAnchor="middle" fontSize={13} fontWeight="700"
                    fill="#fff" fontFamily={FONT_FAMILY.mono}>
                    {n.finger}
                  </SvgText>
                )}
              </React.Fragment>
            );
          })}

          {Array.from({ length: octaves }, (_, o) => (
            <SvgText key={`o${o}`} x={keyX(lo + o * 12) + (whiteW - 1) / 2} y={svgH - 4}
              textAnchor="middle" fontSize={9} fill={COLORS.textFaint} fontFamily={FONT_FAMILY.mono}>
              C{lo / 12 + o - 1}
            </SvgText>
          ))}
        </Svg>
      </ScrollView>

      {/* Legend only when both hands appear, and finger hint when fingered. */}
      <View style={styles.legend}>
        {[...new Set(used.values())].length > 1 && (
          <>
            <View style={[styles.swatch, { backgroundColor: HAND_COLOR.L }]} />
            <Text style={styles.legendText}>Left hand</Text>
            <View style={[styles.swatch, { backgroundColor: HAND_COLOR.R }]} />
            <Text style={styles.legendText}>Right hand</Text>
          </>
        )}
        {pattern.steps.some(s => s.notes.some(n => n.finger !== undefined)) && (
          <Text style={styles.legendText}>Numbers are fingers · 1 = thumb</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    flexWrap: 'wrap', gap: 6, marginTop: SPACE.sm,
  },
  swatch: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: COLORS.textMuted, marginRight: 6 },
});
