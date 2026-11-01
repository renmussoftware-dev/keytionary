import { SCALES, CHORDS } from '../../constants/music';

/**
 * Piano exercise patterns. Each builder returns the sequence of steps the
 * player walks through, one step per click (or per `clicksPerStep` clicks
 * for chord work). Notes are absolute MIDI in the audio engine's convention
 * (60 = C4).
 *
 * Fingerings are only attached where there's a standard, key-independent
 * answer: five-finger positions, Hanon, the chromatic scale, block triads,
 * and major scales (from the usual per-key table). Everything else is left
 * unfingered rather than guessed.
 */

export type Hand = 'R' | 'L';

export interface ExerciseNote {
  midi: number;
  hand: Hand;
  finger?: number;
}

export interface ExerciseStep {
  notes: ExerciseNote[];
  group: number;            // index into groupNames
}

export interface ExercisePattern {
  steps: ExerciseStep[];
  beats: number;            // clicks per bar; also the count-in length
  clicksPerStep: number;    // 1 for single notes, more to hold a chord
  groupNames?: string[];    // caption shown while a group is playing
}

// Which hands play. "Together" means parallel motion, LH an octave down.
export type HandMode = 'right' | 'left' | 'both';
export const HAND_OPTIONS: { value: HandMode; label: string }[] = [
  { value: 'right', label: 'Right hand' },
  { value: 'left',  label: 'Left hand' },
  { value: 'both',  label: 'Hands together' },
];

// Register each hand starts in: RH from the octave above middle C, LH the
// octave below it.
const RH_BASE = 60;
const LH_BASE = 48;

// ── Scale helpers ────────────────────────────────────────────────────────────

// Semitone offsets of one octave of a scale, without the octave itself.
function scaleOffsets(scaleKey: string): number[] {
  const steps = SCALES[scaleKey]?.steps ?? SCALES.Major.steps;
  const out = [0];
  let cur = 0;
  for (const s of steps.slice(0, -1)) { cur += s; out.push(cur); }
  return out;
}

// Semitones above the tonic for scale degree d (0-based, may be negative or
// span several octaves).
function degreeSemis(offsets: number[], d: number): number {
  const n = offsets.length;
  const oct = Math.floor(d / n);
  return oct * 12 + offsets[((d % n) + n) % n];
}

// ── Fingering tables ─────────────────────────────────────────────────────────
// Major-scale fingering for one octave, tonic to tonic, indexed by tonic
// pitch class. Ascending and descending use the same finger on each note.

const RH_C_GROUP = [1, 2, 3, 1, 2, 3, 4, 5];
const RH_MAJOR: Record<number, number[]> = {
  0: RH_C_GROUP, 2: RH_C_GROUP, 4: RH_C_GROUP, 7: RH_C_GROUP, 9: RH_C_GROUP, 11: RH_C_GROUP,
  1:  [2, 3, 1, 2, 3, 4, 1, 2],   // D♭
  3:  [3, 1, 2, 3, 4, 1, 2, 3],   // E♭
  5:  [1, 2, 3, 4, 1, 2, 3, 4],   // F
  6:  [2, 3, 4, 1, 2, 3, 1, 2],   // F♯
  8:  [3, 4, 1, 2, 3, 1, 2, 3],   // A♭
  10: [4, 1, 2, 3, 1, 2, 3, 4],   // B♭
};

const LH_C_GROUP = [5, 4, 3, 2, 1, 3, 2, 1];
const LH_FLATS = [3, 2, 1, 4, 3, 2, 1, 3];
const LH_MAJOR: Record<number, number[]> = {
  0: LH_C_GROUP, 2: LH_C_GROUP, 4: LH_C_GROUP, 5: LH_C_GROUP, 7: LH_C_GROUP, 9: LH_C_GROUP,
  11: [4, 3, 2, 1, 4, 3, 2, 1],   // B
  6:  [4, 3, 2, 1, 3, 2, 1, 4],   // F♯
  1: LH_FLATS, 3: LH_FLATS, 8: LH_FLATS, 10: LH_FLATS,
};

/**
 * Finger for major-scale degree i (0 up to 7 × octaves) in either hand.
 * RH crosses into each new octave on its starting finger and ends on the
 * table's last finger; LH starts on the table's first finger and repeats
 * the rest of the cycle.
 */
export function majorScaleFinger(root: number, hand: Hand, i: number, octaves = 2): number {
  if (hand === 'R') {
    const t = RH_MAJOR[root];
    if (i % 7 !== 0) return t[i % 7];
    return i === 7 * octaves ? t[7] : t[0];
  }
  const t = LH_MAJOR[root];
  if (i === 0) return t[0];
  return t[((i - 1) % 7) + 1];
}

// Chromatic-scale fingering: 3 on black keys, 1 on white keys, and 2 on
// the white key that follows a white-key half step (F and C going up in
// the RH; E and B in the LH, whose thumb then crosses onto F and C).
function chromaticFinger(midi: number, hand: Hand): number {
  const pc = midi % 12;
  if ([1, 3, 6, 8, 10].includes(pc)) return 3;
  if (hand === 'R') return pc === 5 || pc === 0 ? 2 : 1;
  return pc === 4 || pc === 11 ? 2 : 1;
}

// ── Builders ─────────────────────────────────────────────────────────────────

function note(midi: number, hand: Hand, finger?: number): ExerciseNote {
  return { midi, hand, finger };
}

// Apply a hand mode to a single-line pattern written for the RH. `fingerFor`
// gets the hand and the step index and returns that note's finger (or
// undefined). LH plays the same line an octave lower; "both" plays both.
function withHands(
  semis: number[], root: number, mode: HandMode,
  fingerFor: (hand: Hand, i: number) => number | undefined,
  groupOf: (i: number) => number = () => 0,
): ExerciseStep[] {
  return semis.map((s, i) => {
    const notes: ExerciseNote[] = [];
    if (mode !== 'right') notes.push(note(LH_BASE + root + s, 'L', fingerFor('L', i)));
    if (mode !== 'left')  notes.push(note(RH_BASE + root + s, 'R', fingerFor('R', i)));
    return { notes, group: groupOf(i) };
  });
}

// Up and back down, without repeating the top note or the starting note
// (the loop returns to it).
function upAndDown<T>(up: T[]): T[] {
  return [...up, ...up.slice(1, -1).reverse()];
}

/** Five-finger position: 1-2-3-4-5-4-3-2 on the first five major degrees. */
export function fiveFingerPattern(root: number, mode: HandMode): ExercisePattern {
  const degs = [0, 1, 2, 3, 4, 3, 2, 1];
  const offs = scaleOffsets('Major');
  const semis = degs.map(d => degreeSemis(offs, d));
  return {
    steps: withHands(semis, root, mode, (hand, i) => hand === 'R' ? degs[i] + 1 : 5 - degs[i]),
    beats: 4, clicksPerStep: 1,
  };
}

/**
 * Mirror five-finger: thumbs share the tonic (an octave apart) and the
 * hands move outward and back in contrary motion. Both hands use the same
 * finger at every step.
 */
export function mirrorFiveFingerPattern(root: number): ExercisePattern {
  const degs = [0, 1, 2, 3, 4, 3, 2, 1];
  const offs = scaleOffsets('Major');
  return {
    steps: degs.map(d => ({
      notes: [
        note(LH_BASE + root + degreeSemis(offs, -d), 'L', d + 1),
        note(RH_BASE + root + degreeSemis(offs, d), 'R', d + 1),
      ],
      group: 0,
    })),
    beats: 4, clicksPerStep: 1,
  };
}

/**
 * Hanon-style finger independence in C: the 1-2-3-4-5-4-3-2 shape (a third,
 * then stepwise) climbing one white key at a time for an octave, then the
 * mirror image coming back down.
 */
export function hanonPattern(mode: HandMode): ExercisePattern {
  const offs = scaleOffsets('Major');
  const up = [0, 2, 3, 4, 5, 4, 3, 2];
  const degs: number[] = [];
  const groups: number[] = [];
  const names: string[] = [];
  const NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  for (let s = 0; s < 7; s++) {
    for (const u of up) { degs.push(s + u); groups.push(names.length); }
    names.push(`Climbing from ${NAMES[s % 7]}`);
  }
  for (let s = 12; s >= 6; s--) {
    for (const u of up) { degs.push(s - u); groups.push(names.length); }
    names.push(`Descending from ${NAMES[s % 7]}`);
  }
  // Ascending shapes use 1-2-3-4-5-4-3-2 in the RH and 5-4-3-2-1-2-3-4 in
  // the LH; the descending mirror swaps them.
  const RH_UP = [1, 2, 3, 4, 5, 4, 3, 2];
  const LH_UP = [5, 4, 3, 2, 1, 2, 3, 4];
  const semis = degs.map(d => degreeSemis(offs, d));
  return {
    steps: withHands(semis, 0, mode, (hand, i) => {
      const ascending = i < 56;
      const k = i % 8;
      return (hand === 'R') === ascending ? RH_UP[k] : LH_UP[k];
    }, i => groups[i]),
    beats: 4, clicksPerStep: 1,
    groupNames: names,
  };
}

/** Chromatic scale, one octave up and down from the key's root. */
export function chromaticPattern(root: number, mode: HandMode): ExercisePattern {
  const semis = upAndDown(Array.from({ length: 13 }, (_, i) => i));
  const lhOff = LH_BASE + root;
  const rhOff = RH_BASE + root;
  return {
    steps: withHands(semis, root, mode, (hand, i) => {
      const midi = (hand === 'R' ? rhOff : lhOff) + semis[i];
      // The RH starts on its thumb wherever it lands on a white key; the
      // rule's 2 is for arriving at C or F from below.
      if (i === 0 && hand === 'R' && chromaticFinger(midi, hand) !== 3) return 1;
      return chromaticFinger(midi, hand);
    }),
    beats: 4, clicksPerStep: 1,
  };
}

/**
 * Scale over two octaves, up and back. Fingered only for the major scale,
 * where there's one standard fingering per key.
 */
export function scaleUpDownPattern(root: number, scaleKey: string, mode: HandMode): ExercisePattern {
  const offs = scaleOffsets(scaleKey);
  const n = offs.length;
  const upDegs = Array.from({ length: n * 2 + 1 }, (_, i) => i);
  const degs = upAndDown(upDegs);
  const fingered = scaleKey === 'Major';
  return {
    steps: withHands(
      degs.map(d => degreeSemis(offs, d)), root, mode,
      (hand, i) => fingered ? majorScaleFinger(root, hand, degs[i]) : undefined,
      i => (i < upDegs.length ? 0 : 1),
    ),
    beats: 4, clicksPerStep: 1,
    groupNames: ['Up', 'Down'],
  };
}

/**
 * Major scale in contrary motion: both hands start on the tonic an octave
 * apart, the RH climbs while the LH descends, then they come back together.
 */
export function contraryScalePattern(root: number): ExercisePattern {
  const offs = scaleOffsets('Major');
  const degs = upAndDown(Array.from({ length: 8 }, (_, i) => i));
  return {
    steps: degs.map((d, i) => ({
      notes: [
        // LH degree -d sits on the same note as degree 7-d of the octave
        // below, so it takes that note's finger from the LH table.
        note(LH_BASE + root + degreeSemis(offs, -d), 'L', majorScaleFinger(root, 'L', 7 - d, 1)),
        note(RH_BASE + root + degreeSemis(offs, d), 'R', majorScaleFinger(root, 'R', d, 1)),
      ],
      group: i < 8 ? 0 : 1,
    })),
    beats: 4, clicksPerStep: 1,
    groupNames: ['Hands apart', 'Coming back'],
  };
}

/** Broken thirds: 1-3, 2-4, 3-5… up an octave, then the mirror down. */
export function scaleThirdsPattern(root: number, scaleKey: string, mode: HandMode): ExercisePattern {
  const offs = scaleOffsets(scaleKey);
  const n = offs.length;
  const degs: number[] = [];
  for (let d = 0; d < n; d++) degs.push(d, d + 2);
  for (let d = n + 1; d > 1; d--) degs.push(d, d - 2);
  return {
    steps: withHands(degs.map(d => degreeSemis(offs, d)), root, mode, () => undefined,
      i => (i < n * 2 ? 0 : 1)),
    beats: 4, clicksPerStep: 1,
    groupNames: ['Up in 3rds', 'Down in 3rds'],
  };
}

/** Sequence in 4s: 1-2-3-4, 2-3-4-5… up an octave, then the mirror down. */
export function scaleFoursPattern(root: number, scaleKey: string, mode: HandMode): ExercisePattern {
  const offs = scaleOffsets(scaleKey);
  const n = offs.length;
  const degs: number[] = [];
  for (let d = 0; d < n; d++) degs.push(d, d + 1, d + 2, d + 3);
  for (let d = n + 3; d > 3; d--) degs.push(d, d - 1, d - 2, d - 3);
  return {
    steps: withHands(degs.map(d => degreeSemis(offs, d)), root, mode, () => undefined,
      i => (i < n * 4 ? 0 : 1)),
    beats: 4, clicksPerStep: 1,
    groupNames: ['Up in 4s', 'Down in 4s'],
  };
}

/**
 * Two-octave arpeggio of any chord, up and back. Bars line up with the
 * chord: three clicks for a triad, four for a seventh.
 */
export function arpeggioPattern(root: number, chordKey: string, mode: HandMode): ExercisePattern {
  const ivs = (CHORDS[chordKey]?.intervals ?? CHORDS.Major.intervals).filter(iv => iv < 12);
  const up: number[] = [];
  for (let o = 0; o < 2; o++) for (const iv of ivs) up.push(o * 12 + iv);
  up.push(24);
  const semis = upAndDown(up);
  return {
    steps: withHands(semis, root, mode, () => undefined, i => (i < up.length ? 0 : 1)),
    beats: ivs.length, clicksPerStep: 1,
    groupNames: ['Up', 'Down'],
  };
}

// Roman numerals for major-key diatonic triads and sevenths.
const TRIAD_NUMERALS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
const SEVENTH_NUMERALS = ['Imaj7', 'ii7', 'iii7', 'IVmaj7', 'V7', 'vi7', 'viiø7'];

/**
 * Broken triads through the key: R-3-5-3 on every degree, climbing to the
 * octave and back down.
 */
export function brokenChordsPattern(root: number, mode: HandMode): ExercisePattern {
  const offs = scaleOffsets('Major');
  const order = upAndDown([0, 1, 2, 3, 4, 5, 6, 7]);
  const semis: number[] = [];
  const groups: number[] = [];
  order.forEach((d, gi) => {
    for (const k of [0, 2, 4, 2]) { semis.push(degreeSemis(offs, d + k)); groups.push(gi); }
  });
  return {
    steps: withHands(semis, root, mode, () => undefined, i => groups[i]),
    beats: 4, clicksPerStep: 1,
    groupNames: order.map(d => TRIAD_NUMERALS[d % 7]),
  };
}

/**
 * Alberti bass for the left hand: I–IV–V–I with each chord in its closest
 * inversion, broken low-high-middle-high.
 */
export function albertiPattern(root: number): ExercisePattern {
  // Close-position voicings, voice-led: I root position, IV second
  // inversion, V first inversion, back to I.
  const chords = [[0, 4, 7], [0, 5, 9], [-1, 2, 7], [0, 4, 7]];
  const names = ['I', 'IV', 'V', 'I'];
  const steps: ExerciseStep[] = [];
  chords.forEach((c, gi) => {
    // 5 on the bottom, 1 on top, and 2 rather than 3 when the lower gap is a 4th.
    const fingers = [5, c[1] - c[0] >= 5 ? 2 : 3, 1];
    for (let rep = 0; rep < 2; rep++) {
      for (const k of [0, 2, 1, 2]) {
        steps.push({ notes: [note(LH_BASE + root + c[k], 'L', fingers[k])], group: gi });
      }
    }
  });
  return { steps, beats: 4, clicksPerStep: 1, groupNames: names };
}

// RH and LH fingers for a three-note block chord by inversion.
const RH_TRIAD_FINGERS = [[1, 3, 5], [1, 2, 5], [1, 3, 5]];
const LH_TRIAD_FINGERS = [[5, 3, 1], [5, 3, 1], [5, 2, 1]];

// Chord tones (semitones above `base`) in the given inversion, lowest first.
function invert(ivs: number[], inversion: number): number[] {
  return ivs.map((iv, i) => iv + (i < inversion ? 12 : 0)).sort((a, b) => a - b);
}

function blockChord(
  root: number, semis: number[], mode: HandMode, inversion: number | null, group: number,
): ExerciseStep {
  const notes: ExerciseNote[] = [];
  const triad = semis.length === 3 && inversion !== null;
  if (mode !== 'right') {
    semis.forEach((s, k) =>
      notes.push(note(LH_BASE + root + s, 'L', triad ? LH_TRIAD_FINGERS[inversion!][k] : undefined)));
  }
  if (mode !== 'left') {
    semis.forEach((s, k) =>
      notes.push(note(RH_BASE + root + s, 'R', triad ? RH_TRIAD_FINGERS[inversion!][k] : undefined)));
  }
  return { notes, group };
}

/** One chord through its inversions up to the octave and back down. */
export function inversionsPattern(root: number, chordKey: string, mode: HandMode): ExercisePattern {
  const ivs = CHORDS[chordKey]?.intervals.filter(iv => iv < 12) ?? [0, 4, 7];
  const n = ivs.length;
  const up = Array.from({ length: n + 1 }, (_, i) => i);   // n = root position, an octave up
  const order = upAndDown(up);
  const INV_NAMES = ['Root position', '1st inversion', '2nd inversion', '3rd inversion'];
  return {
    steps: order.map((inv, i) => {
      const semis = inv === n ? ivs.map(iv => iv + 12) : invert(ivs, inv);
      return blockChord(root, semis, mode, inv % n, i);
    }),
    beats: 4, clicksPerStep: 2,
    groupNames: order.map(inv => INV_NAMES[inv % n] + (inv === n ? ' (octave up)' : '')),
  };
}

/** Diatonic triads (or sevenths) in block form, I up to the octave and back. */
export function diatonicChordsPattern(
  root: number, sevenths: boolean, inversion: number, mode: HandMode,
): ExercisePattern {
  const offs = scaleOffsets('Major');
  const order = upAndDown([0, 1, 2, 3, 4, 5, 6, 7]);
  const stack = sevenths ? [0, 2, 4, 6] : [0, 2, 4];
  // Second-inversion triads climb past the top of the sample range in the
  // higher keys, so that variant plays an octave down.
  const shift = !sevenths && inversion === 2 ? -12 : 0;
  return {
    steps: order.map((d, i) => {
      const base = degreeSemis(offs, d);
      const ivs = stack.map(k => degreeSemis(offs, d + k) - base);
      const semis = invert(ivs, sevenths ? 0 : inversion).map(s => s + base + shift);
      return blockChord(root, semis, mode, sevenths ? null : inversion, i);
    }),
    beats: 4, clicksPerStep: 2,
    groupNames: order.map(d => (sevenths ? SEVENTH_NUMERALS : TRIAD_NUMERALS)[d % 7]),
  };
}

// The voicing of `pcs` (semitones above the key) nearest to `prev`, by total
// distance each voice moves. Tries every inversion in the octaves around it.
function closestVoicing(prev: number[], pcs: number[]): number[] {
  let best: number[] = prev;
  let bestCost = Infinity;
  for (let inv = 0; inv < pcs.length; inv++) {
    const shape = invert(pcs, inv);
    for (let shift = -24; shift <= 24; shift += 12) {
      const v = shape.map(s => s + shift);
      const cost = v.reduce((sum, m, i) => sum + Math.abs(m - prev[i]), 0);
      if (cost < bestCost) { bestCost = cost; best = v; }
    }
  }
  return best;
}

// LH roots sit between F2 and E3 so they never crowd the RH chord.
function bassNote(root: number, semis: number): number {
  return 41 + (((root + semis - 5) % 12) + 12) % 12;
}

/**
 * I–IV–V–I cadence: LH plays the root, RH moves each chord to its nearest
 * inversion. The variant picks which inversion the opening I chord is in.
 */
export function cadencePattern(root: number, startInversion: number): ExercisePattern {
  const chords = [
    { name: 'I',  root: 0, pcs: [0, 4, 7] },
    { name: 'IV', root: 5, pcs: [5, 9, 12] },
    { name: 'V',  root: 7, pcs: [7, 11, 14] },
    { name: 'I',  root: 0, pcs: [0, 4, 7] },
  ];
  let rh = invert([0, 4, 7], startInversion);
  return {
    steps: chords.map((c, i) => {
      if (i > 0) rh = closestVoicing(rh, c.pcs);
      return {
        notes: [
          note(bassNote(root, c.root), 'L'),
          ...rh.map(s => note(RH_BASE + root + s, 'R')),
        ],
        group: i,
      };
    }),
    beats: 4, clicksPerStep: 4,
    groupNames: chords.map(c => c.name),
  };
}

/**
 * ii–V–I with guide tones: LH root, RH only the 3rd and 7th of each chord.
 * Each guide tone either holds or moves a half step into the next chord.
 * The variant chooses whether the opening ii7 has its 3rd or 7th on the
 * bottom; the voices then alternate.
 */
export function guideTonePattern(root: number, thirdOnBottom: boolean): ExercisePattern {
  // Semitones above the key's tonic for [ii7, V7, Imaj7].
  const voicings = thirdOnBottom
    ? [[5, 12], [5, 11], [4, 11]]     // F-C → F-B → E-B in C
    : [[0, 5], [-1, 5], [-1, 4]];     // C-F → B-F → B-E in C
  const roots = [2, 7, 0];
  const names = ['ii7', 'V7', 'Imaj7', 'Imaj7'];
  return {
    steps: [0, 1, 2, 2].map((ci, i) => ({
      notes: [
        note(bassNote(root, roots[ci]), 'L'),
        ...voicings[ci].map(s => note(RH_BASE + root + s, 'R')),
      ],
      group: i,
    })),
    beats: 4, clicksPerStep: 4,
    groupNames: names,
  };
}
