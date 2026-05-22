import { CHORDS } from '../constants/music';

// ── Voicing engine ───────────────────────────────────────────────────────────
//
// The Chords library shows the *textbook* chord — root position, close, one
// hand. That's where every other piano-chord app stops. But the question a
// producer or self-taught player actually asks next is "ok, how do I VOICE
// this so it sounds good, and what does my left hand do?".
//
// This module answers that. Given a root + chord type it produces a small set
// of real-world voicings, each as explicit left-hand / right-hand MIDI notes:
//
//   Close      — the reference block voicing (RH only)
//   Open       — drop-2: 2nd voice from the top dropped an octave
//   Shell      — root in LH, guide tones (3rd + 7th) in RH
//   Rootless   — LH root, RH is pure color (3·5·7·9)
//   Spread     — root + 5th down low, upper structure spread wide (two hands)
//   Quartal    — stacked perfect 4ths (minor-7 family only — stays diatonic)
//
// Correctness rule: every note in every voicing is a genuine chord/extension
// tone. Quartal is the only construction that could introduce a non-chord
// tone, so it's restricted to the minor-with-♭7 family, where the 4th-stack
// (R · 11 · ♭7 · ♭3) is always diatonic to dorian / aeolian / locrian.

export interface Voicing {
  id: string;
  name: string;     // "Open (drop 2)"
  tag: string;      // short all-caps label for the chip — "OPEN"
  blurb: string;    // one-line plain-English description
  leftHand: string; // what the LH plays — "Root", "Root + 5th", or "—"
  lh: number[];     // left-hand MIDI notes (may be empty)
  rh: number[];     // right-hand MIDI notes
}

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

// Keep a voicing inside the sampled playback range (C2…C6 ≈ MIDI 36–84) by
// shifting BOTH hands by whole octaves. Octave-shifting preserves the voicing's
// musical identity exactly — it just places it where the samples exist.
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

function mk(
  id: string, name: string, tag: string, blurb: string,
  leftHand: string, lh: number[], rh: number[],
): Voicing {
  return { id, name, tag, blurb, leftHand, lh: uniqSort(lh), rh: uniqSort(rh) };
}

export function buildVoicings(root: number, chordKey: string): Voicing[] {
  const ch = CHORDS[chordKey];
  if (!ch) return [];

  const t = tonesOf(chordKey);
  const R = 60 + root;   // RH root anchored around middle C
  const Rlow = R - 12;   // LH root one octave below

  const out: Voicing[] = [];

  // 1 — Close: the reference. Exactly what the library diagram shows.
  const closeStack = ch.intervals.map(iv => R + iv);
  out.push(mk(
    'close', 'Close', 'CLOSE',
    'Root-position block in one hand — where most chord apps stop.',
    '—', [], closeStack,
  ));

  // 2 — Open (drop 2): drop the 2nd voice from the top down an octave.
  if (closeStack.length >= 3) {
    const s = [...closeStack].sort((a, b) => a - b);
    s[s.length - 2] -= 12;
    out.push(mk(
      'drop2', 'Open (drop 2)', 'OPEN',
      'Second voice from the top dropped an octave — wider and more playable.',
      '—', [], s,
    ));
  }

  // 3 — Shell: root in LH, guide tones (3rd + 7th, or 3rd + 5th) in RH.
  if (t.third !== undefined) {
    const guide = t.seventh ?? t.fifth;
    const rh = [R + t.third, ...(guide !== undefined ? [R + guide] : [])];
    out.push(mk(
      'shell', 'Shell', 'SHELL',
      'Root in the left hand, guide tones in the right — the classic comping shell.',
      'Root', [Rlow], rh,
    ));
  }

  // 4 — Rootless: LH holds the root, RH is pure color (3·5·7·9).
  if (t.seventh !== undefined && t.third !== undefined && t.fifth !== undefined) {
    const offs = [t.third, t.fifth, t.seventh, ...(t.ninth !== undefined ? [t.ninth] : [])];
    out.push(mk(
      'rootless', 'Rootless', 'ROOTLESS',
      `Left hand holds the root; right hand is all color — 3·5·7${t.ninth !== undefined ? '·9' : ''}.`,
      'Root', [Rlow], offs.map(o => R + o),
    ));
  }

  // 5 — Spread (two hands): root + 5th down low, upper structure spread wide.
  if (t.third !== undefined) {
    const guide = t.seventh ?? t.sixth ?? t.fifth;
    const rh = [
      ...(guide !== undefined ? [R + guide] : []),
      R + t.third + 12,
      ...(t.ninth !== undefined ? [R + t.ninth] : []),
    ];
    const lh = [Rlow, ...(t.fifth !== undefined ? [Rlow + 7] : [])];
    out.push(mk(
      'spread', 'Spread', 'SPREAD',
      'Root + 5th down low, upper tones spread wide. Big, open, modern.',
      t.fifth !== undefined ? 'Root + 5th' : 'Root', lh, rh,
    ));
  }

  // 6 — Quartal: stacked perfect 4ths. Minor-7 family only, where R·11·♭7·♭3
  // is always diatonic — keeps the "no wrong notes" guarantee.
  if (t.isMinor && t.hasFlat7) {
    out.push(mk(
      'quartal', 'Quartal', 'QUARTAL',
      'Stacked fourths over the root — the modal, lo-fi / neo-soul sound.',
      'Root', [Rlow], [R + 5, R + 10, R + 15],
    ));
  }

  // Fit each into the sampled range, then drop any voicing that ended up an
  // exact duplicate of an earlier one (e.g. drop-2 of a 2-note shape).
  const seen = new Set<string>();
  const result: Voicing[] = [];
  for (const v of out) {
    const { lh, rh } = fitRange(v.lh, v.rh);
    const all = uniqSort([...lh, ...rh]);
    if (all.length < 2) continue;
    const key = all.join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ ...v, lh, rh });
  }
  return result;
}
