import { localDayNumber, mod } from '../../utils/dailyPick';
import {
  fiveFingerPattern, mirrorFiveFingerPattern, hanonPattern, chromaticPattern,
  scaleUpDownPattern, contraryScalePattern, scaleThirdsPattern, scaleFoursPattern,
  arpeggioPattern, brokenChordsPattern, albertiPattern,
  inversionsPattern, diatonicChordsPattern, cadencePattern, guideTonePattern,
  type ExercisePattern, type HandMode,
} from './exercisePatterns';

export type ExerciseCategory = 'warmup' | 'scale' | 'arpeggio' | 'chord';

export interface ExerciseDef {
  id: string;
  category: ExerciseCategory;
  title: string;
  summary: string;
  tip: string;
  usesKey: boolean;               // show the key picker
  usesHands: boolean;             // show the right / left / together picker
  variants?: string[];            // optional extra picker; first entry is the default
  variantLabel?: string;
  variantKind?: 'scale';          // variants are SCALES keys, gated like the scale picker
  defaultBpm: number;
  minutes: number;
  build: (root: number, variant: string, hands: HandMode) => ExercisePattern;
}

export const CATEGORIES: { key: ExerciseCategory; title: string; blurb: string }[] = [
  { key: 'warmup',   title: 'Warm-ups',   blurb: 'Even fingers and a relaxed hand.' },
  { key: 'scale',    title: 'Scales',     blurb: 'Fingerings that carry you across the keys.' },
  { key: 'arpeggio', title: 'Arpeggios',  blurb: 'Chords spread out and played in motion.' },
  { key: 'chord',    title: 'Chords',     blurb: 'Shapes, inversions and the moves between them.' },
];

const SEQUENCE_SCALES = [
  'Major', 'Natural Minor', 'Harmonic Minor', 'Melodic Minor',
  'Pentatonic Major', 'Pentatonic Minor', 'Blues', 'Dorian', 'Mixolydian',
];
const scaleVariants = {
  variants: SEQUENCE_SCALES, variantLabel: 'Scale', variantKind: 'scale' as const,
};

const TRIADS = ['Major', 'Minor', 'Diminished', 'Augmented'];
const SEVENTHS = ['Major 7', 'Dominant 7', 'Minor 7', 'Half-Dim 7', 'Dim 7'];
const INVERSIONS = ['Root position', '1st inversion', '2nd inversion'];
const inversionOf = (v: string) => Math.max(0, INVERSIONS.indexOf(v));

export const EXERCISES: ExerciseDef[] = [
  // ── Warm-ups ───────────────────────────────────────────────────────────────
  {
    id: 'warmup-five-finger', category: 'warmup',
    title: 'Five-finger pattern',
    summary: 'One finger per key, up to the 5th of the scale and back.',
    tip: 'Curve your fingers as if holding a ball, and play from the fingertips, not the pads.',
    usesKey: true, usesHands: true, defaultBpm: 72, minutes: 2,
    build: (r, _v, h) => fiveFingerPattern(r, h),
  },
  {
    id: 'warmup-mirror', category: 'warmup',
    title: 'Mirror five-finger',
    summary: 'Thumbs on the tonic, hands moving apart and back together.',
    tip: 'Both hands use the same finger on every beat. Let that symmetry lead instead of reading two lines.',
    usesKey: true, usesHands: false, defaultBpm: 66, minutes: 2,
    build: r => mirrorFiveFingerPattern(r),
  },
  {
    id: 'warmup-hanon', category: 'warmup',
    title: 'Hanon-style climb',
    summary: 'A five-note shape walked up the white keys and back down.',
    tip: 'Lift each finger high and let it fall. Fingers 4 and 5 are the point: keep them as loud as 1 and 2.',
    usesKey: false, usesHands: true, defaultBpm: 66, minutes: 3,
    build: (_r, _v, h) => hanonPattern(h),
  },
  {
    id: 'warmup-chromatic', category: 'warmup',
    title: 'Chromatic scale',
    summary: 'Every key in the octave, up and back.',
    tip: 'Finger 3 takes every black key. Keep the hand still and let the thumb tuck under to the white keys.',
    usesKey: true, usesHands: true, defaultBpm: 66, minutes: 2,
    build: (r, _v, h) => chromaticPattern(r, h),
  },

  // ── Scales ─────────────────────────────────────────────────────────────────
  {
    id: 'scale-updown', category: 'scale',
    title: 'Scale up and down',
    summary: 'Two octaves of the scale, tonic to tonic.',
    tip: 'Start the thumb moving under early, while the finger before it is still playing. Major scales show fingering.',
    usesKey: true, usesHands: true, ...scaleVariants, defaultBpm: 72, minutes: 3,
    build: (r, v, h) => scaleUpDownPattern(r, v, h),
  },
  {
    id: 'scale-contrary', category: 'scale',
    title: 'Contrary motion',
    summary: 'The major scale with the hands moving away from each other.',
    tip: 'The thumbs cross at the same moment in both hands. Listen for both notes landing exactly together.',
    usesKey: true, usesHands: false, defaultBpm: 60, minutes: 3,
    build: r => contraryScalePattern(r),
  },
  {
    id: 'scale-thirds', category: 'scale',
    title: 'Scale in 3rds',
    summary: 'Skip a note, step back, skip again.',
    tip: 'Keep the hand over the scale position and let the fingers reach. Avoid hopping the whole wrist.',
    usesKey: true, usesHands: true, ...scaleVariants, defaultBpm: 66, minutes: 4,
    build: (r, v, h) => scaleThirdsPattern(r, v, h),
  },
  {
    id: 'scale-fours', category: 'scale',
    title: 'Sequence in 4s',
    summary: 'Four notes up, step back, four more.',
    tip: 'Accent the first note of each group so the sequence stays clear at speed.',
    usesKey: true, usesHands: true, ...scaleVariants, defaultBpm: 66, minutes: 4,
    build: (r, v, h) => scaleFoursPattern(r, v, h),
  },

  // ── Arpeggios ──────────────────────────────────────────────────────────────
  {
    id: 'arp-triad', category: 'arpeggio',
    title: 'Triad arpeggio',
    summary: 'Root, 3rd and 5th across two octaves.',
    tip: 'The thumb has a long way to travel. Rotate the wrist slightly toward it instead of stretching.',
    usesKey: true, usesHands: true, variants: TRIADS, variantLabel: 'Chord',
    defaultBpm: 66, minutes: 3,
    build: (r, v, h) => arpeggioPattern(r, v, h),
  },
  {
    id: 'arp-seventh', category: 'arpeggio',
    title: 'Seventh-chord arpeggio',
    summary: 'Four-note chords spread over two octaves.',
    tip: 'Each octave fits under one hand position. Shift in one smooth move on the root.',
    usesKey: true, usesHands: true, variants: SEVENTHS, variantLabel: 'Chord',
    defaultBpm: 60, minutes: 3,
    build: (r, v, h) => arpeggioPattern(r, v, h),
  },
  {
    id: 'arp-broken', category: 'arpeggio',
    title: 'Broken chords through the key',
    summary: 'Root-3rd-5th-3rd on every chord of the key.',
    tip: 'Major, minor, minor, major, major, minor, diminished. Say each chord name as you reach it.',
    usesKey: true, usesHands: true, defaultBpm: 72, minutes: 4,
    build: (r, _v, h) => brokenChordsPattern(r, h),
  },
  {
    id: 'arp-alberti', category: 'arpeggio',
    title: 'Alberti bass',
    summary: 'Left-hand I–IV–V–I broken low, high, middle, high.',
    tip: 'Keep the thumb light. The bottom note carries the harmony; the rest is accompaniment.',
    usesKey: true, usesHands: false, defaultBpm: 80, minutes: 3,
    build: r => albertiPattern(r),
  },

  // ── Chords ─────────────────────────────────────────────────────────────────
  {
    id: 'chord-inversions', category: 'chord',
    title: 'Triad inversions',
    summary: 'One chord through every inversion to the octave and back.',
    tip: 'Watch where the root goes. It moves from the bottom to the top to the middle of the shape.',
    usesKey: true, usesHands: true, variants: TRIADS, variantLabel: 'Chord',
    defaultBpm: 72, minutes: 3,
    build: (r, v, h) => inversionsPattern(r, v, h),
  },
  {
    id: 'chord-diatonic', category: 'chord',
    title: 'Triads through the key',
    summary: 'All seven chords of the key as block chords.',
    tip: 'The hand keeps one shape the whole way. Only the quality under it changes.',
    usesKey: true, usesHands: true, variants: INVERSIONS, variantLabel: 'Inversion',
    defaultBpm: 72, minutes: 3,
    build: (r, v, h) => diatonicChordsPattern(r, false, inversionOf(v), h),
  },
  {
    id: 'chord-sevenths', category: 'chord',
    title: 'Sevenths through the key',
    summary: 'Imaj7, ii7, iii7 and the rest, up and back.',
    tip: 'Use fingers 1-2-3-5. Listen for the dominant V7, the one chord with a tritone in it.',
    usesKey: true, usesHands: true, defaultBpm: 66, minutes: 3,
    build: (r, _v, h) => diatonicChordsPattern(r, true, 0, h),
  },
  {
    id: 'chord-cadence', category: 'chord',
    title: 'I–IV–V–I cadence',
    summary: 'Root in the left hand, closest inversions in the right.',
    tip: 'Keep any note the next chord shares and move the others by step. That is voice leading.',
    usesKey: true, usesHands: false, variants: INVERSIONS, variantLabel: 'Start on',
    defaultBpm: 72, minutes: 3,
    build: (r, v) => cadencePattern(r, inversionOf(v)),
  },
  {
    id: 'chord-guide-tones', category: 'chord',
    title: 'ii–V–I guide tones',
    summary: 'Just the 3rd and 7th of each chord over the root.',
    tip: 'One voice holds and the other drops a half step. Those two notes are what make the change sound like jazz.',
    usesKey: true, usesHands: false, variants: ['3rd on bottom', '7th on bottom'], variantLabel: 'Voicing',
    defaultBpm: 80, minutes: 3,
    build: (r, v) => guideTonePattern(r, v !== '7th on bottom'),
  },
];

export function exercisesIn(category: ExerciseCategory): ExerciseDef[] {
  return EXERCISES.filter(e => e.category === category);
}

export function exerciseById(id: string): ExerciseDef | undefined {
  return EXERCISES.find(e => e.id === id);
}

export interface DailySession {
  root: number;
  items: { def: ExerciseDef; minutes: number }[];
  totalMinutes: number;
}

/**
 * Today's guided session: a warm-up, a scale or arpeggio (alternating
 * days), and a chord exercise, all in one key. Deterministic by local date
 * like the daily pick, so the card doesn't reshuffle between opens and
 * everyone gets the same session.
 */
export function getDailySession(date: Date = new Date()): DailySession {
  const day = localDayNumber(date);
  const warmups = exercisesIn('warmup');
  const technique = exercisesIn(mod(day, 2) === 0 ? 'scale' : 'arpeggio');
  const chords = exercisesIn('chord');
  const picks = [
    warmups[mod(day, warmups.length)],
    technique[mod(Math.floor(day / 2), technique.length)],
    chords[mod(day, chords.length)],
  ];
  const items = picks.map(def => ({ def, minutes: def.minutes }));
  return {
    root: mod(day, 12),
    items,
    totalMinutes: items.reduce((sum, it) => sum + it.minutes, 0),
  };
}
