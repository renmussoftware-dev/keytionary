import { useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import { Sound } from 'expo-av/build/Audio';

const ACCENT_VOLUME = 1.0;
const OFFBEAT_VOLUME = 0.55;
const CLICK_SAMPLE = require('../../assets/audio/WoodBlHi ExtraPerc V1.wav');

export const BPM_MIN = 40;
export const BPM_MAX = 240;

// Lookahead scheduler (audio-api path). We schedule every click due in the
// next SCHEDULE_AHEAD seconds against the audio clock, refilling on a coarse
// LOOKAHEAD_MS JS interval. The interval's own jitter is irrelevant - it only
// tops up the queue; each click still fires at its exact scheduled audio time.
const SCHEDULE_AHEAD = 0.1;  // seconds of audio scheduled in advance
const LOOKAHEAD_MS = 25;     // how often the queue is refilled

interface Options {
  bpm: number;
  beats: number;                    // beats per bar; beat 0 gets the accent
  running: boolean;
  onBeat: (beat: number) => void;   // called at each beat's real sounding time
}

/**
 * The metronome's click engine and scheduler, shared by the Tools metronome
 * and the Practice exercise player. Owns the audio; the caller owns tempo,
 * bar length, the running flag, and whatever it wants to draw on each beat.
 *
 * Returns true once an audio engine has loaded.
 */
export function useMetronomeClock({ bpm, beats, running, onBeat }: Options): boolean {
  // -- Audio engines --------------------------------------------------------
  // Primary: react-native-audio-api. Its Web Audio context gives a
  // sample-accurate audio clock and start(when) scheduling, so each click
  // fires on the audio thread at its exact appointed time - immune to the
  // JS-thread jitter the setTimeout scheduler could never escape.
  //
  // Fallback: the previous expo-av + setTimeout scheduler, used when the
  // audio-api native module isn't present (a dev client built before it was
  // added) or fails to init on some device. Keeps the metronome working -
  // with the old jitter - rather than going silent.
  const engineRef = useRef<'audioapi' | 'expoav' | null>(null);
  const [engineReady, setEngineReady] = useState(false);

  // audio-api refs (typed loosely - the module is lazy-required so we never
  // import its types statically, which would break older binaries at load).
  const ctxRef = useRef<any>(null);
  const clickBufRef = useRef<any>(null);
  const accentGainRef = useRef<any>(null);
  const offbeatGainRef = useRef<any>(null);
  const nextNoteTimeRef = useRef(0);              // next click, audio-clock seconds
  const visualQueueRef = useRef<{ beat: number; time: number }[]>([]);
  const lookaheadRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // expo-av fallback refs
  const accentSoundRef = useRef<Sound | null>(null);
  const offbeatSoundRef = useRef<Sound | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextTickRef = useRef<number>(0);

  const beatRef = useRef(0);

  // Scheduler reads tempo/beats through refs so changing them never restarts
  // the loop (a restart used to fire an off-schedule click on every +/- tap).
  // onBeat goes through a ref for the same reason - callers pass a fresh
  // closure every render.
  const bpmRef = useRef(bpm);
  const beatsRef = useRef(beats);
  const onBeatRef = useRef(onBeat);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { beatsRef.current = beats; }, [beats]);
  useEffect(() => { onBeatRef.current = onBeat; });

  // expo-av fallback click.
  function playClick(accent: boolean) {
    const sound = accent ? accentSoundRef.current : offbeatSoundRef.current;
    sound?.replayAsync().catch(() => {});
  }

  // -- Load: pick an engine -------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    async function init() {
      // Try the precise engine first.
      try {
        const { AudioContext } = require('react-native-audio-api');
        const ctx = new AudioContext();
        const accentGain = ctx.createGain();
        accentGain.gain.value = ACCENT_VOLUME;
        accentGain.connect(ctx.destination);
        const offbeatGain = ctx.createGain();
        offbeatGain.gain.value = OFFBEAT_VOLUME;
        offbeatGain.connect(ctx.destination);
        const buf = await ctx.decodeAudioData(CLICK_SAMPLE);
        if (cancelled) { ctx.close?.(); return; }
        ctxRef.current = ctx;
        clickBufRef.current = buf;
        accentGainRef.current = accentGain;
        offbeatGainRef.current = offbeatGain;
        engineRef.current = 'audioapi';
        setEngineReady(true);
        return;
      } catch (e) {
        if (__DEV__) console.warn('[metronome] audio-api unavailable, using expo-av', e);
      }
      // Fallback: expo-av.
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
        const [{ sound: accent }, { sound: offbeat }] = await Promise.all([
          Audio.Sound.createAsync(CLICK_SAMPLE, { shouldPlay: false, volume: ACCENT_VOLUME }),
          Audio.Sound.createAsync(CLICK_SAMPLE, { shouldPlay: false, volume: OFFBEAT_VOLUME }),
        ]);
        if (cancelled) { accent.unloadAsync(); offbeat.unloadAsync(); return; }
        accentSoundRef.current = accent;
        offbeatSoundRef.current = offbeat;
        engineRef.current = 'expoav';
        setEngineReady(true);
      } catch {}
    }
    init();
    return () => {
      cancelled = true;
      if (lookaheadRef.current) clearInterval(lookaheadRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
      accentSoundRef.current?.unloadAsync();
      offbeatSoundRef.current?.unloadAsync();
      accentSoundRef.current = null;
      offbeatSoundRef.current = null;
      ctxRef.current?.close?.().catch?.(() => {});
      ctxRef.current = null;
    };
  }, []);

  // -- Run: start/stop the active engine's scheduler ------------------------
  useEffect(() => {
    if (!running) {
      if (lookaheadRef.current) { clearInterval(lookaheadRef.current); lookaheadRef.current = null; }
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      return;
    }
    if (!engineReady) return;  // re-runs when the engine finishes loading

    beatRef.current = 0;

    // -- Precise path: lookahead against the audio clock --
    if (engineRef.current === 'audioapi') {
      const ctx = ctxRef.current;
      ctx.resume?.();
      visualQueueRef.current = [];
      // Start a hair in the future so the first click isn't clipped.
      nextNoteTimeRef.current = ctx.currentTime + 0.06;

      const schedule = () => {
        const c = ctxRef.current;
        if (!c) return;
        // Fill the audio queue up to SCHEDULE_AHEAD out.
        while (nextNoteTimeRef.current < c.currentTime + SCHEDULE_AHEAD) {
          const beat = beatRef.current;
          const t = nextNoteTimeRef.current;
          const src = c.createBufferSource();
          src.buffer = clickBufRef.current;
          src.connect(beat === 0 ? accentGainRef.current : offbeatGainRef.current);
          src.start(t);  // fires at exactly t on the audio thread
          visualQueueRef.current.push({ beat, time: t });
          beatRef.current = (beat + 1) % beatsRef.current;
          nextNoteTimeRef.current += 60 / bpmRef.current;
        }
        // Fire visuals whose audio time has arrived (cosmetic; ~LOOKAHEAD_MS
        // resolution, imperceptible).
        const now = c.currentTime;
        const q = visualQueueRef.current;
        while (q.length && q[0].time <= now) onBeatRef.current(q.shift()!.beat);
      };
      schedule();
      lookaheadRef.current = setInterval(schedule, LOOKAHEAD_MS);

      return () => {
        if (lookaheadRef.current) { clearInterval(lookaheadRef.current); lookaheadRef.current = null; }
      };
    }

    // -- Fallback path: expo-av absolute-grid setTimeout --
    nextTickRef.current = Date.now();
    function tick() {
      const now = Date.now();
      const interval = 60_000 / bpmRef.current;
      const beat = beatRef.current;
      playClick(beat === 0);
      beatRef.current = (beat + 1) % beatsRef.current;
      nextTickRef.current += interval;
      if (nextTickRef.current <= now) nextTickRef.current = now + interval;
      timerRef.current = setTimeout(tick, nextTickRef.current - now);
      onBeatRef.current(beat);
    }
    tick();
    return () => {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tempo/beats via refs by design
  }, [running, engineReady]);

  return engineReady;
}
