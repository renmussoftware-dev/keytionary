import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Modal, Pressable, useWindowDimensions, PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACE, RADIUS, FONT_FAMILY } from '../../src/constants/theme';
import { NOTES, NOTE_DISPLAY, CHORDS } from '../../src/constants/music';
import {
  PROGRESSIONS, GENRES, EXAMPLE_PROGRESSIONS,
  type Progression, type ExampleProgression,
} from '../../src/constants/progressions';
import PianoChordBox from '../../src/components/PianoChordBox';
import { useStore } from '../../src/store/useStore';
import { useAudioEngine } from '../../src/hooks/useAudioEngine';
import { useProGate } from '../../src/hooks/useProGate';
import { ProBanner } from '../../src/components/ProLock';
import { isProgressionFree } from '../../src/constants/subscription';
import { getChordMidi, maxInversion, getInversionBass, chordShortName } from '../../src/utils/theory';
import HeartButton from '../../src/components/HeartButton';
import SavedSheet from '../../src/components/SavedSheet';

type SubMode = 'common' | 'diatonic' | 'custom' | 'examples';

const DIATONIC_MAJOR = [
  { degree: 0,  chordType: 'Major',      numeral: 'I'    },
  { degree: 2,  chordType: 'Minor',      numeral: 'ii'   },
  { degree: 4,  chordType: 'Minor',      numeral: 'iii'  },
  { degree: 5,  chordType: 'Major',      numeral: 'IV'   },
  { degree: 7,  chordType: 'Major',      numeral: 'V'    },
  { degree: 9,  chordType: 'Minor',      numeral: 'vi'   },
  { degree: 11, chordType: 'Diminished', numeral: 'vii°' },
];

function ProgPiano({ chordRoot, chordKey, inversion, animVal }: {
  chordRoot: number; chordKey: string; inversion: number; animVal: Animated.Value;
}) {
  return (
    <Animated.View style={{ opacity: animVal, alignItems: 'center' }}>
      <PianoChordBox root={chordRoot} chordKey={chordKey} inversion={inversion} />
    </Animated.View>
  );
}

function MiniBox({ root, chordKey, inversion, numeral, active, onPress, onPickInversion, invMax }: {
  root: number;
  chordKey: string;
  inversion: number;
  numeral: string;
  active: boolean;
  onPress: () => void;
  // When provided, renders a compact `‹ R 1 2 3 ›` row directly under the
  // chord. Arrows step through inversions and serve as a visual cycle
  // affordance even when the user notices the pills first. Only passed in
  // custom mode — named/diatonic/examples display authored voicings.
  onPickInversion?: (n: number) => void;
  invMax?: number;
}) {
  const max = invMax ?? 0;
  const pillsVisible = !!onPickInversion && max > 0;
  const labels = ['R', '1', '2', '3'];
  const canPrev = inversion > 0;
  const canNext = inversion < max;
  const bump = (delta: number) => {
    if (!onPickInversion) return;
    const next = Math.max(0, Math.min(max, inversion + delta));
    if (next !== inversion) onPickInversion(next);
  };
  return (
    <View style={[styles.miniBox, active && styles.miniBoxActive]}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.miniBoxTap}>
        <Text style={[styles.miniNum, active && styles.miniNumActive]}>{numeral}</Text>
        <PianoChordBox root={root} chordKey={chordKey} inversion={inversion} compact />
      </TouchableOpacity>
      {pillsVisible && (
        <View style={styles.miniInvRow}>
          <TouchableOpacity
            onPress={() => bump(-1)}
            activeOpacity={0.7}
            disabled={!canPrev}
            style={[styles.miniInvArrow, !canPrev && styles.miniInvArrowDisabled]}
            hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
          >
            <Text style={[styles.miniInvArrowText, !canPrev && styles.miniInvArrowTextDisabled]}>‹</Text>
          </TouchableOpacity>
          {Array.from({ length: max + 1 }, (_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => onPickInversion!(i)}
              activeOpacity={0.7}
              style={[styles.miniInvPill, inversion === i && styles.miniInvPillActive]}
            >
              <Text style={[
                styles.miniInvPillText,
                inversion === i && styles.miniInvPillTextActive,
              ]}>
                {labels[i]}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={() => bump(1)}
            activeOpacity={0.7}
            disabled={!canNext}
            style={[styles.miniInvArrow, !canNext && styles.miniInvArrowDisabled]}
            hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
          >
            <Text style={[styles.miniInvArrowText, !canNext && styles.miniInvArrowTextDisabled]}>›</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function ProgressionsScreen() {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const isTablet = screenW >= 768;
  const { root, setRoot } = useStore();
  const pendingNav = useStore(s => s.pendingNav);
  const setPendingNav = useStore(s => s.setPendingNav);
  const addRecent = useStore(s => s.addRecent);
  const { isPro, requirePro } = useProGate();
  const [subMode, setSubMode] = useState<SubMode>('common');
  const [genre, setGenre] = useState('All');
  const [selectedProg, setSelectedProg] = useState<Progression>(PROGRESSIONS[0]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [bpm, setBpm] = useState(80);
  const [showModal, setShowModal] = useState(false);
  const [customChords, setCustomChords] = useState<{ root: number; chordType: string; inversion: number }[]>([]);
  const [modalRoot, setModalRoot] = useState<number>(root);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [selectedExample, setSelectedExample] = useState<ExampleProgression | null>(EXAMPLE_PROGRESSIONS[0]);

  useEffect(() => {
    if (pendingNav?.kind === 'progression') {
      const match = PROGRESSIONS.find(p => p.name === pendingNav.progName);
      if (match) {
        setSelectedProg(match);
        setSubMode('common');
        setActiveIdx(0);
        setPlaying(false);
      }
      setPendingNav(null);
    }
  }, [pendingNav, setPendingNav]);

  const isNamedProg = useMemo(
    () => subMode === 'common' && PROGRESSIONS.some(p => p.name === selectedProg.name),
    [subMode, selectedProg.name],
  );
  const drawerAnim = useRef(new Animated.Value(0)).current;
  const scrimAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { playChord, playProgression, stopProgression } = useAudioEngine();

  const pillOffset = useRef(new Animated.Value(0)).current;
  const pillBase   = useRef(0);
  const didDrag    = useRef(false);
  const progPanResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      didDrag.current = false;
      pillOffset.setOffset(pillBase.current);
      pillOffset.setValue(0);
    },
    onPanResponderMove: (_, gs) => {
      if (Math.abs(gs.dy) > 4) didDrag.current = true;
      pillOffset.setValue(gs.dy);
    },
    onPanResponderRelease: (_, gs) => {
      pillOffset.flattenOffset();
      const clamped = Math.max(0, Math.min(screenH * 0.82, pillBase.current + gs.dy));
      pillBase.current = clamped;
      Animated.spring(pillOffset, { toValue: clamped, useNativeDriver: true, bounciness: 0, speed: 20 }).start();
      if (!didDrag.current) drawerOpen ? closeDrawer() : openDrawer();
    },
  })).current;

  // Custom and Examples don't have authored roman-numeral labels — derive a
  // chord-name shorthand (Cmaj7, Dm, A7♭5, etc.) from each step's root and
  // type. Named progressions keep their roman numerals; the chord names
  // are read off the now-playing card instead.
  const activeProg: Progression = subMode === 'custom'
    ? {
        name: 'Custom',
        numerals: customChords.map(c => chordShortName(c.root, c.chordType)),
        degrees: customChords.map(() => 0),
        chordTypes: customChords.map(c => c.chordType),
        inversions: customChords.map(c => c.inversion),
        genre: 'Custom',
        description: '',
      }
    : subMode === 'examples'
      ? selectedExample
        ? {
            name: selectedExample.name,
            numerals: selectedExample.chords.map(c => chordShortName(c.root, c.chordType)),
            degrees: selectedExample.chords.map(() => 0),
            chordTypes: selectedExample.chords.map(c => c.chordType),
            inversions: selectedExample.chords.map(c => c.inversion ?? 0),
            genre: selectedExample.genre,
            description: selectedExample.description,
          }
        : { name: '', numerals: [], degrees: [], chordTypes: [], inversions: [], genre: '', description: '' }
      : selectedProg;

  const progRoots: number[] = subMode === 'custom'
    ? customChords.map(c => c.root)
    : subMode === 'examples'
      ? (selectedExample?.chords.map(c => c.root) ?? [])
      : selectedProg.degrees.map(d => (root + d) % 12);

  // Per-step inversions. Custom is the source of truth from customChords.
  // Examples can specify inversions inline. Named progressions default all
  // steps to root position unless their data specifies otherwise.
  const stepInversions: number[] = activeProg.inversions
    ?? activeProg.chordTypes.map(() => 0);

  const count = activeProg.degrees.length;
  const currentRoot = progRoots[activeIdx] ?? 0;
  const currentType = activeProg.chordTypes[activeIdx] ?? 'Major';
  const currentNumeral = activeProg.numerals[activeIdx] ?? '';
  const currentInversion = stepInversions[activeIdx] ?? 0;

  function getProgressionMidi(): number[][] {
    return progRoots.map((chordRoot, i) => {
      const chordType = activeProg.chordTypes[i] ?? 'Major';
      const inv = stepInversions[i] ?? 0;
      return getChordMidi(chordRoot, chordType, 4, inv);
    });
  }

  // Stable string key for the current chord sequence — restart playback only
  // when the sequence actually changes, not on every render. Inversions are
  // part of the identity so toggling them mid-progression updates playback.
  const sequenceKey = progRoots
    .map((r, i) => `${r}:${activeProg.chordTypes[i] ?? 'Major'}:${stepInversions[i] ?? 0}`)
    .join('|');

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!playing) { stopProgression(); return; }
    if (sequenceKey.length === 0) return;

    const midiList = getProgressionMidi();
    playProgression(
      midiList,
      bpm,
      (idx) => {
        setActiveIdx(idx);
        Animated.sequence([
          Animated.timing(fadeAnim, { toValue: 0.3, duration: 70, useNativeDriver: true }),
          Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
      },
      () => setPlaying(false),
    );
    return () => { stopProgression(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, bpm, sequenceKey]);

  const DRAWER_W = 200;

  function openDrawer() {
    setDrawerOpen(true);
    Animated.parallel([
      Animated.spring(drawerAnim, { toValue: 1, useNativeDriver: true, bounciness: 0, speed: 20 }),
      Animated.timing(scrimAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }

  function closeDrawer() {
    Animated.parallel([
      Animated.spring(drawerAnim, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 20 }),
      Animated.timing(scrimAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => setDrawerOpen(false));
  }

  function goTo(i: number) {
    setActiveIdx(i);
    setPlaying(false);
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0.3, duration: 60, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 160, useNativeDriver: true }),
    ]).start();
    const chordRoot = progRoots[i] ?? 0;
    const chordType = activeProg.chordTypes[i] ?? 'Major';
    const inv = stepInversions[i] ?? 0;
    // Progression audio is Pro — let free users navigate the carousel visually
    // but only Pro users hear the chord. The Play button itself routes to the
    // paywall, so the upgrade pressure stays focused there.
    if (isPro) playChord(getChordMidi(chordRoot, chordType, 4, inv));
  }

  // Set the current step's inversion. Only meaningful when subMode === 'custom'
  // since that's where the chord list is mutable. For named/diatonic/examples
  // we ignore — the UI gates the controls on subMode anyway.
  function pickStepInversion(n: number) {
    if (subMode !== 'custom') return;
    pickInversionForStep(activeIdx, n);
  }

  // Same as pickStepInversion but for any step index (used by per-card pill
  // rows in the chord-shapes carousel — lets users adjust voicing of any
  // chord directly without having to make it active first).
  function pickInversionForStep(stepIdx: number, n: number) {
    if (subMode !== 'custom') return;
    setCustomChords(chords => chords.map((c, i) =>
      i === stepIdx ? { ...c, inversion: n } : c,
    ));
    const chordRoot = progRoots[stepIdx] ?? 0;
    const chordType = activeProg.chordTypes[stepIdx] ?? 'Major';
    // Same Pro gate as goTo — inversion changes still update the UI for free
    // users, but only Pro users hear the result.
    if (isPro) playChord(getChordMidi(chordRoot, chordType, 4, n));
  }

  // Bump a step's inversion by +/-1, clamped at [0, maxForChord]. Used by the
  // arrow buttons that flank each pill row — they exist for affordance more
  // than utility (users can tap any pill directly), but power users may
  // prefer the cycle pattern.
  function bumpStepInversion(stepIdx: number, delta: number) {
    if (subMode !== 'custom') return;
    const chordType = activeProg.chordTypes[stepIdx] ?? 'Major';
    const max = Math.min(maxInversion(chordType), 3);
    const current = stepInversions[stepIdx] ?? 0;
    const next = Math.max(0, Math.min(max, current + delta));
    if (next !== current) pickInversionForStep(stepIdx, next);
  }

  function pickProg(p: Progression) {
    setSelectedProg(p);
    setActiveIdx(0);
    setPlaying(false);
    if (PROGRESSIONS.some(x => x.name === p.name)) {
      addRecent({ kind: 'progression', root, progName: p.name });
    }
  }

  const filtered = PROGRESSIONS.filter(p => genre === 'All' || p.genre === genre);

  const drawerX = drawerAnim.interpolate({ inputRange: [0, 1], outputRange: [-DRAWER_W, 0] });
  const toggleX = drawerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, DRAWER_W] });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>Builder</Text>
            <Text style={styles.title}>Progressions</Text>
          </View>
          <View style={styles.bpmRow}>
            <TouchableOpacity onPress={() => setBpm(b => Math.max(40, b - 10))} style={styles.bpmBtn} activeOpacity={0.7}>
              <Text style={styles.bpmBtnTxt}>–</Text>
            </TouchableOpacity>
            <Text style={styles.bpmTxt}>{bpm} BPM</Text>
            <TouchableOpacity onPress={() => setBpm(b => Math.min(200, b + 10))} style={styles.bpmBtn} activeOpacity={0.7}>
              <Text style={styles.bpmBtnTxt}>+</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => setSavedOpen(true)} activeOpacity={0.7} style={styles.savedBtn}>
            <Text style={styles.savedBtnText}>♥</Text>
          </TouchableOpacity>
        </View>
        {subMode !== 'examples' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.noteRow}>
            {NOTES.map((n, i) => (
              <TouchableOpacity key={n} onPress={() => {
                  setRoot(i);
                  if (isNamedProg) {
                    addRecent({ kind: 'progression', root: i, progName: selectedProg.name });
                  }
                }}
                style={[styles.notePill, root === i && styles.notePillActive]} activeOpacity={0.7}>
                <Text style={[styles.noteText, root === i && styles.noteTextActive]}>{NOTE_DISPLAY[n] || n}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        <View style={styles.subTabs}>
          {(['common', 'diatonic', 'custom', 'examples'] as SubMode[]).map(m => (
            <TouchableOpacity key={m}
              onPress={() => { setSubMode(m); setActiveIdx(0); setPlaying(false); }}
              style={[styles.subTab, subMode === m && styles.subTabActive]} activeOpacity={0.7}>
              <Text style={[styles.subTabTxt, subMode === m && styles.subTabTxtActive]}>
                {m === 'common' ? 'Common' : m === 'diatonic' ? 'Diatonic' : m === 'custom' ? 'Custom' : 'Examples'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={[styles.body, { overflow: 'hidden' }]}>
        <View style={styles.right}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {count > 0 ? (
              <>
                <Text style={styles.secLabel}>Now playing</Text>
                <View style={styles.activeCard}>
                  {isNamedProg && (
                    <View style={styles.activeCardHeart}>
                      <HeartButton
                        item={{ kind: 'progression', root, progName: selectedProg.name }}
                        size="md"
                      />
                    </View>
                  )}
                  <View style={styles.activeCardTop}>
                    <Text style={styles.activeProgTitle}>
                      {subMode === 'examples'
                        ? (selectedExample?.name ?? 'Examples')
                        : subMode === 'custom'
                          ? 'Custom'
                          : (selectedProg.name || (subMode === 'diatonic' ? 'Diatonic' : 'Common'))}
                    </Text>
                    <Text style={styles.activeMeta}>
                      Key of {subMode === 'examples' ? (selectedExample?.key ?? NOTES[root]) : NOTES[root]} · {bpm} BPM
                    </Text>
                  </View>
                  <Text style={styles.activeName}>
                    {NOTES[currentRoot]} {currentType}
                    {currentInversion > 0 && (
                      <Text style={styles.activeNameSlash}>
                        {' '}/ {NOTES[getInversionBass(currentRoot, currentType, currentInversion)]}
                      </Text>
                    )}
                  </Text>
                  <Text style={styles.activeIntervals}>{CHORDS[currentType]?.intervalNames.join('  ·  ')}</Text>

                  {/* Per-step inversion picker — only meaningful in the custom
                      builder where each step's voicing is part of the saved
                      arrangement. Named/diatonic/examples play as authored. */}
                  {subMode === 'custom' && CHORDS[currentType] && CHORDS[currentType].intervals.length >= 2 && (() => {
                    const invMax = Math.min(maxInversion(currentType), 3);
                    const labels = ['Root', '1st', '2nd', '3rd'];
                    const canPrev = currentInversion > 0;
                    const canNext = currentInversion < invMax;
                    return (
                      <View style={styles.stepInvRow}>
                        <TouchableOpacity
                          onPress={() => bumpStepInversion(activeIdx, -1)}
                          activeOpacity={0.7}
                          disabled={!canPrev}
                          style={[styles.stepInvArrow, !canPrev && styles.stepInvArrowDisabled]}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Text style={[styles.stepInvArrowText, !canPrev && styles.stepInvArrowTextDisabled]}>‹</Text>
                        </TouchableOpacity>
                        {Array.from({ length: invMax + 1 }, (_, i) => (
                          <TouchableOpacity
                            key={i}
                            onPress={() => pickStepInversion(i)}
                            activeOpacity={0.7}
                            style={[
                              styles.stepInvPill,
                              currentInversion === i && styles.stepInvPillActive,
                            ]}
                          >
                            <Text style={[
                              styles.stepInvPillText,
                              currentInversion === i && styles.stepInvPillTextActive,
                            ]}>
                              {labels[i]}
                            </Text>
                          </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                          onPress={() => bumpStepInversion(activeIdx, 1)}
                          activeOpacity={0.7}
                          disabled={!canNext}
                          style={[styles.stepInvArrow, !canNext && styles.stepInvArrowDisabled]}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Text style={[styles.stepInvArrowText, !canNext && styles.stepInvArrowTextDisabled]}>›</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })()}
                </View>

                <View style={styles.fbWrap}>
                  <ProgPiano chordRoot={currentRoot} chordKey={currentType} inversion={currentInversion} animVal={fadeAnim} />
                </View>

                <View style={styles.ctrlRow}>
                  <TouchableOpacity onPress={() => goTo((activeIdx - 1 + count) % count)} style={styles.navBtn} activeOpacity={0.7}>
                    <Text style={styles.navTxt}>‹</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => {
                      if (!isPro) { requirePro(() => {}); return; }
                      setPlaying(v => !v);
                    }}
                    style={[styles.playCircle, playing && styles.playCircleOn]} activeOpacity={0.85}>
                    <Text style={styles.playGlyph}>
                      {!isPro ? '🔒' : playing ? '⏸' : '▶'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => goTo((activeIdx + 1) % count)} style={styles.navBtn} activeOpacity={0.7}>
                    <Text style={styles.navTxt}>›</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.dots}>
                  {activeProg.degrees.map((_, i) => (
                    <TouchableOpacity key={i} onPress={() => goTo(i)} activeOpacity={0.7}>
                      <View style={[styles.dot, i === activeIdx && styles.dotActive]} />
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.secLabel}>Chord shapes</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.boxRow}>
                  {progRoots.map((rootI, i) => (
                    <MiniBox key={i} root={rootI} chordKey={activeProg.chordTypes[i]}
                      inversion={stepInversions[i] ?? 0}
                      // Always show chord shorthand (Cmaj7, Am, etc.) on cards
                      // — the use case is "look ahead and know what to play
                      // next without tapping". Roman numerals for named
                      // progressions stay visible in the progression name and
                      // in the drawer list.
                      numeral={chordShortName(rootI, activeProg.chordTypes[i] ?? 'Major')}
                      active={i === activeIdx} onPress={() => goTo(i)}
                      onPickInversion={subMode === 'custom' ? (n) => pickInversionForStep(i, n) : undefined}
                      invMax={Math.min(maxInversion(activeProg.chordTypes[i] ?? 'Major'), 3)}
                    />
                  ))}
                </ScrollView>

                {activeProg.description ? (
                  <View style={styles.descCard}>
                    <Text style={styles.descTitle}>{activeProg.name}</Text>
                    <Text style={styles.descTxt}>{activeProg.description}</Text>
                  </View>
                ) : null}
              </>
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyTxt}>
                  {subMode === 'custom'
                    ? 'Add chords on the left\nto build a progression'
                    : 'Select a progression'}
                </Text>
              </View>
            )}
            <View style={{ height: 80 }} />
          </ScrollView>
        </View>

        {drawerOpen && (
          <Animated.View style={[styles.scrim, { opacity: scrimAnim }]} pointerEvents="auto">
            <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />
          </Animated.View>
        )}

        <Animated.View style={[styles.drawer, { transform: [{ translateX: drawerX }] }]}>
          {drawerOpen && subMode === 'common' && (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.genreRow} style={{ maxHeight: 40 }}>
                {GENRES.map(g => (
                  <TouchableOpacity key={g} onPress={() => setGenre(g)}
                    style={[styles.genrePill, genre === g && styles.genrePillActive]} activeOpacity={0.7}>
                    <Text style={[styles.genreTxt, genre === g && styles.genreTxtActive]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <ScrollView showsVerticalScrollIndicator={false}>
                {!isPro && <ProBanner />}
                {filtered.map(p => {
                  const locked = !isPro && !isProgressionFree(p.name);
                  return (
                    <TouchableOpacity key={p.name} onPress={() => {
                      if (locked) { requirePro(() => { pickProg(p); closeDrawer(); }); return; }
                      pickProg(p); closeDrawer();
                    }}
                      style={[styles.progItem, selectedProg.name === p.name && subMode === 'common' && styles.progItemActive, locked && { opacity: 0.5 }]}
                      activeOpacity={0.7}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={[styles.progName, selectedProg.name === p.name && subMode === 'common' && styles.progNameActive]}
                          numberOfLines={1}>{p.name}</Text>
                        {locked && <Text style={{ fontSize: 12 }}>🔒</Text>}
                      </View>
                      <View style={styles.progMeta}>
                        <View style={styles.badge}><Text style={styles.badgeTxt}>{p.genre}</Text></View>
                        <Text style={styles.progNums} numberOfLines={1}>{p.numerals.slice(0, 4).join(' – ')}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                <View style={{ height: 40 }} />
              </ScrollView>
            </>
          )}
          {drawerOpen && subMode === 'diatonic' && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.diatHeader}>Key of {NOTES[root]} major</Text>
              {DIATONIC_MAJOR.map((d, i) => {
                const cr = (root + d.degree) % 12;
                return (
                  <TouchableOpacity key={i} onPress={() => {
                    pickProg({ name: `${d.numeral} — ${NOTES[cr]} ${d.chordType}`, numerals: [d.numeral], degrees: [d.degree], chordTypes: [d.chordType], genre: 'Diatonic', description: `The ${d.numeral} chord of ${NOTES[root]} major.` });
                    closeDrawer();
                  }} style={styles.progItem} activeOpacity={0.7}>
                    <View style={styles.diatRow}>
                      <Text style={styles.diatNum}>{d.numeral}</Text>
                      <View>
                        <Text style={styles.progName}>{NOTES[cr]} {d.chordType}</Text>
                        <Text style={styles.progNums}>{CHORDS[d.chordType]?.intervalNames.join(' · ')}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
              <Text style={styles.diatSubhead}>Common in {NOTES[root]}</Text>
              {[
                { name: 'I – IV – V', n: ['I','IV','V'], d: [0,5,7], t: ['Major','Major','Major'] },
                { name: 'I – V – vi – IV', n: ['I','V','vi','IV'], d: [0,7,9,5], t: ['Major','Major','Minor','Major'] },
                { name: 'ii – V – I', n: ['ii','V','I'], d: [2,7,0], t: ['Minor','Major','Major'] },
                { name: 'I – vi – IV – V', n: ['I','vi','IV','V'], d: [0,9,5,7], t: ['Major','Minor','Major','Major'] },
              ].map(p => (
                <TouchableOpacity key={p.name} onPress={() => {
                  const match = PROGRESSIONS.find(x => x.name === p.name);
                  if (match) pickProg(match);
                  else pickProg({ name: p.name, numerals: p.n, degrees: p.d, chordTypes: p.t, genre: 'Diatonic', description: '' });
                  closeDrawer();
                }} style={styles.progItem} activeOpacity={0.7}>
                  <Text style={styles.progName}>{p.name}</Text>
                  <Text style={styles.progNums}>{p.n.join(' – ')}</Text>
                </TouchableOpacity>
              ))}
              <View style={{ height: 40 }} />
            </ScrollView>
          )}
          {drawerOpen && subMode === 'custom' && (
            <View style={{ flex: 1 }}>
              <TouchableOpacity onPress={() => setShowModal(true)} style={styles.addBtn} activeOpacity={0.7}>
                <Text style={styles.addBtnTxt}>+ Add chord</Text>
              </TouchableOpacity>
              <ScrollView showsVerticalScrollIndicator={false}>
                {customChords.length === 0 && (
                  <Text style={styles.customEmpty}>Tap + Add chord to build your progression</Text>
                )}
                {customChords.map((c, i) => (
                  <View key={i} style={styles.customItem}>
                    <Text style={styles.customItemNum}>{NOTES[c.root]}</Text>
                    <Text style={styles.customItemName} numberOfLines={1}>
                      {NOTES[c.root]} {c.chordType}
                      {c.inversion > 0 && ` / ${NOTES[getInversionBass(c.root, c.chordType, c.inversion)]}`}
                    </Text>
                    <TouchableOpacity onPress={() => { setCustomChords(ch => ch.filter((_, j) => j !== i)); if (activeIdx >= customChords.length - 1) setActiveIdx(0); }}
                      style={styles.removeBtn} activeOpacity={0.7}>
                      <Text style={styles.removeTxt}>x</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          )}
          {drawerOpen && subMode === 'examples' && (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.genreRow} style={{ maxHeight: 40 }}>
                {GENRES.map(g => (
                  <TouchableOpacity key={g} onPress={() => setGenre(g)}
                    style={[styles.genrePill, genre === g && styles.genrePillActive]} activeOpacity={0.7}>
                    <Text style={[styles.genreTxt, genre === g && styles.genreTxtActive]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <ScrollView showsVerticalScrollIndicator={false}>
                {EXAMPLE_PROGRESSIONS.filter(e => genre === 'All' || e.genre === genre).map(ex => {
                  const active = selectedExample?.name === ex.name;
                  return (
                    <TouchableOpacity key={ex.name} onPress={() => {
                        setSelectedExample(ex);
                        setActiveIdx(0);
                        setPlaying(false);
                        closeDrawer();
                      }}
                      style={[styles.progItem, active && styles.progItemActive]} activeOpacity={0.7}>
                      <Text style={[styles.progName, active && styles.progNameActive]} numberOfLines={1}>
                        {ex.name}
                      </Text>
                      <View style={styles.progMeta}>
                        <View style={styles.badge}><Text style={styles.badgeTxt}>{ex.genre}</Text></View>
                        <Text style={styles.progNums} numberOfLines={1}>
                          {ex.chords.map(c => NOTES[c.root]).slice(0, 4).join(' – ')}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                <View style={{ height: 40 }} />
              </ScrollView>
            </>
          )}
        </Animated.View>

        <Animated.View
          style={[styles.toggleWrap, { transform: [{ translateX: toggleX }, { translateY: pillOffset }] }]}
          {...progPanResponder.panHandlers}
        >
          <View style={styles.togglePill}>
            <Text style={styles.toggleDots}>⋮</Text>
            <Text style={styles.toggleArrow}>{drawerOpen ? '‹' : '›'}</Text>
            <Text style={styles.toggleLabel}>LIST</Text>
          </View>
        </Animated.View>
      </View>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHdr}>
              <Text style={styles.modalTitle}>Add a chord</Text>
              <TouchableOpacity onPress={() => setShowModal(false)} activeOpacity={0.7}>
                <Text style={styles.modalClose}>Done</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={styles.modalSec}>Diatonic — {NOTES[root]} major</Text>
              {DIATONIC_MAJOR.map((d, i) => {
                const absRoot = (root + d.degree) % 12;
                return (
                  <TouchableOpacity key={i}
                    onPress={() => {
                      setCustomChords(ch => [...ch, { root: absRoot, chordType: d.chordType, inversion: 0 }]);
                      setShowModal(false); setActiveIdx(0);
                    }}
                    style={styles.modalItem} activeOpacity={0.7}>
                    <Text style={styles.modalNum}>{d.numeral}</Text>
                    <Text style={styles.modalName}>{NOTES[absRoot]} {d.chordType}</Text>
                    <Text style={styles.modalIntervals}>{CHORDS[d.chordType]?.intervalNames.join(' · ')}</Text>
                  </TouchableOpacity>
                );
              })}

              <Text style={styles.modalSec}>Any chord — pick a root</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modalNoteRow}>
                {NOTES.map((n, i) => (
                  <TouchableOpacity key={n} onPress={() => setModalRoot(i)}
                    style={[styles.modalNotePill, modalRoot === i && styles.modalNotePillActive]} activeOpacity={0.7}>
                    <Text style={[styles.modalNoteText, modalRoot === i && styles.modalNoteTextActive]}>
                      {NOTE_DISPLAY[n] || n}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {Object.keys(CHORDS).map(ck => (
                <TouchableOpacity key={ck}
                  onPress={() => {
                    setCustomChords(ch => [...ch, { root: modalRoot, chordType: ck, inversion: 0 }]);
                    setShowModal(false); setActiveIdx(0);
                  }}
                  style={styles.modalItem} activeOpacity={0.7}>
                  <Text style={styles.modalNum}>{NOTES[modalRoot]}</Text>
                  <Text style={styles.modalName}>{NOTES[modalRoot]} {ck}</Text>
                  <Text style={styles.modalIntervals}>{CHORDS[ck]?.intervalNames.join(' · ')}</Text>
                </TouchableOpacity>
              ))}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <SavedSheet visible={savedOpen} onClose={() => setSavedOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: COLORS.bg },
  header:         {
                    backgroundColor: COLORS.surface,
                    borderBottomWidth: 1, borderBottomColor: COLORS.border,
                    paddingTop: SPACE.md, paddingBottom: SPACE.sm,
                    gap: SPACE.sm,
                  },
  headerTop:      {
                    flexDirection: 'row', alignItems: 'center',
                    paddingHorizontal: SPACE.lg, gap: SPACE.sm,
                  },
  eyebrow:        {
                    fontSize: 11, fontWeight: '500',
                    color: COLORS.textMuted, letterSpacing: 0.4,
                    marginBottom: 1,
                  },
  title:          { fontSize: 24, fontWeight: '700', color: COLORS.text, letterSpacing: -0.4 },
  bpmRow:         { flexDirection: 'row', alignItems: 'center', gap: 5 },
  bpmBtn:         {
                    width: 28, height: 28, borderRadius: 14,
                    borderWidth: 1, borderColor: COLORS.border,
                    backgroundColor: COLORS.surface,
                    alignItems: 'center', justifyContent: 'center',
                  },
  bpmBtnTxt:      { fontSize: 16, color: COLORS.text, lineHeight: 20 },
  bpmTxt:         {
                    fontSize: 12, fontWeight: '700',
                    color: COLORS.text, minWidth: 64, textAlign: 'center',
                    fontFamily: FONT_FAMILY.mono, letterSpacing: 0.4,
                  },
  noteRow:        { flexDirection: 'row', paddingHorizontal: SPACE.lg, gap: 6 },
  notePill:       {
                    paddingHorizontal: 11, paddingVertical: 6,
                    borderRadius: RADIUS.full,
                    backgroundColor: COLORS.surface,
                    borderWidth: 1, borderColor: 'transparent',
                  },
  notePillActive: { backgroundColor: COLORS.accentSoft, borderColor: COLORS.accent },
  noteText:       {
                    fontSize: 13, fontWeight: '500',
                    color: COLORS.textMuted,
                    fontFamily: FONT_FAMILY.mono, letterSpacing: 0.2,
                  },
  noteTextActive: { color: COLORS.text, fontWeight: '700' },
  subTabs:        {
                    flexDirection: 'row',
                    marginHorizontal: SPACE.lg, gap: 4,
                    backgroundColor: COLORS.surface,
                    borderRadius: RADIUS.md,
                    padding: 3,
                    borderWidth: 1, borderColor: COLORS.border,
                  },
  subTab:         { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 7 },
  subTabActive:   { backgroundColor: COLORS.surfaceActive },
  subTabTxt:      { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, letterSpacing: 0.1 },
  subTabTxtActive:{ color: COLORS.text },
  body:           { flex: 1 },
  scrim:          { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 10 },
  drawer:         { position: 'absolute', left: 0, top: 0, bottom: 0, width: 200, backgroundColor: COLORS.bgElevated, borderRightWidth: 1, borderRightColor: COLORS.border, zIndex: 20 },
  toggleWrap:     { position: 'absolute', left: 0, top: '35%', zIndex: 30 },
  togglePill:     { backgroundColor: COLORS.surfaceHigh, borderTopRightRadius: 20, borderBottomRightRadius: 20, borderWidth: 1, borderLeftWidth: 0, borderColor: COLORS.borderLight, paddingVertical: 14, paddingLeft: 6, paddingRight: 10, alignItems: 'center', gap: 4 },
  toggleDots:     { fontSize: 13, color: COLORS.textFaint, lineHeight: 14, letterSpacing: -2 },
  toggleArrow:    { fontSize: 16, color: COLORS.text, fontWeight: '600', lineHeight: 18 },
  toggleLabel:    { fontSize: 9, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1.2 },
  genreRow:       { flexDirection: 'row', paddingHorizontal: SPACE.sm, paddingVertical: SPACE.xs, gap: 5 },
  genrePill:      { paddingHorizontal: 9, paddingVertical: 4, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bg },
  genrePillActive:{ backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  genreTxt:       { fontSize: 11, fontWeight: '500', color: COLORS.textMuted },
  genreTxtActive: { color: '#fff' },
  progItem:       { paddingVertical: 9, paddingHorizontal: SPACE.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  progItemActive: { backgroundColor: COLORS.surfaceHigh },
  progName:       { fontSize: 11, fontWeight: '600', color: COLORS.text, marginBottom: 3 },
  progNameActive: { color: COLORS.accent },
  progMeta:       { flexDirection: 'row', alignItems: 'center', gap: 5 },
  badge:          { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, backgroundColor: COLORS.surfaceHigh, borderWidth: 0.5, borderColor: COLORS.border },
  badgeTxt:       { fontSize: 8, color: COLORS.textFaint, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', fontFamily: FONT_FAMILY.mono },
  progNums:       { fontSize: 9, color: COLORS.textFaint, flex: 1, fontFamily: FONT_FAMILY.mono },
  diatHeader:     { fontSize: 11, fontWeight: '600', color: COLORS.accent, padding: SPACE.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  diatSubhead:    { fontSize: 10, fontWeight: '500', color: COLORS.textMuted, paddingHorizontal: SPACE.md, paddingTop: SPACE.md, paddingBottom: SPACE.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  diatRow:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  diatNum:        { fontSize: 16, fontWeight: '700', color: COLORS.textMuted, width: 30 },
  addBtn:         { margin: SPACE.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.accent, paddingVertical: 9, alignItems: 'center', backgroundColor: COLORS.accentLight },
  addBtnTxt:      { fontSize: 13, fontWeight: '600', color: COLORS.accent },
  customEmpty:    { fontSize: 12, color: COLORS.textFaint, padding: SPACE.lg, textAlign: 'center', lineHeight: 20 },
  customItem:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: SPACE.md, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 6 },
  customItemNum:  { fontSize: 13, fontWeight: '700', color: COLORS.accent, width: 28 },
  customItemName: { fontSize: 11, color: COLORS.text, flex: 1 },
  removeBtn:      { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  removeTxt:      { fontSize: 9, color: COLORS.textMuted },
  right:          { flex: 1 },
  activeCard:     {
                    marginHorizontal: SPACE.md, marginBottom: SPACE.md,
                    backgroundColor: COLORS.surface,
                    borderRadius: RADIUS.lg,
                    borderWidth: 1, borderColor: COLORS.border,
                    padding: SPACE.lg,
                    alignItems: 'center',
                  },
  activeCardHeart:{ position: 'absolute', top: 8, right: 8, zIndex: 2 },
  activeCardTop:  { alignItems: 'center', marginBottom: SPACE.sm },
  activeProgTitle:{
                    fontSize: 22, fontWeight: '700', color: COLORS.text,
                    fontFamily: FONT_FAMILY.mono, letterSpacing: -0.3,
                    marginBottom: 4,
                  },
  activeMeta:     {
                    fontSize: 11, color: COLORS.textMuted,
                    fontFamily: FONT_FAMILY.mono, letterSpacing: 0.3,
                  },
  activeName:     { fontSize: 24, fontWeight: '700', color: COLORS.text, marginTop: SPACE.sm },
  // Slash-chord bass note renders muted so the main chord name stays the
  // primary cue — same treatment as on the Chords tab.
  activeNameSlash:{ color: COLORS.textMuted, fontWeight: '600' },
  activeIntervals:{ fontSize: 11, color: COLORS.textMuted, letterSpacing: 0.4, marginTop: 3 },

  // Per-step inversion pill row in the now-playing card (custom mode only).
  stepInvRow:     {
                    flexDirection: 'row',
                    gap: 6,
                    marginTop: SPACE.md,
                    justifyContent: 'center',
                  },
  stepInvPill:    {
                    paddingHorizontal: 12, paddingVertical: 5,
                    borderRadius: RADIUS.full,
                    backgroundColor: COLORS.surface,
                    borderWidth: 1, borderColor: COLORS.border,
                  },
  stepInvPillActive: {
                    backgroundColor: COLORS.accentSoft,
                    borderColor: COLORS.accent,
                  },
  stepInvPillText: {
                    fontSize: 11, fontWeight: '600',
                    color: COLORS.textMuted,
                    fontFamily: FONT_FAMILY.mono,
                    letterSpacing: 0.4,
                  },
  stepInvPillTextActive: { color: COLORS.text },
  // ‹ › arrows flanking the now-playing inversion pills. Bigger hit target
  // than the pills themselves; visually de-emphasized so the pills remain
  // the primary affordance.
  stepInvArrow:         {
                          width: 28, height: 28, borderRadius: 14,
                          borderWidth: 1, borderColor: COLORS.border,
                          backgroundColor: COLORS.surface,
                          alignItems: 'center', justifyContent: 'center',
                        },
  stepInvArrowDisabled: { opacity: 0.3 },
  stepInvArrowText:     { fontSize: 16, fontWeight: '700', color: COLORS.textMuted, lineHeight: 18 },
  stepInvArrowTextDisabled: { color: COLORS.textFaint },
  activeProgName: { fontSize: 11, color: COLORS.textFaint, marginTop: 6, fontWeight: '600' },
  savedBtn:       {
                    width: 32, height: 32, borderRadius: 16,
                    borderWidth: 1, borderColor: COLORS.border,
                    backgroundColor: COLORS.surface,
                    alignItems: 'center', justifyContent: 'center',
                  },
  savedBtnText:   { fontSize: 14, color: '#D45846', fontWeight: '700', lineHeight: 16 },
  fbWrap:         {
                    backgroundColor: COLORS.surface,
                    borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border,
                    paddingVertical: SPACE.sm, marginBottom: SPACE.md,
                    alignItems: 'center',
                  },
  ctrlRow:        {
                    flexDirection: 'row', alignItems: 'center',
                    justifyContent: 'center', gap: 12,
                    marginBottom: SPACE.lg,
                  },
  navBtn:         {
                    width: 36, height: 36, borderRadius: 18,
                    borderWidth: 1, borderColor: COLORS.border,
                    backgroundColor: COLORS.surface,
                    alignItems: 'center', justifyContent: 'center',
                  },
  navTxt:         { fontSize: 18, color: COLORS.textMuted, fontWeight: '600', lineHeight: 20 },
  playCircle:     {
                    width: 56, height: 56, borderRadius: 28,
                    backgroundColor: COLORS.accent,
                    alignItems: 'center', justifyContent: 'center',
                    shadowColor: COLORS.accent,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.45,
                    shadowRadius: 14,
                    elevation: 6,
                  },
  playCircleOn:   { backgroundColor: '#D45846' },
  playGlyph:      { fontSize: 20, color: '#fff', fontWeight: '700' },
  dots:           { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: SPACE.lg, flexWrap: 'wrap', paddingHorizontal: SPACE.md },
  dot:            { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.surfaceHigh, borderWidth: 1, borderColor: COLORS.border },
  dotActive:      { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  secLabel:       {
                    fontSize: 10, fontWeight: '600',
                    color: COLORS.textFaint, letterSpacing: 1.2,
                    textTransform: 'uppercase',
                    paddingHorizontal: SPACE.md, marginTop: SPACE.md, marginBottom: SPACE.sm,
                    fontFamily: FONT_FAMILY.mono,
                  },
  boxRow:         { paddingHorizontal: SPACE.md, gap: 8, paddingBottom: SPACE.md },
  miniBox:        { alignItems: 'center', padding: 7, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, minWidth: 70 },
  miniBoxActive:  { borderColor: '#E8D44D', backgroundColor: COLORS.surfaceHigh },
  // Tap target for selecting the step (chord title + keyboard). The inversion
  // pills sit below this as a sibling so they don't trigger step-selection
  // when tapped.
  miniBoxTap:     { alignItems: 'center' },
  miniNum:        { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, marginBottom: 3 },
  miniNumActive:  { color: '#E8D44D' },
  miniName:       { fontSize: 8, color: COLORS.textFaint, marginTop: 1 },
  miniNameActive: { color: COLORS.textMuted },
  // Compact inversion pills under each chord card in custom mode. Labels are
  // single chars (R / 1 / 2 / 3) to fit the narrow MiniBox width.
  miniInvRow:        { flexDirection: 'row', gap: 3, marginTop: 6 },
  miniInvPill:       {
                       paddingHorizontal: 6, paddingVertical: 2,
                       borderRadius: 8,
                       backgroundColor: COLORS.bg,
                       borderWidth: 1, borderColor: COLORS.border,
                       minWidth: 18, alignItems: 'center',
                     },
  miniInvPillActive: { backgroundColor: COLORS.accentSoft, borderColor: COLORS.accent },
  miniInvPillText:   {
                       fontSize: 9, fontWeight: '700',
                       color: COLORS.textMuted,
                       fontFamily: FONT_FAMILY.mono,
                     },
  miniInvPillTextActive: { color: COLORS.text },
  // Compact ‹ › arrows for the per-card carousel pill row. Smaller than the
  // now-playing version to fit the narrow MiniBox width.
  miniInvArrow:         {
                          paddingHorizontal: 4, paddingVertical: 1,
                          alignItems: 'center', justifyContent: 'center',
                        },
  miniInvArrowDisabled: { opacity: 0.3 },
  miniInvArrowText:     { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, lineHeight: 14 },
  miniInvArrowTextDisabled: { color: COLORS.textFaint },
  descCard:       { marginHorizontal: SPACE.md, marginBottom: SPACE.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACE.md, borderWidth: 1, borderColor: COLORS.border },
  descTitle:      { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 3 },
  descTxt:        { fontSize: 12, color: COLORS.textMuted, lineHeight: 18 },
  empty:          { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACE.xxl },
  emptyTxt:       { fontSize: 13, color: COLORS.textFaint, textAlign: 'center', lineHeight: 20 },
  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard:      { backgroundColor: COLORS.bgElevated, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', paddingBottom: 30 },
  modalHdr:       { flexDirection: 'row', alignItems: 'center', padding: SPACE.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle:     { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.text },
  modalClose:     { fontSize: 14, color: COLORS.accent, fontWeight: '600', padding: 4 },
  modalSec:       { fontSize: 10, fontWeight: '500', color: COLORS.textMuted, letterSpacing: 0.7, textTransform: 'uppercase', paddingHorizontal: SPACE.lg, paddingTop: SPACE.lg, paddingBottom: SPACE.sm },
  modalItem:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: SPACE.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 10 },
  modalNum:       { fontSize: 14, fontWeight: '700', color: COLORS.accent, width: 32 },
  modalName:      { fontSize: 13, fontWeight: '600', color: COLORS.text, width: 120 },
  modalIntervals: { fontSize: 10, color: COLORS.textFaint, flex: 1 },
  modalNoteRow:        { flexDirection: 'row', paddingHorizontal: SPACE.lg, paddingVertical: SPACE.sm, gap: 6 },
  modalNotePill:       { paddingHorizontal: 11, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bg },
  modalNotePillActive: { backgroundColor: '#E8D44D', borderColor: '#C4A800' },
  modalNoteText:       { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  modalNoteTextActive: { color: '#5C4400' },
});
