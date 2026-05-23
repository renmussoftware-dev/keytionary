import { CHORDS } from '../constants/music';

// ── Voicing engine ───────────────────────────────────────────────────────────
//
// The Chords library shows the *textbook* chord — root position, close, one
// hand. That's where every other piano-chord app stops. The questions a player
// actually asks next are "how do I VOICE this so it sounds good?" and "what
// does my left hand do?". This module answers both.
//
// A voicing is split into two independent parts:
//
//   • The RIGHT-HAND shape — the "color": Close, Open (drop-2), Drop 3,
//     Drop 2&4, Shell (guide tones), Rootless (3·5·7·9), Spread, Quartal.
//
//   • The LEFT-HAND pattern — the "foundation", chosen separately by the user:
//     None, Root, Root + 5th, Root + 10th, Octaves.
//
// Keeping them orthogonal is how a pianist actually thinks ("voice the right
// hand rootless, put root-and-fifth in the left") and it multiplies the value
// (8 shapes × 5 left hands). Correctness rule: every note is a genuine chord/
// extension tone. Quartal is the only construction that could introduce a
// non-chord tone, so it's restricted to the minor-with-♭7 family, where the
// 4th-stack (R · 11 · ♭7 · ♭3) is always diatonic.

export interface Voicing {
  id: string;
  name: string;       // "Open (drop 2)"
  tag: string;        // short all-caps chip label — "OPEN"
  blurb: string;      // one-line plain-English description of the RH shape
  rh: number[];       // right-hand MIDI notes, anchored around middle C
  rootMidi: number;   // the root anchor used, so the left hand can be derived
}

export type LeftHandId = 'none' | 'root' | 'root5' | 'root10' | 'octaves';

export interface LeftHandPattern {
  id: LeftHandId;
  label: string;
}

export const LEFT_HAND_PATTERNS: LeftHandPattern[] = [
  { id: 'none',    label: 'None' },
  { id: 'root',    label: 'Root' },
  { id: 'root5',   label: 'Root + 5th' },
  { id: 'root10',  label: 'Root + 10th' },
  { id: 'octaves', label: 'Octaves' },
];

interface Tones {
  third?: number;
  fifth?: number;
  seventh?: number;
  sixth?: number;
  ninth?: number;
  isMinor: boolean;
  hasFlat7: boolean;
}

// Pull the semitone offset of each functional tone out of a chord definition.
// `third` falls back to a sus 2/4 so suspended chords still voice sensibly.
function tonesOf(chordKey: string): Tones {
  const ch = CHORDS[chordKey];
  const find = (names: string[]): number | undefined => {
    for (let i = 0; i < ch.intervalNames.length; i++) {
      if (names.includes(ch.intervalNames[i])) return ch.intervals[i];
    }
    return undefined;
  };
  return {
    third:   find(['3', '♭3', '2', '4']),
    fifth:   find(['5', '♭5', '♯5']),
    seventh: find(['7', '♭7', '♭♭7']),
    sixth:   find(['6']),
    ninth:   find(['9', '♭9', '♯9']),
    isMinor: ch.intervalNames.includes('♭3'),
    hasFlat7: ch.intervalNames.includes('♭7'),
  };
}

const uniqSort = (a: number[]): number[] => [...new Set(a)].sort((x, y) => x - y);

// ── Left hand ────────────────────────────────────────────────────────────────
// Build the left-hand notes for a pattern, relative to the right-hand root
// anchor. All patterns sit in the bass, below the right-hand voicing.
export function leftHandNotes(id: LeftHandId, rootMidi: number, chordKey: string): number[] {
  const R = rootMidi;
  const t = tonesOf(chordKey);
  switch (id) {
    case 'none':    return [];
    case 'root':    return [R - 12];                          // root, one octave below
    case 'root5':   return [R - 12, R - 5];                   // root + perfect 5th
    case 'root10':  return t.third !== undefined
                      ? [R - 24, R - 24 + t.third + 12]       // root + 10th (stride bass)
                      : [R - 24, R - 12];                     // no 3rd → octave fallback
    case 'octaves': return [R - 24, R - 12];                  // root doubled, two bass octaves
    default:        return [R - 12];
  }
}

// ── Fit ──────────────────────────────────────────────────────────────────────
// Keep a realized voicing inside the sampled playback range (C2…C6 ≈ MIDI
// 36–84) by shifting BOTH hands by whole octaves together — preserves the
// voicing's musical identity exactly, just places it where the samples exist.
function fitRange(lh: number[], rh: number[]): { lh: number[]; rh: number[] } {
  const all = [...lh, ...rh];
  if (all.length === 0) return { lh, rh };
  const LO = 36;
  const HI = 84;
  let shift = 0;
  const max = () => Math.max(...all.map(n => n + shift));
  const min = () => Math.min(...all.map(n => n + shift));
  let guard = 0;
  while (max() > HI && guard++ < 8) shift -= 12;
  guard = 0;
  while (min() < LO && guard++ < 8) shift += 12;
  return { lh: lh.map(n => n + shift), rh: rh.map(n => n + shift) };
}

// Combine a right-hand voicing with a chosen left-hand pattern and fit the
// whole thing into the playable range.
export function realize(voicing: Voicing, lhId: LeftHandId, chordKey: string): { lh: number[]; rh: number[] } {
  const lh = leftHandNotes(lhId, voicing.rootMidi, chordKey);
  return fitRange(uniqSort(lh), voicing.rh);
}

// ── Right-hand shapes ──────────────────────────────────────────────────────────
export function buildVoicings(root: number, chordKey: string): Voicing[] {
  const ch = CHORDS[chordKey];
  if (!ch) return [];

  const t = tonesOf(chordKey);
  const R = 60 + root;   // right-hand root anchor, around middle C

  const out: Voicing[] = [];
  const mk = (id: string, name: string, tag: string, blurb: string, rh: number[]): Voicing =>
    ({ id, name, tag, blurb, rh: uniqSort(rh), rootMidi: R });

  const closeStack = ch.intervals.map(iv => R + iv);

  // 1 — Close: the reference. Matches the library diagram.
  out.push(mk('close', 'Close', 'CLOSE',
    'Root-position block — where most chord apps stop.', closeStack));

  // 2 — Open (drop 2): drop the 2nd voice from the top down an octave.
  if (closeStack.length >= 3) {
    const s = [...closeStack].sort((a, b) => a - b);
    s[s.length - 2] -= 12;
    out.push(mk('drop2', 'Open (drop 2)', 'OPEN',
      'Second voice from the top dropped an octave — wider and more open.', s));
  }

  // 3 — Drop 3: drop the 3rd voice from the top down an octave.
  if (closeStack.length >= 4) {
    const s = [...closeStack].sort((a, b) => a - b);
    s[s.length - 3] -= 12;
    out.push(mk('drop3', 'Drop 3', 'DROP 3',
      'Third voice from the top dropped — a big, open interval at the bottom.', s));
  }

  // 4 — Drop 2&4: drop the 2nd and 4th voices from the top.
  if (closeStack.length >= 4) {
    const s = [...closeStack].sort((a, b) => a - b);
    s[s.length - 2] -= 12;
    s[s.length - 4] -= 12;
    out.push(mk('drop24', 'Drop 2 & 4', 'DROP 2&4',
      'Second and fourth voices dropped — lush, spread across the range.', s));
  }

  // 5 — Shell: just the guide tones (3rd + 7th, or 3rd + 5th).
  if (t.third !== undefined) {
    const guide = t.seventh ?? t.fifth;
    out.push(mk('shell', 'Shell', 'SHELL',
      'Just the guide tones — 3rd + 7th. Lean and harmonically clear.',
      [R + t.third, ...(guide !== undefined ? [R + guide] : [])]));
  }

  // 6 — Rootless: right hand is pure color (3·5·7·9). Pair with a bass note.
  if (t.seventh !== undefined && t.third !== undefined && t.fifth !== undefined) {
    const offs = [t.third, t.fifth, t.seventh, ...(t.ninth !== undefined ? [t.ninth] : [])];
    out.push(mk('rootless', 'Rootless', 'ROOTLESS',
      `Right hand is pure color — 3·5·7${t.ninth !== undefined ? '·9' : ''}. Put the root in the left.`,
      offs.map(o => R + o)));
  }

  // 7 — Spread: upper structure spread wide and open.
  if (t.third !== undefined) {
    const guide = t.seventh ?? t.sixth ?? t.fifth;
    out.push(mk('spread', 'Spread', 'SPREAD',
      'Upper tones spread wide and open. Big, modern, cinematic.',
      [
        ...(guide !== undefined ? [R + guide] : []),
        R + t.third + 12,
        ...(t.ninth !== undefined ? [R + t.ninth] : []),
      ]));
  }

  // 8 — Quartal: stacked perfect 4ths. Minor-7 family only (stays diatonic).
  if (t.isMinor && t.hasFlat7) {
    out.push(mk('quartal', 'Quartal', 'QUARTAL',
      'Stacked fourths — the modal, lo-fi / neo-soul sound.',
      [R + 5, R + 10, R + 15]));
  }

  // Drop any RH shape that's an exact duplicate of an earlier one (e.g. drop
  // variants collapsing on small chords).
  const seen = new Set<string>();
  const result: Voicing[] = [];
  for (const v of out) {
    if (v.rh.length < 1) continue;
    const key = v.rh.join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(v);
  }
  return result;
}
