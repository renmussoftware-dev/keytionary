import { NOTES, SCALES, CHORDS } from '../constants/music';

export function getScaleNotes(root: number, scaleKey: string): number[] {
  const sc = SCALES[scaleKey];
  if (!sc) return [root];
  const notes = [root];
  let cur = root;
  for (let i = 0; i < sc.steps.length - 1; i++) {
    cur = (cur + sc.steps[i]) % 12;
    notes.push(cur);
  }
  return notes;
}

export function getChordNotes(root: number, chordKey: string): number[] {
  const ch = CHORDS[chordKey];
  if (!ch) return [root];
  return ch.intervals.map(iv => (root + iv) % 12);
}

// Build the absolute MIDI notes for a chord starting at a given octave.
// Used by both the audio engine and the chord diagram.
//
// `inversion` rotates the lowest N chord tones up an octave (standard music-
// theory definition): root position [C,E,G] → 1st inv [E,G,C] → 2nd inv
// [G,C,E]. For 7th chords this extends through 3rd inv. For extended chords
// (9/11/13) the math still produces a sensible voicing — the lowest N notes
// climb up while the upper structure stays in place.
//
// Inversion is clamped to [0, intervals.length-1] so callers never see a
// crash from out-of-range values when a user switches chord types.
export function getChordMidi(
  root: number,
  chordKey: string,
  baseOctave = 4,
  inversion = 0,
): number[] {
  const ch = CHORDS[chordKey];
  if (!ch) return [baseOctave * 12 + root];

  const inv = Math.max(0, Math.min(inversion, ch.intervals.length - 1));
  const baseMidi = baseOctave * 12 + root;
  const notes = ch.intervals.map((iv, idx) =>
    baseMidi + iv + (idx < inv ? 12 : 0),
  );
  return notes.sort((a, b) => a - b);
}

// Highest inversion supported for a chord: one less than its number of tones.
// Triad → 2, 7th → 3, 9th → 4. UI typically caps display at 3rd inv since
// higher inversions become esoteric, but this returns the math-true max.
export function maxInversion(chordKey: string): number {
  const ch = CHORDS[chordKey];
  return ch ? Math.max(0, ch.intervals.length - 1) : 0;
}

// Bass note class for slash-chord notation. For inversion N the bass is the
// (N+1)th chord tone — intervals[N] above the root.
//   getInversionBass(0, 'Major', 1) === 4   (C / E)
//   getInversionBass(0, 'Major 7', 3) === 11 (Cmaj7 / B)
export function getInversionBass(root: number, chordKey: string, inversion: number): number {
  const ch = CHORDS[chordKey];
  if (!ch || inversion <= 0) return root;
  const idx = Math.min(inversion, ch.intervals.length - 1);
  return (root + ch.intervals[idx]) % 12;
}

export function noteLabel(
  noteIdx: number,
  root: number,
  labelMode: string,
  scaleKey: string,
  chordKey: string,
  mode: string,
): string {
  if (labelMode === 'none') return '';
  if (labelMode === 'name') return NOTES[noteIdx];
  const intv = (noteIdx - root + 12) % 12;
  if (labelMode === 'interval') {
    const names = ['R','♭2','2','♭3','3','4','♭5','5','♭6','6','♭7','7'];
    return names[intv];
  }
  if (labelMode === 'degree') {
    if (mode === 'chords') {
      const ch = CHORDS[chordKey];
      const pos = ch?.intervals.map(i => i % 12).indexOf(intv) ?? -1;
      return pos >= 0 ? ch.intervalNames[pos] : NOTES[noteIdx];
    }
    const sc = SCALES[scaleKey];
    const scNotes = getScaleNotes(root, scaleKey);
    const pos = scNotes.indexOf(noteIdx);
    return pos >= 0 && sc ? sc.degrees[pos] : NOTES[noteIdx];
  }
  return NOTES[noteIdx];
}
