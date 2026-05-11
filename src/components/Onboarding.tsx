import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  useWindowDimensions, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Rect, Text as SvgText, G } from 'react-native-svg';
import { COLORS, SPACE, RADIUS } from '../constants/theme';

interface Props {
  onDone: () => void;
}

const GOLD   = '#E8D44D';
const RED    = '#D45846';
const GREEN  = '#3FA08A';
const BLUE   = '#5C8FCC';

const KEY_X_IN_OCTAVE: Record<number, number> = {
  0: 0, 1: 0.7, 2: 1, 3: 1.7, 4: 2, 5: 3, 6: 3.7, 7: 4, 8: 4.7, 9: 5, 10: 5.7, 11: 6,
};
const BLACK_SET = new Set([1, 3, 6, 8, 10]);

// Mini piano (1.5 octaves) with optional highlighted notes.
function MiniPiano({ highlights, w = 240 }: {
  highlights: { noteClass: number; octaveIdx: number; color: string; label?: string }[];
  w?: number;
}) {
  const octaves = 1.5;
  const whiteW = w / (octaves * 7);
  const whiteH = whiteW * 4;
  const blackW = whiteW * 0.62;
  const blackH = whiteH * 0.62;

  const whites: { o: number; nc: number }[] = [];
  const blacks: { o: number; nc: number }[] = [];
  const whiteClasses = [0, 2, 4, 5, 7, 9, 11];
  const blackClasses = [1, 3, 6, 8, 10];
  for (let o = 0; o < Math.floor(octaves); o++) {
    whiteClasses.forEach(nc => whites.push({ o, nc }));
    blackClasses.forEach(nc => blacks.push({ o, nc }));
  }
  const partial = Math.round((octaves - Math.floor(octaves)) * 7);
  if (partial > 0) {
    for (let i = 0; i < partial; i++) whites.push({ o: Math.floor(octaves), nc: whiteClasses[i] });
    for (const nc of blackClasses) {
      if (KEY_X_IN_OCTAVE[nc] + 0.62 < partial) blacks.push({ o: Math.floor(octaves), nc });
    }
  }

  function keyX(nc: number, o: number) {
    return (o * 7 + KEY_X_IN_OCTAVE[nc]) * whiteW;
  }

  return (
    <Svg width={w} height={whiteH + 4} viewBox={`0 0 ${w} ${whiteH + 4}`}>
      {whites.map(({ o, nc }) => (
        <Rect key={`w-${o}-${nc}`}
          x={keyX(nc, o)} y={0}
          width={whiteW - 1} height={whiteH}
          rx={2} fill="#F5F2EA" stroke="#1A1A20" strokeWidth={0.5}
        />
      ))}
      {blacks.map(({ o, nc }) => (
        <Rect key={`b-${o}-${nc}`}
          x={keyX(nc, o)} y={0}
          width={blackW} height={blackH}
          rx={1.5} fill="#1A1A1F"
        />
      ))}
      {highlights.map((h, i) => {
        const isBlack = BLACK_SET.has(h.noteClass);
        const x = keyX(h.noteClass, h.octaveIdx);
        const cx = isBlack ? x + blackW / 2 : x + (whiteW - 1) / 2;
        const cy = isBlack ? blackH - 8 : whiteH - 12;
        return (
          <G key={i}>
            <Circle cx={cx} cy={cy} r={6} fill={h.color} stroke="#1A1A20" strokeWidth={1} />
            {h.label && (
              <SvgText x={cx} y={cy + 3} textAnchor="middle" fontSize={6.5} fontWeight="700" fill="#fff">
                {h.label}
              </SvgText>
            )}
          </G>
        );
      })}
    </Svg>
  );
}

function MiniChord() {
  return (
    <MiniPiano
      w={180}
      highlights={[
        { noteClass: 0,  octaveIdx: 0, color: GOLD,  label: 'C' },
        { noteClass: 4,  octaveIdx: 0, color: RED,   label: 'E' },
        { noteClass: 7,  octaveIdx: 0, color: GREEN, label: 'G' },
      ]}
    />
  );
}

function MiniScale() {
  return (
    <MiniPiano
      w={240}
      highlights={[
        { noteClass: 0,  octaveIdx: 0, color: GOLD },
        { noteClass: 2,  octaveIdx: 0, color: '#3F3F47' },
        { noteClass: 4,  octaveIdx: 0, color: RED },
        { noteClass: 5,  octaveIdx: 0, color: '#3F3F47' },
        { noteClass: 7,  octaveIdx: 0, color: GREEN },
        { noteClass: 9,  octaveIdx: 0, color: '#3F3F47' },
        { noteClass: 11, octaveIdx: 0, color: BLUE },
        { noteClass: 0,  octaveIdx: 1, color: GOLD },
      ]}
    />
  );
}

function MiniProgressions() {
  const chords = ['I', 'IV', 'V', 'I'];
  const colors = [GOLD, BLUE, GREEN, GOLD];
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
      {chords.map((c, i) => (
        <View key={i} style={{
          width: 52, height: 52, borderRadius: 10,
          backgroundColor: i === 0 ? colors[i] + '22' : 'rgba(255,255,255,0.04)',
          borderWidth: i === 0 ? 2 : 1,
          borderColor: i === 0 ? colors[i] : '#2E2E38',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ color: colors[i], fontSize: 18, fontWeight: '700' }}>{c}</Text>
        </View>
      ))}
    </View>
  );
}

const SLIDES = [
  {
    emoji: '🎹',
    title: 'Welcome to\nKeytionary',
    subtitle: 'Your complete piano theory companion — every scale and chord, mapped on the keys.',
    illustration: null,
    accent: GOLD,
  },
  {
    emoji: null,
    title: 'The Keyboard',
    subtitle: 'See any scale mapped across the keys, in every key. Color-coded by interval: root, 3rd, 5th, extensions.',
    illustration: 'scale',
    accent: GREEN,
  },
  {
    emoji: null,
    title: 'Chord Library',
    subtitle: '35 chord types lit up on the keyboard with real piano audio. Tap any chord to hear it.',
    illustration: 'chord',
    accent: GOLD,
  },
  {
    emoji: null,
    title: 'Progressions',
    subtitle: 'Play through 22 essential chord progressions with real piano audio at any BPM.',
    illustration: 'progressions',
    accent: BLUE,
  },
];

export default function Onboarding({ onDone }: Props) {
  const { width } = useWindowDimensions();
  const [current, setCurrent] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  function goTo(index: number) {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    setCurrent(index);
    scrollRef.current?.scrollTo({ x: index * width, animated: false });
  }

  function next() {
    if (current < SLIDES.length - 1) goTo(current + 1);
    else onDone();
  }

  const slide = SLIDES[current];
  const isLast = current === SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.safe}>
      {!isLast && (
        <TouchableOpacity style={styles.skip} onPress={onDone}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.illustrationWrap}>
          {slide.emoji ? (
            <Text style={styles.emoji}>{slide.emoji}</Text>
          ) : slide.illustration === 'scale' ? (
            <View style={styles.illustrationBox}>
              <MiniScale />
            </View>
          ) : slide.illustration === 'chord' ? (
            <View style={styles.illustrationBox}>
              <MiniChord />
              <View style={{ marginLeft: 24 }}>
                <Text style={[styles.chordName, { color: slide.accent }]}>C Major</Text>
                <Text style={styles.chordIntervals}>R · 3 · 5</Text>
                <Text style={styles.chordDesc}>Bright and stable.</Text>
              </View>
            </View>
          ) : slide.illustration === 'progressions' ? (
            <View style={styles.illustrationBox}>
              <MiniProgressions />
            </View>
          ) : null}
        </View>

        <View style={styles.textWrap}>
          <View style={[styles.accentLine, { backgroundColor: slide.accent }]} />
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.subtitle}>{slide.subtitle}</Text>
        </View>
      </Animated.View>

      <View style={styles.bottom}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => goTo(i)}>
              <View style={[
                styles.dot,
                i === current && { backgroundColor: slide.accent, width: 20 },
              ]} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: slide.accent }]}
          onPress={next}
          activeOpacity={0.85}
        >
          <Text style={[styles.btnText, { color: current === 0 ? '#1a1400' : '#fff' }]}>
            {isLast ? 'Start Playing' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: COLORS.bg },
  skip:             { position: 'absolute', top: 56, right: 24, zIndex: 10, padding: 8 },
  skipText:         { color: COLORS.textMuted, fontSize: 14 },

  content:          { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },

  illustrationWrap: { height: 180, alignItems: 'center', justifyContent: 'center', marginBottom: SPACE.xl },
  illustrationBox:  { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACE.lg, borderWidth: 1, borderColor: COLORS.border },
  emoji:            { fontSize: 80 },

  chordName:        { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  chordIntervals:   { fontSize: 13, color: COLORS.textMuted, marginBottom: 4 },
  chordDesc:        { fontSize: 13, color: COLORS.textMuted },

  textWrap:         { alignItems: 'flex-start', width: '100%' },
  accentLine:       { width: 36, height: 3, borderRadius: 2, marginBottom: SPACE.md },
  title:            { fontSize: 32, fontWeight: '700', color: COLORS.text, lineHeight: 40, marginBottom: SPACE.md },
  subtitle:         { fontSize: 16, color: COLORS.textMuted, lineHeight: 24 },

  bottom:           { paddingHorizontal: 32, paddingBottom: 32, gap: SPACE.xl },
  dots:             { flexDirection: 'row', gap: 8, alignItems: 'center' },
  dot:              { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.border },

  btn:              { borderRadius: RADIUS.full, paddingVertical: 16, alignItems: 'center' },
  btnText:          { fontSize: 16, fontWeight: '700' },
});
