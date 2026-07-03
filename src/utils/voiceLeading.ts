import { CHORDS } from '../constants/music';
import { getChordMidi } from './theory';

// ── Voice-leading engine ─────────────────────────────────────────────────────
//
// Given a chord progression, produces the MIDI voicing of each chord so
// step-to-step motion is minimised — common tones are held, other voices
// move by the smallest interval available. The classical voice-leading
// principle applied to any progression.
//
// Algorithm: anchor the first chord at a middle-piano register (baseOctave 5,
// so C4 is the lowest possible root), then for each subsequent chord try
// every reasonable (inversion, octave-shift) combination and pick the one
// whose notes have the smallest total distance from the previous voicing
// under greedy nearest-neighbour matching. Handles unequal chord sizes
// gracefully (triad → 7th → 9th all in the same progression).
//
// This is what turns "I → V → vi → IV" from a series of registral leaps
// into a smooth flow that sounds like a producer voiced it. It's the
// original hero-tier feature from the app's marketing positioning.

// Middle piano register anchor for the first chord. Gives voice leading
// room to move both up and down from the starting point.
const BASE_OCTAVE = 5;

// Inversions to consider per chord. Beyond 3rd inversion the sound gets
// esoteric and the searches waste cycles; 3 covers triads through 7th
// chords cleanly.
const INV_MAX = 3;

// Octave shifts to search around BASE_OCTAVE, in octaves. ±1 gives the
// algorithm one octave of downward and upward room around the anchor,
// which is enough to find a voice-led placement for any chord change.
const OCT_RANGE = 1;

/**
 * Compute voice-led MIDI notes for each chord in a progression. The first
 * chord anchors the register; every subsequent chord is voiced to minimise
 * total voice motion from the previous chord's notes.
 */
export function voiceLeadProgression(
  chords: { root: number; chordType: string }[],
): number[][] {
  if (chords.length === 0) return [];
  const result: number[][] = [];

  // First chord anchors the whole progression's register.
  result.push(getChordMidi(chords[0].root, chords[0].chordType, BASE_OCTAVE, 0));

  for (let i = 1; i < chords.length; i++) {
    const prev = result[i - 1];
    const { root, chordType } = chords[i];
    const ch = CHORDS[chordType];
    if (!ch) {
      result.push(getChordMidi(root, chordType, BASE_OCTAVE, 0));
      continue;
    }

    let bestNotes: number[] | null = null;
    let bestDist = Infinity;
    const maxInv = Math.min(ch.intervals.length - 1, INV_MAX);

    for (let inv = 0; inv <= maxInv; inv++) {
      for (let oct = BASE_OCTAVE - OCT_RANGE; oct <= BASE_OCTAVE + OCT_RANGE; oct++) {
        const candidate = getChordMidi(root, chordType, oct, inv);
        const dist = voicingDistance(prev, candidate);
        if (dist < bestDist) {
          bestDist = dist;
          bestNotes = candidate;
        }
      }
    }
    result.push(bestNotes ?? getChordMidi(root, chordType, BASE_OCTAVE, 0));
  }
  return result;
}

/**
 * Sum of voice motions to go from `prev` to `curr` under greedy nearest-
 * neighbour matching. Not an optimal bipartite matching, but for small
 * chord sizes (3–7 notes) the greedy result matches the optimum in
 * essentially every practical progression, and it's fast (O(n²) per
 * candidate) so we can afford to search a lot of candidates.
 */
function voicingDistance(prev: number[], curr: number[]): number {
  const usedCurr = new Set<number>();
  let total = 0;

  // Match each previous voice to its nearest available current-chord note,
  // processed low-to-high so bass voices tend to bass targets.
  const sortedPrev = [...prev].sort((a, b) => a - b);
  for (const p of sortedPrev) {
    let best = -1;
    let bestD = Infinity;
    for (let j = 0; j < curr.length; j++) {
      if (usedCurr.has(j)) continue;
      const d = Math.abs(p - curr[j]);
      if (d < bestD) { bestD = d; best = j; }
    }
    if (best !== -1) {
      usedCurr.add(best);
      total += bestD;
    }
  }

  // If the current chord has more notes than the previous (e.g. triad → 7),
  // the extras aren't matched by any voice — count their nearest-prev
  // distance so we don't get "free" notes gaming the score.
  for (let j = 0; j < curr.length; j++) {
    if (usedCurr.has(j)) continue;
    let bestD = Infinity;
    for (const p of prev) bestD = Math.min(bestD, Math.abs(p - curr[j]));
    total += bestD;
  }
  return total;
}
