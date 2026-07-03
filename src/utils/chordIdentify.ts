import { NOTES, CHORDS } from '../constants/music';
import { chordShorthand } from './theory';

// ── Reverse chord lookup ─────────────────────────────────────────────────────
//
// Given a set of MIDI notes the user has tapped, return every chord type
// from the library that spells that pitch-class set — with the lowest played
// note used to disambiguate root vs. inversion when there's a choice.
//
// Algorithm: for each played pitch class, try it as the root; test every
// chord type in CHORDS; a match means the chord's interval set (mod 12)
// equals the played pitch-class set. Multiple roots can match (e.g. dim7 is
// symmetric — any of its four tones can spell it), so we return all matches
// and sort so the most-likely interpretation lands first.
//
// Preference order:
//   1. Interpretations where the LOWEST played note IS the root (root
//      position) — that's how the user probably thinks of it.
//   2. Simpler chord types first (triads before 7ths before extensions).

export interface ChordIdentification {
  root: number;              // 0-11 pitch class of the identified root
  rootName: string;          // "C", "C#", etc.
  chordType: string;         // key into CHORDS
  chordName: string;         // full display name, e.g. "C Major 7"
  shortName: string;         // shorthand + optional slash, e.g. "Cmaj7/G"
  isRootPosition: boolean;   // true iff the lowest played note IS the root
  bassName: string;          // note-name of lowest played note (for slash)
}

export function identifyChords(midi: number[]): ChordIdentification[] {
  if (midi.length < 3) return [];

  const pitchClasses = new Set(midi.map(n => ((n % 12) + 12) % 12));
  if (pitchClasses.size < 3) return []; // all same pitch class, or duplicates

  const pcCount = pitchClasses.size;
  const lowestMidi = Math.min(...midi);
  const bassPc = ((lowestMidi % 12) + 12) % 12;
  const bassName = NOTES[bassPc];

  const results: ChordIdentification[] = [];

  for (const root of pitchClasses) {
    for (const chordType of Object.keys(CHORDS)) {
      const def = CHORDS[chordType];
      const expected = new Set(def.intervals.map(i => (((root + i) % 12) + 12) % 12));

      // Size + set-membership match. Both required — a triad and a 7-chord
      // reduce to different pitch-class-set sizes, so partial matches don't
      // slip through here (users get the exact chord they played).
      if (expected.size !== pcCount) continue;
      let match = true;
      for (const pc of expected) {
        if (!pitchClasses.has(pc)) { match = false; break; }
      }
      if (!match) continue;

      const isRootPosition = root === bassPc;
      const rootName = NOTES[root];
      const short = `${rootName}${chordShorthand(chordType)}`;
      results.push({
        root,
        rootName,
        chordType,
        chordName: `${rootName} ${chordType}`,
        shortName: isRootPosition ? short : `${short}/${bassName}`,
        isRootPosition,
        bassName,
      });
    }
  }

  results.sort((a, b) => {
    if (a.isRootPosition !== b.isRootPosition) return a.isRootPosition ? -1 : 1;
    return CHORDS[a.chordType].intervals.length - CHORDS[b.chordType].intervals.length;
  });

  return results;
}
