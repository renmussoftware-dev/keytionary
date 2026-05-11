import React, { useMemo, useRef, useEffect } from 'react';
import { ScrollView, View, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, {
  Rect, Circle, Text as SvgText, G, Defs, RadialGradient, Stop,
} from 'react-native-svg';
import {
  NOTES, SCALES, CHORDS, isBlackKey, COLORS as MUSIC_COLORS,
} from '../constants/music';
import { COLORS, FONT_FAMILY } from '../constants/theme';
import { getScaleNotes, getChordNotes, noteLabel } from '../utils/theory';
import { useStore } from '../store/useStore';

// Octave range shown. Middle-octave = OCTAVE_BASE — root pulse appears here.
const OCTAVE_BASE = 4;
const PHONE_OCTAVES = 3;
const TABLET_OCTAVES = 4;

// Note-class → x-offset within an octave, expressed in white-key widths.
// White keys: C(0), D(2), E(4), F(5), G(7), A(9), B(11) sit at integer slots.
// Black keys: positioned between their adjacent white keys, narrower.
const KEY_X_IN_OCTAVE: Record<number, number> = {
  0: 0,    1: 0.7,  2: 1,    3: 1.7,  4: 2,
  5: 3,    6: 3.7,  7: 4,    8: 4.7,  9: 5,    10: 5.7,  11: 6,
};

const WHITE_KEYS_PER_OCTAVE = 7;
const BLACK_KEY_WIDTH_RATIO = 0.62;
const BLACK_KEY_HEIGHT_RATIO = 0.62;

export default function Piano() {
  const { width: screenW } = useWindowDimensions();
  const isTablet = screenW >= 768;

  const octaves = isTablet ? TABLET_OCTAVES : PHONE_OCTAVES;
  const whiteKeyW = isTablet ? 56 : 44;
  const whiteKeyH = isTablet ? 200 : 156;
  const blackKeyW = whiteKeyW * BLACK_KEY_WIDTH_RATIO;
  const blackKeyH = whiteKeyH * BLACK_KEY_HEIGHT_RATIO;
  const dotR = isTablet ? 17 : 14;

  const LEFT_PAD = 8;
  const TOP_PAD = 18;
  const totalWhite = octaves * WHITE_KEYS_PER_OCTAVE;
  const SVG_W = LEFT_PAD * 2 + totalWhite * whiteKeyW;
  const SVG_H = TOP_PAD + whiteKeyH + 24;

  const { root, scaleKey, chordKey, mode, labelMode } = useStore();

  const activeNotes = useMemo(() => {
    if (mode === 'chords') return getChordNotes(root, chordKey);
    return getScaleNotes(root, scaleKey);
  }, [root, scaleKey, chordKey, mode]);

  function getNoteColor(noteIdx: number) {
    if (!activeNotes.includes(noteIdx)) return null;
    if (noteIdx === root) return { ...MUSIC_COLORS.root, isRoot: true };

    const intv = (noteIdx - root + 12) % 12;

    if (mode === 'chords') {
      const ch = CHORDS[chordKey];
      const ci = ch.intervals.map(i => i % 12);
      const pos = ci.indexOf(intv);
      if (pos === 1) return { ...MUSIC_COLORS.third,     isRoot: false };
      if (pos === 2) return { ...MUSIC_COLORS.fifth,     isRoot: false };
      if (pos >= 3) return { ...MUSIC_COLORS.extension, isRoot: false };
    }

    if (mode === 'scales') {
      const sc = SCALES[scaleKey];
      if (sc) {
        let cum = 0;
        const semitones = [0];
        for (const s of sc.steps) { cum += s; semitones.push(cum % 12); }
        const pos = semitones.indexOf(intv);
        if (pos === 2) return { ...MUSIC_COLORS.third,     isRoot: false };
        if (pos === 4) return { ...MUSIC_COLORS.fifth,     isRoot: false };
        if (pos >= 6) return { ...MUSIC_COLORS.extension, isRoot: false };
      }
    }

    return { ...MUSIC_COLORS.scaleTone, isRoot: false };
  }

  // For each note class, its x-offset within an octave (in pixels).
  function noteX(noteClass: number, octaveIdx: number): number {
    return LEFT_PAD + (octaveIdx * WHITE_KEYS_PER_OCTAVE + KEY_X_IN_OCTAVE[noteClass]) * whiteKeyW;
  }

  // Build the list of white keys (octave * 12 + noteClass), then black keys.
  const whiteNotes: { octaveIdx: number; noteClass: number }[] = [];
  const blackNotes: { octaveIdx: number; noteClass: number }[] = [];
  for (let o = 0; o < octaves; o++) {
    for (let nc = 0; nc < 12; nc++) {
      if (isBlackKey(nc)) blackNotes.push({ octaveIdx: o, noteClass: nc });
      else whiteNotes.push({ octaveIdx: o, noteClass: nc });
    }
  }

  // Scroll so the middle octave is visible initially on phone.
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    if (!isTablet && octaves >= 3) {
      // Center the middle octave horizontally.
      const targetX = WHITE_KEYS_PER_OCTAVE * whiteKeyW * Math.floor(octaves / 2) - whiteKeyW;
      scrollRef.current?.scrollTo({ x: Math.max(0, targetX), animated: false });
    }
  }, [isTablet, octaves, whiteKeyW]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
    >
      <Svg width={SVG_W} height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`}>
        <Defs>
          <RadialGradient id="rootGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={MUSIC_COLORS.root.fill} stopOpacity="0.55" />
            <Stop offset="100%" stopColor={MUSIC_COLORS.root.fill} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* White keys */}
        {whiteNotes.map(({ octaveIdx, noteClass }) => {
          const x = noteX(noteClass, octaveIdx);
          return (
            <Rect
              key={`w-${octaveIdx}-${noteClass}`}
              x={x} y={TOP_PAD}
              width={whiteKeyW - 1} height={whiteKeyH}
              rx={3}
              fill="#F5F2EA"
              stroke="#2A2A30"
              strokeWidth={1}
            />
          );
        })}

        {/* Black keys — drawn over the white-key boundaries */}
        {blackNotes.map(({ octaveIdx, noteClass }) => {
          const x = noteX(noteClass, octaveIdx) + (whiteKeyW - blackKeyW) / 2 - (whiteKeyW * KEY_X_IN_OCTAVE[noteClass] % 1 === 0 ? 0 : 0);
          // Black key starts at noteX exactly (the X_IN_OCTAVE lookup already
          // accounts for the 0.3W left-offset).
          const xActual = noteX(noteClass, octaveIdx);
          return (
            <Rect
              key={`b-${octaveIdx}-${noteClass}`}
              x={xActual} y={TOP_PAD}
              width={blackKeyW} height={blackKeyH}
              rx={2}
              fill="#1A1A1F"
              stroke="#000"
              strokeWidth={0.5}
            />
          );
        })}

        {/* Note dots — highlighted notes, drawn over keys, near the bottom */}
        {[...whiteNotes, ...blackNotes].map(({ octaveIdx, noteClass }) => {
          const col = getNoteColor(noteClass);
          if (!col) return null;
          const isBlack = isBlackKey(noteClass);
          const keyX = noteX(noteClass, octaveIdx);
          const cx = isBlack
            ? keyX + blackKeyW / 2
            : keyX + (whiteKeyW - 1) / 2;
          const cy = isBlack
            ? TOP_PAD + blackKeyH - dotR - 6
            : TOP_PAD + whiteKeyH - dotR - 10;
          const label = noteLabel(noteClass, root, labelMode, scaleKey, chordKey, mode);
          const fs = label.length > 2 ? 8 : 10;
          return (
            <G key={`d-${octaveIdx}-${noteClass}`}>
              {col.isRoot && (
                <Circle cx={cx} cy={cy} r={dotR + 8} fill="url(#rootGlow)" />
              )}
              <Circle
                cx={cx} cy={cy} r={dotR}
                fill={col.fill} stroke={col.stroke} strokeWidth={1.5}
              />
              {label ? (
                <SvgText
                  x={cx} y={cy + fs / 2 + 1}
                  textAnchor="middle" fontSize={fs} fontWeight="700"
                  fill={col.text}
                  fontFamily={FONT_FAMILY.mono}
                >
                  {label}
                </SvgText>
              ) : null}
            </G>
          );
        })}

        {/* Octave labels under each C — anchors the user spatially. */}
        {Array.from({ length: octaves }, (_, o) => (
          <SvgText
            key={`oct-${o}`}
            x={noteX(0, o) + (whiteKeyW - 1) / 2}
            y={SVG_H - 6}
            textAnchor="middle"
            fontSize={9}
            fill={COLORS.textFaint}
            fontFamily={FONT_FAMILY.mono}
          >
            C{OCTAVE_BASE + o}
          </SvgText>
        ))}
      </Svg>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  scrollContent: { paddingBottom: 4 },
});
