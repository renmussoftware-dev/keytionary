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

export function useAudioEngine() {
  const soundsRef = useRef<Record<string, Sound>>({});
  const loadedRef = useRef(false);
  const progressionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function loadAll() {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      await new Promise(resolve => setTimeout(resolve, 100));

      const loaded: Record<string, Sound> = {};
      const entries = Object.entries(AUDIO_FILES);
      const BATCH_SIZE = 10;
      for (let i = 0; i < entries.length; i += BATCH_SIZE) {
        const batch = entries.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(async ([name, src]) => {
            try {
              const { sound } = await Audio.Sound.createAsync(
                src,
                { shouldPlay: false, volume: 1.0, progressUpdateIntervalMillis: 100 }
              );
              loaded[name] = sound;
            } catch {
              // skip missing files silently
            }
          })
        );
      }
      soundsRef.current = loaded;
      loadedRef.current = true;
    }
    loadAll();

    return () => {
      Object.values(soundsRef.current).forEach(s => s.unloadAsync());
      if (progressionTimerRef.current) clearTimeout(progressionTimerRef.current);
    };
  }, []);

  // Play a single note. Always uses replayAsync — the documented atomic
  // "reset position and play" API that works whether the sound is currently
  // playing or stopped. Lazy-loads the sample if it wasn't preloaded.
  const playMidi = useCallback(async (midi: number) => {
    const name = midiToFilename(midi);
    let sound = soundsRef.current[name];

    if (!sound && AUDIO_FILES[name]) {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false, staysActiveInBackground: false });
        const { sound: newSound } = await Audio.Sound.createAsync(
          AUDIO_FILES[name], { shouldPlay: false, volume: 1.0 }
        );
        soundsRef.current[name] = newSound;
        sound = newSound;
      } catch {
        return;
      }
    }

    if (!sound) return;
    try {
      await sound.replayAsync();
    } catch {
      // ignore playback errors
    }
  }, []);

  // Play a chord as a near-simultaneous arpeggio (subtle roll, low to high).
  //
  // We deliberately don't stop previously-ringing notes from the prior chord.
  // Earlier attempts to do that — both "stop everything" and "stop unique-
  // to-previous" — dropped freshly-attacked notes in some progressions
  // (F → Am with A3/C4 going silent). The likeliest cause is that stopAsync
  // + replayAsync interactions on iOS' shared audio session are racy enough
  // that some new notes never actually start.
  //
  // replayAsync alone is atomic and reliable: it resets the position and
  // plays in one native call, regardless of whether the sound was idle or
  // ringing. Old notes ring out naturally on their fade-out tail (samples
  // are 3.5s with 1s fade), and by the third chord most of the first
  // chord's energy is gone.
  const playChord = useCallback(async (notes: number[]) => {
    const sorted = [...notes].sort((a, b) => a - b);
    await Promise.all(
      sorted.map((midi, i) =>
        new Promise<void>(resolve => {
          setTimeout(() => { playMidi(midi).then(resolve); }, i * 14);
        })
      )
    );
  }, [playMidi]);

  const stopProgression = useCallback(() => {
    if (progressionTimerRef.current) {
      clearTimeout(progressionTimerRef.current);
      progressionTimerRef.current = null;
    }
  }, []);

  // Play a sequence of MIDI-chord arrays at a given BPM (2 beats per chord).
  // onStep(index) fires as each chord plays.
  const playProgression = useCallback((
    chordMidiList: number[][],
    bpm: number,
    onStep: (index: number) => void,
    onFinish: () => void,
  ) => {
    stopProgression();
    const msPerBeat = (60 / bpm) * 1000 * 2;
    let idx = 0;

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
  }, [playChord, stopProgression]);

  return { playMidi, playChord, playProgression, stopProgression };
}
