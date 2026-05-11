// Common chord-resolution targets — pedagogical "this chord typically wants
// to move to…" suggestions. Static, key-agnostic; we surface the move itself
// and the voice-leading reason, not a key-specific functional analysis.
//
// degreeOffset is in semitones from the source chord's root (0–11).
// targetType must be a key in CHORDS (src/constants/music.ts).

export interface Resolution {
  degreeOffset: number;
  targetType: string;
  intervalLabel: string; // short hint shown on the card, e.g. "P4 up"
  why: string;           // one-line voice-leading explanation
}

// Helpers for legibility of the table below
const SAME = 0;
const HALF_UP = 1;
const M3_UP = 4;
const P4_UP = 5;
const TT = 6;
const P5_UP = 7;
const m6_UP = 8;
const M6_UP = 9;
const m7_UP = 10;

export const RESOLUTIONS: Record<string, Resolution[]> = {

  // ── Triads ────────────────────────────────────────────────────────────────

  'Major': [
    { degreeOffset: P4_UP,  targetType: 'Major',      intervalLabel: 'IV',   why: 'I → IV: classic plagal motion.' },
    { degreeOffset: P5_UP,  targetType: 'Major',      intervalLabel: 'V',    why: 'I → V: opens the door to a perfect cadence.' },
    { degreeOffset: M6_UP,  targetType: 'Minor',      intervalLabel: 'vi',   why: 'I → vi: the relative minor — gentle pivot.' },
  ],

  'Minor': [
    { degreeOffset: P4_UP,  targetType: 'Minor',      intervalLabel: 'iv',   why: 'i → iv: dark sub-dominant move.' },
    { degreeOffset: P5_UP,  targetType: 'Dominant 7', intervalLabel: 'V7',   why: 'i → V7: setup for a strong return to i.' },
    { degreeOffset: m7_UP,  targetType: 'Major',      intervalLabel: '♭VII', why: 'i → ♭VII: rock and modal favorite.' },
  ],

  'Diminished': [
    { degreeOffset: HALF_UP, targetType: 'Major',     intervalLabel: '↑ ½',  why: 'vii° → I: leading-tone resolution upward.' },
    { degreeOffset: HALF_UP, targetType: 'Minor',     intervalLabel: '↑ ½',  why: 'vii° → i in minor: same upward pull.' },
  ],

  'Augmented': [
    { degreeOffset: P4_UP,  targetType: 'Major',      intervalLabel: 'I',    why: 'V+ → I: ♯5 resolves up to the 3rd.' },
    { degreeOffset: P4_UP,  targetType: 'Minor',      intervalLabel: 'i',    why: 'V+ → i: lifts the 5th into the new tonic.' },
  ],

  'Sus2': [
    { degreeOffset: SAME,   targetType: 'Major',      intervalLabel: 'same', why: 'The 2nd resolves up to the 3rd.' },
    { degreeOffset: SAME,   targetType: 'Minor',      intervalLabel: 'same', why: 'The 2nd resolves up to the ♭3.' },
  ],

  'Sus4': [
    { degreeOffset: SAME,   targetType: 'Major',      intervalLabel: 'same', why: 'The suspended 4th resolves down to the 3rd.' },
    { degreeOffset: SAME,   targetType: 'Minor',      intervalLabel: 'same', why: 'The 4th resolves down a half-step to the ♭3.' },
  ],

  'Power (5)': [
    { degreeOffset: SAME,   targetType: 'Major',      intervalLabel: 'same', why: 'Add a 3rd to spell out the major chord.' },
    { degreeOffset: SAME,   targetType: 'Minor',      intervalLabel: 'same', why: 'Add a ♭3 for a minor color.' },
    { degreeOffset: P4_UP,  targetType: 'Power (5)',  intervalLabel: 'IV',   why: 'I5 → IV5: classic riff motion.' },
  ],

  // ── Sixths ────────────────────────────────────────────────────────────────

  'Major 6': [
    { degreeOffset: P4_UP,  targetType: 'Major',      intervalLabel: 'IV',   why: 'Tonic 6 → IV: warm, jazzy plagal.' },
    { degreeOffset: P5_UP,  targetType: 'Dominant 7', intervalLabel: 'V7',   why: 'Tonic 6 → V7: builds tension to come back.' },
  ],

  'Minor 6': [
    { degreeOffset: P5_UP,  targetType: 'Dominant 7', intervalLabel: 'V7',   why: 'i6 → V7: minor tonic pushes to its dominant.' },
    { degreeOffset: P4_UP,  targetType: 'Minor',      intervalLabel: 'iv',   why: 'i6 → iv: stays in the minor world.' },
  ],

  // ── Sevenths — dominants pull strongly ────────────────────────────────────

  'Dominant 7': [
    { degreeOffset: P4_UP,  targetType: 'Major',      intervalLabel: 'I',    why: 'V7 → I: leading tone up, ♭7 down — classic resolution.' },
    { degreeOffset: P4_UP,  targetType: 'Minor',      intervalLabel: 'i',    why: 'V7 → i: same pull into a minor tonic.' },
    { degreeOffset: M6_UP,  targetType: 'Minor',      intervalLabel: 'vi',   why: 'V7 → vi: the deceptive cadence — surprise resolution.' },
  ],

  'Major 7': [
    { degreeOffset: P4_UP,  targetType: 'Major 7',    intervalLabel: 'IVmaj7', why: 'Imaj7 → IVmaj7: smooth jazz tonic move.' },
    { degreeOffset: M6_UP,  targetType: 'Minor 7',    intervalLabel: 'vim7', why: 'Imaj7 → vim7: relative minor in jazz.' },
  ],

  'Minor 7': [
    { degreeOffset: P5_UP,  targetType: 'Dominant 7', intervalLabel: 'V7',   why: 'iim7 → V7: the heart of ii–V–I.' },
    { degreeOffset: P4_UP,  targetType: 'Minor 7',    intervalLabel: 'ivm7', why: 'im7 → ivm7: minor sub-dominant move.' },
  ],

  'Minor Maj7': [
    { degreeOffset: P5_UP,  targetType: 'Dominant 7', intervalLabel: 'V7',   why: 'i(maj7) → V7: cinematic minor-key push.' },
    { degreeOffset: P4_UP,  targetType: 'Minor 7',    intervalLabel: 'ivm7', why: 'i(maj7) → ivm7: keeps the dark color.' },
  ],

  'Dim 7': [
    { degreeOffset: HALF_UP, targetType: 'Major',     intervalLabel: '↑ ½',  why: '°7 → I: each chord tone resolves up by half-step.' },
    { degreeOffset: HALF_UP, targetType: 'Minor',     intervalLabel: '↑ ½',  why: '°7 → i: same upward pull into minor.' },
    { degreeOffset: HALF_UP, targetType: 'Major 7',   intervalLabel: 'Imaj7',why: 'Common jazz move into a major 7 a half-step up.' },
  ],

  'Half-Dim 7': [
    { degreeOffset: P4_UP,  targetType: 'Dominant 7', intervalLabel: 'V7',   why: 'iiø7 → V7 in minor: the minor ii–V setup.' },
    { degreeOffset: P5_UP,  targetType: 'Minor',      intervalLabel: 'i',    why: 'Often spells iiø7 → V → i in minor keys.' },
  ],

  'Aug 7': [
    { degreeOffset: P4_UP,  targetType: 'Major',      intervalLabel: 'I',    why: 'V+7 → I: ♯5 lifts to the 3rd of I.' },
    { degreeOffset: P4_UP,  targetType: 'Minor',      intervalLabel: 'i',    why: 'V+7 → i: extra tension into a minor tonic.' },
  ],

  // ── Extended dominants — same pull as Dom 7 ────────────────────────────────

  'Dominant 9': [
    { degreeOffset: P4_UP,  targetType: 'Major 7',    intervalLabel: 'Imaj7',why: 'V9 → Imaj7: lush V → I in jazz.' },
    { degreeOffset: P4_UP,  targetType: 'Minor 7',    intervalLabel: 'im7', why: 'V9 → im7: jazz minor resolution.' },
  ],

  'Dominant 11': [
    { degreeOffset: P4_UP,  targetType: 'Major 7',    intervalLabel: 'Imaj7',why: 'V11 → Imaj7: full dominant stack lands on tonic.' },
  ],

  'Dominant 13': [
    { degreeOffset: P4_UP,  targetType: 'Major 7',    intervalLabel: 'Imaj7',why: 'V13 → Imaj7: maximum jazz dominant resolution.' },
    { degreeOffset: P4_UP,  targetType: 'Minor 9',    intervalLabel: 'im9', why: 'V13 → im9: rich color into a minor tonic.' },
  ],

  // ── Major / Minor extensions — tonic colors, milder pulls ─────────────────

  'Major 9': [
    { degreeOffset: P4_UP,  targetType: 'Major 7',    intervalLabel: 'IVmaj7', why: 'Imaj9 → IVmaj7: floating jazz tonic move.' },
    { degreeOffset: M6_UP,  targetType: 'Minor 9',    intervalLabel: 'vim9', why: 'Imaj9 → vim9: relative minor in extended voicing.' },
  ],

  'Major 11': [
    { degreeOffset: P4_UP,  targetType: 'Major 7',    intervalLabel: 'IVmaj7', why: 'Stays in the major-tonic family.' },
  ],

  'Major 13': [
    { degreeOffset: P4_UP,  targetType: 'Major 9',    intervalLabel: 'IVmaj9', why: 'Imaj13 → IVmaj9: upper-structure jazz move.' },
  ],

  'Minor 9': [
    { degreeOffset: P5_UP,  targetType: 'Dominant 9', intervalLabel: 'V9',   why: 'iim9 → V9: rich ii–V setup.' },
    { degreeOffset: P4_UP,  targetType: 'Minor 9',    intervalLabel: 'ivm9', why: 'im9 → ivm9: stays in the minor color.' },
  ],

  'Minor 11': [
    { degreeOffset: P5_UP,  targetType: 'Dominant 9', intervalLabel: 'V9',   why: 'iim11 → V9: modal jazz ii–V.' },
  ],

  'Minor 13': [
    { degreeOffset: P5_UP,  targetType: 'Dominant 13',intervalLabel: 'V13', why: 'iim13 → V13: extended ii–V in jazz.' },
  ],

  'Add9': [
    { degreeOffset: P4_UP,  targetType: 'Major',      intervalLabel: 'IV',   why: 'Add9 colors a major triad — moves the same way.' },
    { degreeOffset: P5_UP,  targetType: 'Major',      intervalLabel: 'V',    why: 'Toward V keeps the bright suspended color in motion.' },
  ],

  'Minor Add9': [
    { degreeOffset: P4_UP,  targetType: 'Minor',      intervalLabel: 'iv',   why: 'Minor add9 still pulls toward iv.' },
    { degreeOffset: m7_UP,  targetType: 'Major',      intervalLabel: '♭VII', why: 'i(add9) → ♭VII: airy modal motion.' },
  ],

  'Add11': [
    { degreeOffset: P4_UP,  targetType: 'Major',      intervalLabel: 'IV',   why: 'Add11 sounds suspended — naturally pulls toward IV.' },
  ],

  '6/9': [
    { degreeOffset: P4_UP,  targetType: 'Major 7',    intervalLabel: 'IVmaj7', why: 'A complete tonic — moves outward to IV.' },
    { degreeOffset: M6_UP,  targetType: 'Minor 7',    intervalLabel: 'vim7', why: '6/9 → vim7: classic jazz pivot.' },
  ],

  'Minor 6/9': [
    { degreeOffset: P5_UP,  targetType: 'Dominant 9', intervalLabel: 'V9',   why: 'Minor 6/9 → V9: jazz minor-tonic to dominant.' },
  ],

  // ── Altered dominants ─────────────────────────────────────────────────────

  'Dom 7♭5': [
    { degreeOffset: P4_UP,  targetType: 'Major 7',    intervalLabel: 'Imaj7',why: 'V7♭5 → I: tritone-rich dominant lands on tonic.' },
    { degreeOffset: TT,     targetType: 'Major',      intervalLabel: 'tritone sub', why: 'Symmetric — works as its own tritone substitute.' },
  ],

  'Dom 7♭9': [
    { degreeOffset: P4_UP,  targetType: 'Minor',      intervalLabel: 'i',    why: 'V7♭9 → i: dark, classic minor-key dominant.' },
    { degreeOffset: P4_UP,  targetType: 'Major',      intervalLabel: 'I',    why: 'V7♭9 → I: tense dominant resolves brightly.' },
  ],

  'Dom 7♯9': [
    { degreeOffset: P4_UP,  targetType: 'Minor',      intervalLabel: 'i',    why: 'The Hendrix chord → i: blues/funk staple resolution.' },
    { degreeOffset: P4_UP,  targetType: 'Major',      intervalLabel: 'I',    why: '7♯9 → I works in funk and rock.' },
  ],

  'Dom 7♯11': [
    { degreeOffset: P4_UP,  targetType: 'Major 7',    intervalLabel: 'Imaj7',why: 'Lydian dominant → I: jazz/fusion classic.' },
    { degreeOffset: TT,     targetType: 'Major 7',    intervalLabel: 'tritone sub', why: '7♯11 is the natural tritone-sub voicing.' },
  ],

  'Maj7♯11': [
    { degreeOffset: P5_UP,  targetType: 'Dominant 7', intervalLabel: 'V7',   why: 'Lydian tonic → V7: dreamy push toward dominant.' },
    { degreeOffset: P4_UP,  targetType: 'Major 7',    intervalLabel: 'IVmaj7', why: 'Lydian color resolves out to plain IV.' },
  ],
};

export function getResolutions(chordType: string): Resolution[] {
  return RESOLUTIONS[chordType] ?? [];
}
