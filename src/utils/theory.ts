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

// Compact chord notation suffix. The verbose chord type names in CHORDS
// ("Major 7", "Half-Dim 7") read naturally in the detail card but are too
// long for inline labels like progression chord cards. This maps each
// chord type to its standard pianist shorthand. Empty string for plain
// triads (just the root letter — "C" for C major).
const CHORD_SHORTHAND: Record<string, string> = {
  'Major':       '',
  'Minor':       'm',
  'Diminished':  'dim',
  'Augmented':   'aug',
  'Sus2':        'sus2',
  'Sus4':        'sus4',
  'Dom 7sus4':   '7sus4',
  'Power (5)':   '5',
  'Major 6':     '6',
  'Minor 6':     'm6',
  'Dominant 7':  '7',
  'Major 7':     'maj7',
  'Minor 7':     'm7',
  'Minor Maj7':  'mMaj7',
  'Dim 7':       'dim7',
  'Half-Dim 7':  'm7♭5',
  'Aug 7':       'aug7',
  'Dominant 9':  '9',
  'Major 9':     'maj9',
  'Minor 9':     'm9',
  'Add9':        'add9',
  'Dominant 11': '11',
  'Major 11':    'maj11',
  'Minor 11':    'm11',
  'Dominant 13': '13',
  'Major 13':    'maj13',
  'Minor 13':    'm13',
  'Minor Add9':  'm(add9)',
  'Add11':       'add11',
  '6/9':         '6/9',
  'Minor 6/9':   'm6/9',
  'Dom 7♭5':     '7♭5',
  'Dom 7♭9':     '7♭9',
  'Dom 7♯9':     '7♯9',
  'Dom 7♯11':    '7♯11',
  'Maj7♯11':     'maj7♯11',
};

export function chordShorthand(chordKey: string): string {
  return CHORD_SHORTHAND[chordKey] ?? '';
}

// Root letter + shorthand suffix. "Cmaj7", "Dm", "A7♭5", etc.
export function chordShortName(root: number, chordKey: string): string {
  return NOTES[root] + chordShorthand(chordKey);
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
