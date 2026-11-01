import { useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import { Sound } from 'expo-av/build/Audio';

const ACCENT_VOLUME = 1.0;
const OFFBEAT_VOLUME = 0.55;
const CLICK_SAMPLE = require('../../assets/audio/WoodBlHi ExtraPerc V1.wav');

export const BPM_MIN = 40;
export const BPM_MAX = 240;

interface Options {
  bpm: number;
  beats: number;                    // beats per bar; beat 0 gets the accent
  running: boolean;
  onBeat: (beat: number) => void;   // called as each click sounds
}

/**
 * Click engine for the Practice exercise player. Same wood-block sample and
 * self-correcting absolute-grid scheduler as the Tools metronome; the caller
 * owns tempo, bar length, the running flag, and whatever it draws per beat.
 *
 * Returns true once the click samples have loaded.
 */
export function useMetronomeClock({ bpm, beats, running, onBeat }: Options): boolean {
  const accentSoundRef = useRef<Sound | null>(null);
  const offbeatSoundRef = useRef<Sound | null>(null);
  const [ready, setReady] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextTickRef = useRef(0);
  const beatRef = useRef(0);

  // Tempo, bar length and onBeat go through refs so changing them never
  // restarts the loop (a restart would fire an off-grid click on every
  // +/- tap). Callers pass a fresh onBeat closure every render.
  const bpmRef = useRef(bpm);
  const beatsRef = useRef(beats);
  const onBeatRef = useRef(onBeat);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { beatsRef.current = beats; }, [beats]);
  useEffect(() => { onBeatRef.current = onBeat; });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ sound: accent }, { sound: offbeat }] = await Promise.all([
          Audio.Sound.createAsync(CLICK_SAMPLE, { shouldPlay: false, volume: ACCENT_VOLUME }),
          Audio.Sound.createAsync(CLICK_SAMPLE, { shouldPlay: false, volume: OFFBEAT_VOLUME }),
        ]);
        if (cancelled) { accent.unloadAsync(); offbeat.unloadAsync(); return; }
        accentSoundRef.current = accent;
        offbeatSoundRef.current = offbeat;
        setReady(true);
      } catch {}
    })();
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      accentSoundRef.current?.unloadAsync();
      offbeatSoundRef.current?.unloadAsync();
      accentSoundRef.current = null;
      offbeatSoundRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!running || !ready) {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      return;
    }
    beatRef.current = 0;
    nextTickRef.current = Date.now();
    function tick() {
      const now = Date.now();
      const beat = beatRef.current;
      const sound = beat === 0 ? accentSoundRef.current : offbeatSoundRef.current;
      sound?.replayAsync().catch(() => {});
      beatRef.current = (beat + 1) % beatsRef.current;
      const interval = 60_000 / bpmRef.current;
      nextTickRef.current += interval;
      if (nextTickRef.current <= now) nextTickRef.current = now + interval;
      timerRef.current = setTimeout(tick, nextTickRef.current - now);
      onBeatRef.current(beat);
    }
    tick();
    return () => {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    };
  }, [running, ready]);

  return ready;
}
