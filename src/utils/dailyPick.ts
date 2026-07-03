/**
 * Deterministic "pick of the day" — the same calendar date always returns the
 * same pick, so every user on the same local day sees the same content.
 *
 * Rotation:
 *  - Alternates scale ↔ chord day-by-day (even day = scale, odd day = chord)
 *  - Root cycles through all 12 keys once per 12 days
 *  - Scale/chord index advances every other day, so a full cycle through the
 *    scale library takes ~28 days and the chord library ~70 days
 *
 * Same input → same output is the point: the card on the Keyboard tab, any
 * future notification body, and any "yesterday's pick" surfaces all read
 * from this function and agree.
 */

import { NOTES, SCALES, CHORDS } from '../constants/music';

export interface DailyPick {
  type: 'scale' | 'chord';
  root: number;       // 0–11 pitch class
  rootName: string;   // 'C', 'D#', etc.
  itemKey: string;    // SCALES[itemKey] or CHORDS[itemKey]
  fullName: string;   // 'D Dorian' or 'G Maj7'
  description: string;
}

const SCALE_KEYS = Object.keys(SCALES);
const CHORD_KEYS = Object.keys(CHORDS);

/**
 * Days since the Unix epoch at local midnight. Using LOCAL time aligns the
 * daily rollover with the user's wall clock — a New Yorker and a Tokyoite
 * each get their own new pick at their own local midnight.
 */
function localDayNumber(d: Date): number {
  const localMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.floor(localMidnight / (24 * 60 * 60 * 1000));
}

/** Safe non-negative modulo for any integer. */
function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

export function getDailyPick(date: Date = new Date()): DailyPick {
  const day = localDayNumber(date);
  const root = mod(day, 12);
  const rootName = NOTES[root];
  const useScale = mod(day, 2) === 0;
  const itemIndex = Math.floor(day / 2);

  if (useScale) {
    const key = SCALE_KEYS[mod(itemIndex, SCALE_KEYS.length)];
    return {
      type: 'scale',
      root,
      rootName,
      itemKey: key,
      fullName: `${rootName} ${key}`,
      description: SCALES[key].description,
    };
  }
  const key = CHORD_KEYS[mod(itemIndex, CHORD_KEYS.length)];
  return {
    type: 'chord',
    root,
    rootName,
    itemKey: key,
    fullName: `${rootName} ${key}`,
    description: CHORDS[key].description,
  };
}
