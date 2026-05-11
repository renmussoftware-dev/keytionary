// One-shot piano sample preprocessor.
//
// Takes the sparse source bank in assets/piano-audio/ (Piano 3 by default,
// which samples A, C, Eb, Gb across octaves 0–6) and emits a chromatic MP3
// set into assets/audio/ — every semitone from A1 (MIDI 33) through B6
// (MIDI 95). Each output is trimmed to 3.5s with a 1s fade-out and encoded
// as 160 kbps mono MP3. Total output is around 3 MB.
//
// Pitch shifting fills the chromatic gaps: each target note is at most
// ±1 semitone away from a real sample, which sounds clean for piano.
//
// Re-run with a different BANK constant below to try Piano 4 or 5.
//
// Usage: node scripts/generate-audio-samples.mjs

import { spawn } from 'child_process';
import { existsSync, readdirSync, statSync, unlinkSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import ffmpegPath from 'ffmpeg-static';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SOURCE_DIR = join(ROOT, 'assets', 'piano-audio');
const OUTPUT_DIR = join(ROOT, 'assets', 'audio');

const BANK = 'Piano 3'; // change to 'Piano 4' / 'Piano 5' to re-run with a different bank
const TRIM_SECONDS = 3.5;
const FADE_START = 2.5;
const FADE_DURATION = 1.0;
const BITRATE = '160k';

// Output naming uses these note labels (matches what useAudioEngine.ts expects).
// Sharps map to flats: Db / Eb / Gb / Ab / Bb.
const NOTE_LABELS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Sparse source notes per octave (semitones from C) — Piano 3 / 4 layout.
// Piano 5 has different coverage; this script only does Piano 3 / 4.
const SOURCE_SEMITONES = [
  { label: 'C',  semi: 0 },
  { label: 'Eb', semi: 3 },
  { label: 'Gb', semi: 6 },
  { label: 'A',  semi: 9 },
];

// MIDI 32 = Ab1, MIDI 95 = B6. Covers ~5 octaves — enough headroom for
// every chord we generate (root at octave 4, extensions up to +21 semitones).
// Ab1 is the bottom because useAudioEngine.ts references it explicitly.
const TARGET_MIDI_LO = 32;
const TARGET_MIDI_HI = 95;

// MIDI helpers: A4 = 69, C4 = 60. So MIDI 0 = C-1, C0 = 12, A0 = 21.
function midiToNoteOctave(midi) {
  const noteIdx = midi % 12;
  const octave = Math.floor(midi / 12) - 1;
  return { label: NOTE_LABELS[noteIdx], octave };
}

// Build the list of source samples that exist on disk (Piano 3 / 4 have
// C0–C7 and Eb/Gb/A 0–6). We probe the filesystem instead of hardcoding so
// missing files are detected up front.
function discoverSources() {
  const sources = [];
  for (let oct = 0; oct <= 7; oct++) {
    for (const { label, semi } of SOURCE_SEMITONES) {
      const file = join(SOURCE_DIR, `${BANK} ${label}${oct}.wav`);
      if (existsSync(file)) {
        const midi = (oct + 1) * 12 + semi;
        sources.push({ midi, file, label, octave: oct });
      }
    }
  }
  return sources;
}

function pickClosestSource(targetMidi, sources) {
  let best = sources[0];
  let bestDist = Math.abs(sources[0].midi - targetMidi);
  for (const s of sources) {
    const d = Math.abs(s.midi - targetMidi);
    if (d < bestDist) {
      best = s;
      bestDist = d;
    }
  }
  return { source: best, shift: targetMidi - best.midi };
}

// Build a ffmpeg filtergraph for the given shift (semitones).
// Shift 0: just trim + fade. Otherwise: asetrate (changes pitch + tempo),
// then aresample to standard 44.1 kHz so the file plays at the new pitch.
// We don't compensate tempo — the ~5% duration change for ±1 semitone is
// invisible after the trim + fade.
function filtergraph(shift) {
  const parts = [];
  if (shift !== 0) {
    const factor = Math.pow(2, shift / 12);
    parts.push(`asetrate=44100*${factor.toFixed(6)}`);
    parts.push(`aresample=44100`);
  }
  parts.push(`atrim=0:${TRIM_SECONDS}`);
  parts.push(`afade=t=out:st=${FADE_START}:d=${FADE_DURATION}`);
  return parts.join(',');
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (b) => { stderr += b.toString(); });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}:\n${stderr.slice(-1000)}`));
    });
  });
}

async function main() {
  if (!existsSync(SOURCE_DIR)) {
    throw new Error(`Source bank not found: ${SOURCE_DIR}`);
  }
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

  // Wipe the old set first — we're replacing wholesale, not layering.
  for (const f of readdirSync(OUTPUT_DIR)) {
    if (f.endsWith('.mp3')) unlinkSync(join(OUTPUT_DIR, f));
  }

  const sources = discoverSources();
  if (sources.length === 0) {
    throw new Error(`No source samples found for bank "${BANK}" in ${SOURCE_DIR}`);
  }
  console.log(`Bank: ${BANK} — ${sources.length} source samples discovered`);
  console.log(`Generating chromatic set MIDI ${TARGET_MIDI_LO}–${TARGET_MIDI_HI}…`);

  let okCount = 0;
  let totalBytes = 0;

  for (let midi = TARGET_MIDI_LO; midi <= TARGET_MIDI_HI; midi++) {
    const { label, octave } = midiToNoteOctave(midi);
    const outFile = join(OUTPUT_DIR, `${label}${octave}.mp3`);
    const { source, shift } = pickClosestSource(midi, sources);

    const args = [
      '-hide_banner', '-loglevel', 'error',
      '-i', source.file,
      '-af', filtergraph(shift),
      '-b:a', BITRATE,
      '-ac', '1',
      '-y', outFile,
    ];

    await runFfmpeg(args);
    const size = statSync(outFile).size;
    totalBytes += size;
    okCount++;
    const shiftLabel = shift === 0 ? '   ' : (shift > 0 ? ' +1' : ' -1');
    console.log(`  ${label}${octave}.mp3  ← ${source.label}${source.octave}${shiftLabel}  (${(size / 1024).toFixed(1)} KB)`);
  }

  console.log(`\n✓ ${okCount} files written to assets/audio/ — ${(totalBytes / 1024 / 1024).toFixed(2)} MB total`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
