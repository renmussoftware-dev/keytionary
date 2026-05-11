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
// Used by the audio engine — preserves chord stacking across octaves for
// extended chords (9, 11, 13) so the voicing keeps its character.
export function getChordMidi(root: number, chordKey: string, baseOctave = 4): number[] {
  const ch = CHORDS[chordKey];
  if (!ch) return [baseOctave * 12 + root];
  return ch.intervals.map(iv => baseOctave * 12 + root + iv);
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
