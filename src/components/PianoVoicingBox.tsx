import React from 'react';
import { View } from 'react-native';
import Svg, { Rect, Circle, Text as SvgText, G } from 'react-native-svg';
import { FONT_FAMILY } from '../constants/theme';
import { NOTES, CHORDS, isBlackKey, COLORS as MUSIC_COLORS } from '../constants/music';

interface Props {
  lh: number[];        // left-hand MIDI notes
  rh: number[];        // right-hand MIDI notes
  root: number;        // chord root note class (for interval-role colouring)
  chordKey: string;
  maxWidth: number;    // available horizontal space — keys size to fit
}

const KEY_X_IN_OCTAVE: Record<number, number> = {
  0: 0,    1: 0.7,  2: 1,    3: 1.7,  4: 2,
  5: 3,    6: 3.7,  7: 4,    8: 4.7,  9: 5,    10: 5.7,  11: 6,
};
const WHITE_CLASSES = [0, 2, 4, 5, 7, 9, 11];
const BLACK_CLASSES = [1, 3, 6, 8, 10];
const WHITE_KEYS_PER_OCTAVE = 7;
const BLACK_W_RATIO = 0.62;
const BLACK_H_RATIO = 0.62;

// Renders an explicit set of MIDI notes across however many octaves are needed
// to contain them. Unlike PianoChordBox (which derives notes from an inversion
// rotation), this takes raw note lists, so it can draw drop-2, rootless and
// two-hand spread voicings that don't follow the simple stacking pattern.
//
// Right-hand notes are circles, left-hand notes are rounded squares — so the
// two-hand split reads at a glance. Both are coloured by the note's role in
// the chord (root gold / 3rd red / 5th teal / extension blue).
export default function PianoVoicingBox({ lh, rh, root, chordKey, maxWidth }: Props) {
  const ch = CHORDS[chordKey];
  const all = [...lh, ...rh];
  if (!ch || all.length === 0) return null;

  const lhSet = new Set(lh);
  const minMidi = Math.min(...all);
  const maxMidi = Math.max(...all);
  const baseMidi = Math.floor(minMidi / 12) * 12;
  const octaves = Math.max(1, Math.ceil((maxMidi - baseMidi + 1) / 12));
  const totalWhite = octaves * WHITE_KEYS_PER_OCTAVE;

  const PAD = 4;
  let whiteKeyW = Math.floor((maxWidth - PAD * 2) / totalWhite);
  whiteKeyW = Math.max(9, Math.min(whiteKeyW, 30));
  const whiteKeyH = Math.max(54, Math.min(96, Math.round(whiteKeyW * 3.4)));
  const blackKeyW = whiteKeyW * BLACK_W_RATIO;
  const blackKeyH = whiteKeyH * BLACK_H_RATIO;
  const markR = Math.max(5, Math.min(9, Math.round(whiteKeyW * 0.36)));

  const svgW = PAD * 2 + totalWhite * whiteKeyW;
  const svgH = whiteKeyH + 8;

  const noteX = (noteClass: number, octaveIdx: number) =>
    PAD + (octaveIdx * WHITE_KEYS_PER_OCTAVE + KEY_X_IN_OCTAVE[noteClass]) * whiteKeyW;

  // Colour by interval role — mirrors PianoChordBox so the voicing diagrams
  // stay consistent with the rest of the app.
  function roleColor(noteClass: number) {
    if (noteClass === root) return MUSIC_COLORS.root;
    const intv = (noteClass - root + 12) % 12;
    const ci = ch.intervals.map(i => i % 12);
    const pos = ci.indexOf(intv);
    if (pos === 1) return MUSIC_COLORS.third;
    if (pos === 2) return MUSIC_COLORS.fifth;
    if (pos >= 3) return MUSIC_COLORS.extension;
    return MUSIC_COLORS.scaleTone;
  }

  const whiteKeys: { o: number; nc: number }[] = [];
  const blackKeys: { o: number; nc: number }[] = [];
  for (let o = 0; o < octaves; o++) {
    for (const nc of WHITE_CLASSES) whiteKeys.push({ o, nc });
    for (const nc of BLACK_CLASSES) blackKeys.push({ o, nc });
  }

  const noteSet = new Set(all);

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
        {whiteKeys.map(({ o, nc }) => (
          <Rect
            key={`w-${o}-${nc}`}
            x={noteX(nc, o)} y={0}
            width={whiteKeyW - 1} height={whiteKeyH}
            rx={2} fill="#F5F2EA" stroke="#2A2A30" strokeWidth={0.5}
          />
        ))}
        {blackKeys.map(({ o, nc }) => (
          <Rect
            key={`b-${o}-${nc}`}
            x={noteX(nc, o)} y={0}
            width={blackKeyW} height={blackKeyH}
            rx={1.5} fill="#1A1A1F"
          />
        ))}

        {[...whiteKeys, ...blackKeys].map(({ o, nc }) => {
          const midi = baseMidi + o * 12 + nc;
          if (!noteSet.has(midi)) return null;
          const col = roleColor(nc);
          const black = isBlackKey(nc);
          const keyX = noteX(nc, o);
          const cx = black ? keyX + blackKeyW / 2 : keyX + (whiteKeyW - 1) / 2;
          const cy = black ? blackKeyH - markR - 3 : whiteKeyH - markR - 5;
          const isLeft = lhSet.has(midi);
          return (
            <G key={`m-${o}-${nc}`}>
              {isLeft ? (
                <Rect
                  x={cx - markR} y={cy - markR}
                  width={markR * 2} height={markR * 2}
                  rx={3}
                  fill={col.fill} stroke={col.stroke} strokeWidth={1}
                />
              ) : (
                <Circle
                  cx={cx} cy={cy} r={markR}
                  fill={col.fill} stroke={col.stroke} strokeWidth={1}
                />
              )}
              {whiteKeyW >= 16 && (
                <SvgText
                  x={cx} y={cy + 3}
                  textAnchor="middle"
                  fontSize={markR > 7 ? 8 : 7}
                  fontWeight="700"
                  fill={col.text}
                  fontFamily={FONT_FAMILY.mono}
                >
                  {NOTES[nc]}
                </SvgText>
              )}
            </G>
          );
        })}
      </Svg>
    </View>
  );
}
