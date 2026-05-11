# Keytionary

A piano learning app for iOS and Android. Interactive keyboard visualizer covering all major/minor scales, modes, chords, and extended voicings.

**The piano dictionary. Every scale, chord, and progression — visualized on the keys.**

Built with Expo (React Native) + TypeScript. Sibling app to Fretionary (guitar).

---

## Quick start

```bash
npm install
npx expo start --tunnel --clear
```

Scan the QR code with **Expo Go** on your phone (iOS or Android).

### Run on simulator

```bash
npx expo start --ios       # requires macOS + Xcode
npx expo start --android   # requires Android Studio
```

---

## Project structure

```
keytionary/
├── app/                        # expo-router screens
│   ├── _layout.tsx             # Root layout (GestureHandler, StatusBar)
│   └── (tabs)/
│       ├── _layout.tsx         # Bottom tab navigator
│       ├── index.tsx           # Keyboard tab (main interactive view)
│       ├── chords.tsx          # Chord library + piano diagrams
│       ├── progressions.tsx    # Chord progression builder + playback
│       └── tools.tsx           # Guide + metronome
│
└── src/
    ├── constants/
    │   ├── music.ts            # Theory data (scales, chords, colors)
    │   ├── progressions.ts     # Progression library
    │   ├── resolutions.ts      # Chord-resolution suggestions
    │   ├── subscription.ts     # Free vs Pro gating
    │   └── theme.ts            # Dark theme tokens
    │
    ├── store/
    │   └── useStore.ts         # Zustand global state
    │
    ├── components/
    │   ├── Piano.tsx           # SVG piano — core visual component
    │   ├── PianoChordBox.tsx   # Small piano showing a chord
    │   ├── TopBar.tsx          # Mode tabs + root note selector
    │   ├── InfoPanel.tsx       # Notes / formula / degrees info strip
    │   ├── PillSelector.tsx    # Reusable scrollable pill chip row
    │   ├── Metronome.tsx       # Pro-gated metronome
    │   ├── Onboarding.tsx      # First-run carousel
    │   ├── Paywall.tsx         # RevenueCat paywall
    │   └── ...
    │
    ├── hooks/
    │   ├── useAudioEngine.ts   # Sampled piano playback
    │   ├── useProGate.ts       # Pro feature gating
    │   └── useRevenueCat.ts    # RevenueCat client
    │
    └── utils/
        └── theory.ts           # Music theory logic (scales, chords)
```

---

## Features

### Keyboard tab
- **Scales mode** — 14 scales (major, all 7 modes, pentatonic major/minor, blues, harmonic minor, melodic minor, whole tone, diminished)
- **Chords mode** — 30+ chord types
- Color-coded notes: root (yellow), 3rd (red), 5th (green), extensions (blue), scale tones (gray)
- Note labels switchable: note name / scale degree / interval / none

### Chords tab
- Browse all chord types by category (triads, sevenths, extended, sus)
- Live piano diagram updates as you change root or chord type
- Interval structure badges with color-coded dots
- Resolution suggestions

### Progressions tab
- Common progressions library, organized by genre
- Diatonic builder for the current key
- Custom builder — add any chord by root + type
- Real song examples
- Playback with adjustable BPM

### Tools tab
- Built-in guide
- Pro metronome (BPM, time sig)

---

## App store info

- **Bundle ID (iOS):** `com.renmussoftware.keytionary`
- **Package (Android):** `com.renmussoftware.keytionary`
- **Scheme:** `keytionary`
- **Slug:** `keytionary`
