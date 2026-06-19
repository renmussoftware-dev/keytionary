import { useEffect, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import { Sound } from 'expo-av/build/Audio';

// File naming: C D Db E Eb F Gb G Ab A Bb B + octave (e.g. C4.mp3)
const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

function midiToFilename(midi: number): string {
  const noteClass = midi % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[noteClass]}${octave}`;
}

// Build the require map statically — Metro bundler needs static requires.
// Covers C2 (MIDI 36) through C6 (MIDI 84) — typical piano playback range.
const AUDIO_FILES: Record<string, any> = {
  'A1':  require('../../assets/audio/A1.mp3'),
  'A2':  require('../../assets/audio/A2.mp3'),
  'A3':  require('../../assets/audio/A3.mp3'),
  'A4':  require('../../assets/audio/A4.mp3'),
  'A5':  require('../../assets/audio/A5.mp3'),
  'A6':  require('../../assets/audio/A6.mp3'),
  'Ab1': require('../../assets/audio/Ab1.mp3'),
  'Ab2': require('../../assets/audio/Ab2.mp3'),
  'Ab3': require('../../assets/audio/Ab3.mp3'),
  'Ab4': require('../../assets/audio/Ab4.mp3'),
  'Ab5': require('../../assets/audio/Ab5.mp3'),
  'Ab6': require('../../assets/audio/Ab6.mp3'),
  'B1':  require('../../assets/audio/B1.mp3'),
  'B2':  require('../../assets/audio/B2.mp3'),
  'B3':  require('../../assets/audio/B3.mp3'),
  'B4':  require('../../assets/audio/B4.mp3'),
  'B5':  require('../../assets/audio/B5.mp3'),
  'B6':  require('../../assets/audio/B6.mp3'),
  'Bb1': require('../../assets/audio/Bb1.mp3'),
  'Bb2': require('../../assets/audio/Bb2.mp3'),
  'Bb3': require('../../assets/audio/Bb3.mp3'),
  'Bb4': require('../../assets/audio/Bb4.mp3'),
  'Bb5': require('../../assets/audio/Bb5.mp3'),
  'Bb6': require('../../assets/audio/Bb6.mp3'),
  'C2':  require('../../assets/audio/C2.mp3'),
  'C3':  require('../../assets/audio/C3.mp3'),
  'C4':  require('../../assets/audio/C4.mp3'),
  'C5':  require('../../assets/audio/C5.mp3'),
  'C6':  require('../../assets/audio/C6.mp3'),
  'D2':  require('../../assets/audio/D2.mp3'),
  'D3':  require('../../assets/audio/D3.mp3'),
  'D4':  require('../../assets/audio/D4.mp3'),
  'D5':  require('../../assets/audio/D5.mp3'),
  'D6':  require('../../assets/audio/D6.mp3'),
  'Db2': require('../../assets/audio/Db2.mp3'),
  'Db3': require('../../assets/audio/Db3.mp3'),
  'Db4': require('../../assets/audio/Db4.mp3'),
  'Db5': require('../../assets/audio/Db5.mp3'),
  'Db6': require('../../assets/audio/Db6.mp3'),
  'E2':  require('../../assets/audio/E2.mp3'),
  'E3':  require('../../assets/audio/E3.mp3'),
  'E4':  require('../../assets/audio/E4.mp3'),
  'E5':  require('../../assets/audio/E5.mp3'),
  'E6':  require('../../assets/audio/E6.mp3'),
  'Eb2': require('../../assets/audio/Eb2.mp3'),
  'Eb3': require('../../assets/audio/Eb3.mp3'),
  'Eb4': require('../../assets/audio/Eb4.mp3'),
  'Eb5': require('../../assets/audio/Eb5.mp3'),
  'Eb6': require('../../assets/audio/Eb6.mp3'),
  'F2':  require('../../assets/audio/F2.mp3'),
  'F3':  require('../../assets/audio/F3.mp3'),
  'F4':  require('../../assets/audio/F4.mp3'),
  'F5':  require('../../assets/audio/F5.mp3'),
  'F6':  require('../../assets/audio/F6.mp3'),
  'G2':  require('../../assets/audio/G2.mp3'),
  'G3':  require('../../assets/audio/G3.mp3'),
  'G4':  require('../../assets/audio/G4.mp3'),
  'G5':  require('../../assets/audio/G5.mp3'),
  'G6':  require('../../assets/audio/G6.mp3'),
  'Gb2': require('../../assets/audio/Gb2.mp3'),
  'Gb3': require('../../assets/audio/Gb3.mp3'),
  'Gb4': require('../../assets/audio/Gb4.mp3'),
  'Gb5': require('../../assets/audio/Gb5.mp3'),
  'Gb6': require('../../assets/audio/Gb6.mp3'),
};

// Each note holds a small pool of Sound instances. Playing a note picks the
// next instance via round-robin, silences any other instance(s) for that
// note (see playMidi), then replayAsyncs the picked instance. Two reasons
// the pool needs to exist:
//
//   1. Race avoidance — the original single-instance approach called
//      replayAsync on a sound that might still be processing a previous
//      stop, which dropped notes. With a pool, the new attack lands on a
//      DIFFERENT instance from any stop, so they don't interact.
//
//   2. Clean rapid retriggers — silencing the other instance on every
//      attack means rapid taps of the same chord re-articulate cleanly
//      instead of stacking voices and turning into a glitchy soup.
//
// Size 2 is the minimum that satisfies both — odd taps land on instance 0,
// even on instance 1, the inactive one always available as a fresh slot.
const POOL_SIZE = 2;

// Cap on how many note-pools stay resident. We DON'T preload the full
// 64-note chromatic set anymore: that's 64 × POOL_SIZE Sound instances
// created in a startup burst, which iOS tolerates but Android's media
// stack does not — it silently fails partway through, leaving most notes
// unplayable. Instead we lazy-load each note's pool on first use and evict
// the least-recently-used pool once we hit MAX_POOLS. 28 pools × 2 = 56
// instances max, created gradually, comfortably under Android's ceiling
// and big enough to hold a full progression's worth of notes without
// thrashing.
const MAX_POOLS = 28;

export function useAudioEngine() {
  const soundsRef = useRef<Record<string, Sound[]>>({});
  const poolIdxRef = useRef<Record<string, number>>({});
  // LRU order of note names — index 0 is least-recently-used.
  const lruRef = useRef<string[]>([]);
  // In-flight loads, keyed by note name, so concurrent ensureLoaded calls
  // for the same note (e.g. preload racing playback) don't double-load.
  const loadingRef = useRef<Record<string, Promise<Sound[] | null>>>({});
  const progressionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Set the audio session mode once. No sample preloading — sounds load
    // lazily on first play (see ensureLoaded).
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    }).catch(() => {});

    return () => {
      for (const pool of Object.values(soundsRef.current)) {
        for (const s of pool) s.unloadAsync().catch(() => {});
      }
      if (progressionTimerRef.current) clearTimeout(progressionTimerRef.current);
    };
  }, []);

  // Move a note name to the most-recently-used end of the LRU list.
  function touchLru(name: string) {
    const lru = lruRef.current;
    const i = lru.indexOf(name);
    if (i !== -1) lru.splice(i, 1);
    lru.push(name);
  }

  // Ensure a note's Sound pool is loaded. Returns the pool, or null if the
  // sample doesn't exist / failed to load. Lazy-loads POOL_SIZE instances
  // on first use, evicting the least-recently-used pool when at capacity.
  const ensureLoaded = useCallback(async (name: string): Promise<Sound[] | null> => {
    const existing = soundsRef.current[name];
    if (existing) {
      touchLru(name);
      return existing;
    }
    // Dedupe concurrent loads of the same note.
    const inFlight = loadingRef.current[name];
    if (inFlight) return inFlight;
    if (!AUDIO_FILES[name]) return null;

    const loadPromise = (async (): Promise<Sound[] | null> => {
      // Evict LRU pools until there's room.
      while (lruRef.current.length >= MAX_POOLS) {
        const victim = lruRef.current.shift();
        if (!victim) break;
        const pool = soundsRef.current[victim];
        if (pool) {
          for (const s of pool) s.unloadAsync().catch(() => {});
          delete soundsRef.current[victim];
          delete poolIdxRef.current[victim];
        }
      }

      const pool: Sound[] = [];
      for (let i = 0; i < POOL_SIZE; i++) {
        try {
          const { sound } = await Audio.Sound.createAsync(
            AUDIO_FILES[name], { shouldPlay: false, volume: 1.0 }
          );
          pool.push(sound);
        } catch {
          // A partial pool still plays — keep whatever loaded.
        }
      }
      if (pool.length === 0) return null;
      soundsRef.current[name] = pool;
      touchLru(name);
      return pool;
    })();

    loadingRef.current[name] = loadPromise;
    try {
      return await loadPromise;
    } finally {
      delete loadingRef.current[name];
    }
  }, []);

  // Preload a set of MIDI notes ahead of playback so the first loop of a
  // progression doesn't lag while samples load. Capped at MAX_POOLS — a
  // progression rarely has more unique notes than that.
  const preloadMidi = useCallback(async (midiList: number[]) => {
    const names = [...new Set(midiList.map(midiToFilename))].slice(0, MAX_POOLS);
    await Promise.all(names.map(n => ensureLoaded(n)));
  }, [ensureLoaded]);

  // Play a single note. Lazy-loads the note's pool if needed, then picks the
  // next instance round-robin, silences any OTHER pool instance for the
  // same note, and replayAsyncs the chosen instance.
  //
  // The other-instance stop is what makes rapid retriggers clean: without
  // it, tapping the same chord quickly stacks 2 voices per note (one on
  // each pool instance) and the playback turns into a glitchy soup. With
  // it, only the newest attack sounds — the old voice is cut off the
  // moment the new one fires.
  //
  // The stop never races the replay because they target DIFFERENT pool
  // instances: replayAsync runs on `idx`, stops run on every other index.
  // That's exactly why the pool exists — it lets us decouple the two ops.
  const playMidi = useCallback(async (midi: number) => {
    const name = midiToFilename(midi);
    const pool = await ensureLoaded(name);
    if (!pool || pool.length === 0) return;
    const idx = (poolIdxRef.current[name] ?? 0) % pool.length;
    poolIdxRef.current[name] = idx + 1;
    try {
      // Silence prior attacks on other instances of this note. Fire-and-
      // forget; the new attack starts immediately on a different instance.
      for (let i = 0; i < pool.length; i++) {
        if (i !== idx) pool[i].stopAsync().catch(() => {});
      }
      await pool[idx].replayAsync();
    } catch {
      // ignore playback errors
    }
  }, [ensureLoaded]);

  // Play a chord as a block — all notes attacked simultaneously, the way a
  // pianist plays a chord in one hand stroke. Each playMidi independently
  // silences its own prior voice (see above), so rapid chord retriggers
  // produce clean re-articulation instead of stacked layers. Notes from a
  // PREVIOUS chord that aren't in this one keep ringing on their pool
  // instance — natural sustain-pedal-style decay.
  const playChord = useCallback(async (notes: number[]) => {
    await Promise.all(notes.map(midi => playMidi(midi)));
  }, [playMidi]);

  const stopProgression = useCallback(() => {
    if (progressionTimerRef.current) {
      clearTimeout(progressionTimerRef.current);
      progressionTimerRef.current = null;
    }
  }, []);

  // Play a sequence of MIDI-chord arrays at a given BPM (2 beats per chord).
  // onStep(index) fires as each chord plays. The progression's notes are
  // pre-warmed so the first loop doesn't stutter while samples load.
  const playProgression = useCallback((
    chordMidiList: number[][],
    bpm: number,
    onStep: (index: number) => void,
    onFinish: () => void,
  ) => {
    stopProgression();
    const msPerBeat = (60 / bpm) * 1000 * 2;
    let idx = 0;

    // Fire-and-forget warm-up; playMidi also lazy-loads, so a slow load just
    // means that note is quiet on the very first pass, never silent forever.
    preloadMidi(chordMidiList.flat());

    function step() {
      if (idx >= chordMidiList.length) {
        onFinish();
        return;
      }
      onStep(idx);
      playChord(chordMidiList[idx]);
      idx++;
      progressionTimerRef.current = setTimeout(step, msPerBeat);
    }
    step();
  }, [playChord, preloadMidi, stopProgression]);

  return { playMidi, playChord, playProgression, stopProgression };
}
