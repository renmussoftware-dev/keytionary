/**
 * Keytionary — Subscription Gate Configuration
 *
 * FREE tier includes enough to demonstrate value.
 * PRO tier unlocks everything.
 */

// ── FREE SCALES (4 of 14) ────────────────────────────────────────────────────
export const FREE_SCALES = new Set([
  'Major',
  'Natural Minor',
  'Pentatonic Minor',
  'Blues',
]);

// ── FREE CHORDS (8 of 25) ────────────────────────────────────────────────────
export const FREE_CHORDS = new Set([
  'Major',
  'Minor',
  'Dominant 7',
  'Major 7',
  'Minor 7',
  'Sus2',
  'Sus4',
  'Power (5)',
]);

// ── FREE PROGRESSIONS (4 of 22) ──────────────────────────────────────────────
export const FREE_PROGRESSIONS = new Set([
  'I – IV – V',
  'I – V – vi – IV',
  'ii – V – I',
  '12-Bar Blues',
]);

// ── FEATURE GATES ────────────────────────────────────────────────────────────
export const PRO_FEATURES = {
  progressionAudio: true,    // Play button in progressions tab
};

export function isScaleFree(scaleKey: string): boolean {
  return FREE_SCALES.has(scaleKey);
}

export function isChordFree(chordKey: string): boolean {
  return FREE_CHORDS.has(chordKey);
}

export function isProgressionFree(progressionName: string): boolean {
  return FREE_PROGRESSIONS.has(progressionName);
}

