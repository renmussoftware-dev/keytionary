import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Rect, Circle, Text as SvgText, G } from 'react-native-svg';
import { COLORS, RADIUS, SPACE, FONT_FAMILY } from '../constants/theme';
import { NOTES, CHORDS, isBlackKey, COLORS as MUSIC_COLORS } from '../constants/music';
import { getChordNotes } from '../utils/theory';

interface Props {
  root: number;
  chordKey: string;
  compact?: boolean;
}

const KEY_X_IN_OCTAVE: Record<number, number> = {
  0: 0,    1: 0.7,  2: 1,    3: 1.7,  4: 2,
  5: 3,    6: 3.7,  7: 4,    8: 4.7,  9: 5,    10: 5.7,  11: 6,
};

const WHITE_KEYS_PER_OCTAVE = 7;
const BLACK_KEY_WIDTH_RATIO = 0.62;
const BLACK_KEY_HEIGHT_RATIO = 0.62;

export default function PianoChordBox({ root, chordKey, compact = false }: Props) {
  const { width: screenW } = useWindowDimensions();
  const isTablet = screenW >= 768;

  // Show 2 octaves so extended chords (9, 11, 13 → up to ~1.75 octaves) fit.
  const octaves = compact ? 1.5 : 2;
  const whiteKeyW = compact ? 12 : isTablet ? 30 : 22;
  const whiteKeyH = compact ? 44 : isTablet ? 110 : 84;
  const blackKeyW = whiteKeyW * BLACK_KEY_WIDTH_RATIO;
  const blackKeyH = whiteKeyH * BLACK_KEY_HEIGHT_RATIO;
  const dotR = compact ? 4 : isTablet ? 9 : 7;

  const PAD = compact ? 2 : 6;
  const totalWhite = Math.ceil(octaves * WHITE_KEYS_PER_OCTAVE);
  const svgW = PAD * 2 + totalWhite * whiteKeyW;
  const svgH = whiteKeyH + (compact ? 6 : 14);

  const ch = CHORDS[chordKey];
  if (!ch) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Unknown chord</Text>
      </View>
    );
  }
  const chordNoteClasses = new Set(getChordNotes(root, chordKey));

  function noteX(noteClass: number, octaveIdx: number): number {
    return PAD + (octaveIdx * WHITE_KEYS_PER_OCTAVE + KEY_X_IN_OCTAVE[noteClass]) * whiteKeyW;
  }

  function getNoteColor(noteClass: number) {
    if (!chordNoteClasses.has(noteClass)) return null;
    if (noteClass === root) return { ...MUSIC_COLORS.root, isRoot: true };
    const intv = (noteClass - root + 12) % 12;
    const ci = ch.intervals.map(i => i % 12);
    const pos = ci.indexOf(intv);
    if (pos === 1) return { ...MUSIC_COLORS.third,     isRoot: false };
    if (pos === 2) return { ...MUSIC_COLORS.fifth,     isRoot: false };
    if (pos >= 3) return { ...MUSIC_COLORS.extension, isRoot: false };
    return { ...MUSIC_COLORS.scaleTone, isRoot: false };
  }

  const whiteNotes: { octaveIdx: number; noteClass: number }[] = [];
  const blackNotes: { octaveIdx: number; noteClass: number }[] = [];
  const fullOctaves = Math.floor(octaves);
  const partialWhite = Math.round((octaves - fullOctaves) * WHITE_KEYS_PER_OCTAVE);
  for (let o = 0; o < fullOctaves; o++) {
    for (let nc = 0; nc < 12; nc++) {
      if (isBlackKey(nc)) blackNotes.push({ octaveIdx: o, noteClass: nc });
      else whiteNotes.push({ octaveIdx: o, noteClass: nc });
    }
  }
  // Partial octave at the end — include only the first N white keys (and any
  // black keys that sit between them) so the diagram doesn't end mid-key.
  if (partialWhite > 0) {
    const o = fullOctaves;
    const whiteClasses = [0, 2, 4, 5, 7, 9, 11];
    for (let i = 0; i < partialWhite; i++) {
      whiteNotes.push({ octaveIdx: o, noteClass: whiteClasses[i] });
    }
    // Black keys whose left edge falls before the last included white key's right edge.
    const lastWhiteRightInOctaves = partialWhite; // in white-key widths within this octave
    const blackClasses = [1, 3, 6, 8, 10];
    for (const nc of blackClasses) {
      if (KEY_X_IN_OCTAVE[nc] + BLACK_KEY_WIDTH_RATIO < lastWhiteRightInOctaves) {
        blackNotes.push({ octaveIdx: o, noteClass: nc });
      }
    }
  }

  return (
    <View style={compact ? styles.compactWrap : styles.wrap}>
      <Svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
        {/* White keys */}
        {whiteNotes.map(({ octaveIdx, noteClass }) => (
          <Rect
            key={`w-${octaveIdx}-${noteClass}`}
            x={noteX(noteClass, octaveIdx)}
            y={0}
            width={whiteKeyW - 1}
            height={whiteKeyH}
            rx={2}
            fill="#F5F2EA"
            stroke="#2A2A30"
            strokeWidth={0.5}
          />
        ))}

        {/* Black keys */}
        {blackNotes.map(({ octaveIdx, noteClass }) => (
          <Rect
            key={`b-${octaveIdx}-${noteClass}`}
            x={noteX(noteClass, octaveIdx)}
            y={0}
            width={blackKeyW}
            height={blackKeyH}
            rx={1.5}
            fill="#1A1A1F"
          />
        ))}

        {/* Highlighted notes */}
        {[...whiteNotes, ...blackNotes].map(({ octaveIdx, noteClass }) => {
          const col = getNoteColor(noteClass);
          if (!col) return null;
          const isBlack = isBlackKey(noteClass);
          const keyX = noteX(noteClass, octaveIdx);
          const cx = isBlack
            ? keyX + blackKeyW / 2
            : keyX + (whiteKeyW - 1) / 2;
          const cy = isBlack
            ? blackKeyH - dotR - 3
            : whiteKeyH - dotR - 5;
          return (
            <G key={`d-${octaveIdx}-${noteClass}`}>
              <Circle
                cx={cx} cy={cy} r={dotR}
                fill={col.fill} stroke={col.stroke} strokeWidth={1}
              />
              {!compact && (
                <SvgText
                  x={cx} y={cy + 3}
                  textAnchor="middle"
                  fontSize={dotR > 7 ? 8 : 7}
                  fontWeight="700"
                  fill={col.text}
                  fontFamily={FONT_FAMILY.mono}
                >
                  {NOTES[noteClass]}
                </SvgText>
              )}
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:        { alignItems: 'center' },
  compactWrap: { alignItems: 'center' },
  empty:       { padding: SPACE.md, alignItems: 'center' },
  emptyText:   { fontSize: 11, color: COLORS.textFaint },
});
