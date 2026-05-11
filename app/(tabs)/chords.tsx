import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Pressable, useWindowDimensions, PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PianoChordBox from '../../src/components/PianoChordBox';
import { COLORS, SPACE, RADIUS, FONT_FAMILY } from '../../src/constants/theme';
import {
  NOTES, NOTE_DISPLAY, CHORDS,
  intervalLongName, categoryLabel, intervalColorBucket,
  COLORS as MUSIC_COLORS,
} from '../../src/constants/music';
import { useStore } from '../../src/store/useStore';
import { useAudioEngine } from '../../src/hooks/useAudioEngine';
import { useProGate } from '../../src/hooks/useProGate';
import { ProBanner } from '../../src/components/ProLock';
import { isChordFree } from '../../src/constants/subscription';
import { getChordMidi, maxInversion, getInversionBass } from '../../src/utils/theory';
import { getResolutions } from '../../src/constants/resolutions';
import HeartButton from '../../src/components/HeartButton';
import SavedSheet from '../../src/components/SavedSheet';

const CATEGORIES = ['All', 'Triads', 'Seventh', 'Extended', 'Sus'];
const CAT_MAP: Record<string, string> = {
  'Triads': 'triad', 'Seventh': 'seventh', 'Extended': 'extended', 'Sus': 'sus',
};
const DRAWER_W = 220;

export default function ChordsScreen() {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const isTablet = screenW >= 768;
  const { root, setRoot } = useStore();
  const pendingNav = useStore(s => s.pendingNav);
  const setPendingNav = useStore(s => s.setPendingNav);
  const addRecent = useStore(s => s.addRecent);
  const { isPro, requirePro } = useProGate();
  const { playChord } = useAudioEngine();
  const [category, setCategory] = useState('All');
  const [selectedChord, setSelectedChord] = useState('Major');
  const [selectedInversion, setSelectedInversion] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);

  useEffect(() => {
    if (pendingNav?.kind === 'chord') {
      setSelectedChord(pendingNav.chordKey);
      setSelectedInversion(pendingNav.inversion ?? 0);
      setPendingNav(null);
    }
  }, [pendingNav, setPendingNav]);

  // Clamp inversion when chord changes — e.g. moving from a 7th chord (max
  // 3rd inv) back to a triad (max 2nd inv) needs to drop 3rd inv.
  useEffect(() => {
    const max = Math.min(maxInversion(selectedChord), 3);
    if (selectedInversion > max) setSelectedInversion(0);
  }, [selectedChord, selectedInversion]);

  const drawerAnim = useRef(new Animated.Value(0)).current;
  const scrimAnim = useRef(new Animated.Value(0)).current;

  const pillOffset = useRef(new Animated.Value(0)).current;
  const pillBase   = useRef(0);
  const dragStartY = useRef(0);
  const didDrag    = useRef(false);
  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: (_, gs) => {
      dragStartY.current = gs.y0;
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
      const raw = pillBase.current + gs.dy;
      const clamped = Math.max(0, Math.min(screenH * 0.82, raw));
      pillBase.current = clamped;
      Animated.spring(pillOffset, { toValue: clamped, useNativeDriver: true, bounciness: 0, speed: 20 }).start();
      if (!didDrag.current) toggleDrawer();
    },
  })).current;

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

  function toggleDrawer() { drawerOpen ? closeDrawer() : openDrawer(); }

  function changeCategory(cat: string) {
    const filtered = Object.entries(CHORDS).filter(([, ch]) =>
      cat === 'All' || ch.category === CAT_MAP[cat]
    );
    setCategory(cat);
    if (filtered.length > 0) setSelectedChord(filtered[0][0]);
    openDrawer();
  }

  function selectChord(key: string) {
    const apply = () => {
      setSelectedChord(key);
      const newInv = Math.min(selectedInversion, Math.min(maxInversion(key), 3));
      setSelectedInversion(newInv);
      addRecent({ kind: 'chord', root, chordKey: key, inversion: newInv });
      closeDrawer();
      playChord(getChordMidi(root, key, 4, newInv));
    };
    if (!isChordFree(key)) { requirePro(apply); return; }
    apply();
  }

  function resolveTo(offset: number, targetType: string) {
    const newRoot = (root + offset + 12) % 12;
    const apply = () => {
      setRoot(newRoot);
      setSelectedChord(targetType);
      // Resolutions cross chord boundaries — reset inversion to root position
      // so the new chord lands in its natural voicing.
      setSelectedInversion(0);
      addRecent({ kind: 'chord', root: newRoot, chordKey: targetType, inversion: 0 });
      playChord(getChordMidi(newRoot, targetType));
    };
    if (!isChordFree(targetType)) { requirePro(apply); return; }
    apply();
  }

  // Inversion-only changes don't add a recent — would spam the list as users
  // cycle through voicings. The next chord/root change captures whichever
  // inversion is current at that moment.
  function pickInversion(n: number) {
    setSelectedInversion(n);
    playChord(getChordMidi(root, selectedChord, 4, n));
  }

  const filteredChords = Object.entries(CHORDS).filter(([, ch]) =>
    category === 'All' || ch.category === CAT_MAP[category]
  );

  const drawerX = drawerAnim.interpolate({ inputRange: [0, 1], outputRange: [-DRAWER_W, 0] });
  const toggleX = drawerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, DRAWER_W] });

  const chord = CHORDS[selectedChord];
  const resolutions = getResolutions(selectedChord);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>Library</Text>
            <Text style={styles.title}>Chords</Text>
          </View>
          <TouchableOpacity onPress={() => setSavedOpen(true)} activeOpacity={0.7} style={styles.savedBtn}>
            <Text style={styles.savedBtnText}>♥ Saved</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.noteRow}>
          {NOTES.map((note, i) => (
            <TouchableOpacity key={note} onPress={() => {
                setRoot(i);
                addRecent({ kind: 'chord', root: i, chordKey: selectedChord, inversion: selectedInversion });
                playChord(getChordMidi(i, selectedChord, 4, selectedInversion));
              }}
              style={[styles.notePill, root === i && styles.notePillActive]} activeOpacity={0.7}>
              <Text style={[styles.noteText, root === i && styles.noteTextActive]}>{NOTE_DISPLAY[note] || note}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity key={cat} onPress={() => changeCategory(cat)}
              style={[styles.catPill, category === cat && styles.catPillActive]} activeOpacity={0.7}>
              <Text style={[styles.catText, category === cat && styles.catTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.body}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.detailContent}
        >
          <View style={styles.detailTitleRow}>
            <View style={{ flex: 1 }}>
              {chord && <Text style={styles.detailEyebrow}>{categoryLabel(chord.category)}</Text>}
              <Text style={[styles.detailTitle, isTablet && styles.detailTitleTablet]}>
                {NOTES[root]} {selectedChord}
                {selectedInversion > 0 && (
                  <Text style={styles.detailTitleSlash}>
                    {' '}/ {NOTES[getInversionBass(root, selectedChord, selectedInversion)]}
                  </Text>
                )}
              </Text>
            </View>
            <HeartButton item={{ kind: 'chord', root, chordKey: selectedChord, inversion: selectedInversion }} size="md" />
          </View>
          <Text style={styles.detailDesc}>{chord?.description}</Text>

          {/* Inversion selector — capped at min(chord size - 1, 3) since
              higher inversions get esoteric. */}
          {chord && chord.intervals.length >= 2 && (() => {
            const invMax = Math.min(maxInversion(selectedChord), 3);
            const labels = ['Root', '1st', '2nd', '3rd'];
            return (
              <View style={styles.inversionRow}>
                {Array.from({ length: invMax + 1 }, (_, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => pickInversion(i)}
                    activeOpacity={0.7}
                    style={[
                      styles.invPill,
                      selectedInversion === i && styles.invPillActive,
                    ]}
                  >
                    <Text style={[
                      styles.invPillText,
                      selectedInversion === i && styles.invPillTextActive,
                    ]}>
                      {labels[i]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            );
          })()}

          <View style={styles.diagramCard}>
            <PianoChordBox root={root} chordKey={selectedChord} inversion={selectedInversion} />
          </View>

          {chord && (
            <>
              <Text style={styles.sectionLabel}>Interval structure</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.ivCardRow}
              >
                {chord.intervalNames.map((name, i) => {
                  const bucket = intervalColorBucket(name);
                  const palette =
                    bucket === 'root' ? MUSIC_COLORS.root :
                    bucket === 'third' ? MUSIC_COLORS.third :
                    bucket === 'fifth' ? MUSIC_COLORS.fifth :
                    MUSIC_COLORS.extension;
                  return (
                    <View key={i} style={styles.ivCard}>
                      <View style={[styles.ivCircle, { backgroundColor: palette.fill, borderColor: palette.stroke }]}>
                        <Text style={[styles.ivCircleText, { color: palette.text }]}>{name}</Text>
                      </View>
                      <Text style={styles.ivSub}>{intervalLongName(name)}</Text>
                    </View>
                  );
                })}
              </ScrollView>
            </>
          )}

          {resolutions.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Often resolves to</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.resScrollContent}
              >
                {resolutions.map((r, i) => {
                  const targetRoot = (root + r.degreeOffset + 12) % 12;
                  const locked = !isPro && !isChordFree(r.targetType);
                  return (
                    <TouchableOpacity
                      key={i}
                      onPress={() => resolveTo(r.degreeOffset, r.targetType)}
                      activeOpacity={0.7}
                      style={[styles.resCard, locked && { opacity: 0.55 }]}
                    >
                      <View style={styles.resCardTop}>
                        <Text style={styles.resCardArrow}>→</Text>
                        <Text style={styles.resCardName} numberOfLines={1}>
                          {NOTES[targetRoot]} {r.targetType}
                        </Text>
                        {locked && <Text style={styles.resCardLock}>🔒</Text>}
                      </View>
                      <View style={styles.resCardBadge}>
                        <Text style={styles.resCardBadgeText}>{r.intervalLabel}</Text>
                      </View>
                      <Text style={styles.resCardWhy}>{r.why}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {drawerOpen && (
          <Animated.View style={[styles.scrim, { opacity: scrimAnim }]} pointerEvents="auto">
            <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />
          </Animated.View>
        )}

        <Animated.View style={[styles.drawer, { transform: [{ translateX: drawerX }] }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {!isPro && <ProBanner />}
            {filteredChords.map(([key, ch]) => {
              const locked = !isPro && !isChordFree(key);
              return (
                <TouchableOpacity key={key} onPress={() => selectChord(key)}
                  style={[styles.chordItem, selectedChord === key && styles.chordItemActive, locked && { opacity: 0.5 }]}
                  activeOpacity={0.7}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.chordName, selectedChord === key && styles.chordNameActive]} numberOfLines={1}>
                      {NOTES[root]} {key}
                    </Text>
                    <Text style={styles.chordIntervals} numberOfLines={1}>{ch.intervalNames.join(' · ')}</Text>
                  </View>
                  {locked && <Text style={{ fontSize: 12, marginRight: 4 }}>🔒</Text>}
                </TouchableOpacity>
              );
            })}
            <View style={{ height: 40 }} />
          </ScrollView>
        </Animated.View>

        <Animated.View
          style={[styles.toggleWrap, { transform: [{ translateX: toggleX }, { translateY: pillOffset }] }]}
          {...panResponder.panHandlers}
        >
          <View style={styles.togglePill}>
            <Text style={styles.toggleDots}>⋮</Text>
            <Text style={styles.toggleArrow}>{drawerOpen ? '‹' : '›'}</Text>
            <Text style={styles.toggleLabel}>LIST</Text>
          </View>
        </Animated.View>
      </View>

      <SavedSheet visible={savedOpen} onClose={() => setSavedOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: COLORS.bg },
  header:       {
                  backgroundColor: COLORS.surface,
                  borderBottomWidth: 1, borderBottomColor: COLORS.border,
                  paddingTop: SPACE.md, paddingBottom: SPACE.md,
                  gap: SPACE.sm,
                },
  titleRow:     {
                  flexDirection: 'row', alignItems: 'center',
                  paddingHorizontal: SPACE.lg,
                  gap: SPACE.sm,
                },
  eyebrow:      {
                  fontSize: 11, fontWeight: '500',
                  color: COLORS.textMuted, letterSpacing: 0.4,
                  marginBottom: 1,
                },
  title:        { fontSize: 24, fontWeight: '700', color: COLORS.text, letterSpacing: -0.4 },
  savedBtn:     {
                  paddingHorizontal: 12, paddingVertical: 6,
                  borderRadius: RADIUS.full,
                  borderWidth: 1, borderColor: COLORS.border,
                  backgroundColor: COLORS.surface,
                },
  savedBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },

  noteRow:      { flexDirection: 'row', paddingHorizontal: SPACE.lg, gap: 6 },
  notePill:     {
                  paddingHorizontal: 11, paddingVertical: 6,
                  borderRadius: RADIUS.full,
                  backgroundColor: COLORS.surface,
                  borderWidth: 1, borderColor: 'transparent',
                },
  notePillActive: { backgroundColor: COLORS.accentSoft, borderColor: COLORS.accent },
  noteText:     {
                  fontSize: 13, fontWeight: '500',
                  color: COLORS.textMuted,
                  fontFamily: FONT_FAMILY.mono,
                  letterSpacing: 0.2,
                },
  noteTextActive: { color: COLORS.text, fontWeight: '700' },

  catRow:       { flexDirection: 'row', paddingHorizontal: SPACE.lg, gap: 6 },
  catPill:      {
                  paddingHorizontal: 14, paddingVertical: 7,
                  borderRadius: RADIUS.full,
                  backgroundColor: COLORS.surface,
                  borderWidth: 1, borderColor: 'transparent',
                },
  catPillActive: { backgroundColor: COLORS.accentSoft, borderColor: COLORS.accent },
  catText:      { fontSize: 13, fontWeight: '500', color: COLORS.textMuted, letterSpacing: 0.1 },
  catTextActive: { color: COLORS.text, fontWeight: '600' },

  body:          { flex: 1, overflow: 'hidden' },
  detailContent: { paddingTop: SPACE.xl, paddingHorizontal: SPACE.lg, paddingBottom: SPACE.xl },

  detailTitleRow:    {
                       flexDirection: 'row',
                       alignItems: 'flex-start',
                       gap: SPACE.md,
                       marginBottom: 8,
                     },
  detailEyebrow:     {
                       fontSize: 11, fontWeight: '500',
                       color: COLORS.textMuted, letterSpacing: 0.4,
                       marginBottom: 4,
                     },
  detailTitle:       { fontSize: 36, fontWeight: '700', color: COLORS.text, letterSpacing: -1, lineHeight: 40 },
  detailTitleTablet: { fontSize: 52, lineHeight: 56 },
  // Slash-chord bass note rendered slightly muted so the main chord name
  // stays the primary reading cue — "C Major" big, " / E" softer.
  detailTitleSlash:  { color: COLORS.textMuted, fontWeight: '600' },
  detailDesc:        { fontSize: 14, color: COLORS.textMuted, lineHeight: 21, marginBottom: SPACE.xl },

  // Inversion pill row — sits between description and diagram so it reads as
  // "this chord at this voicing → what the diagram shows you".
  inversionRow:      {
                       flexDirection: 'row',
                       gap: 6,
                       marginBottom: SPACE.lg,
                     },
  invPill:           {
                       paddingHorizontal: 14, paddingVertical: 7,
                       borderRadius: RADIUS.full,
                       backgroundColor: COLORS.surface,
                       borderWidth: 1, borderColor: COLORS.border,
                     },
  invPillActive:     {
                       backgroundColor: COLORS.accentSoft,
                       borderColor: COLORS.accent,
                     },
  invPillText:       {
                       fontSize: 12, fontWeight: '600',
                       color: COLORS.textMuted,
                       fontFamily: FONT_FAMILY.mono,
                       letterSpacing: 0.4,
                     },
  invPillTextActive: { color: COLORS.text },

  diagramCard:       {
                       backgroundColor: COLORS.surface,
                       borderWidth: 1, borderColor: COLORS.border,
                       borderRadius: RADIUS.lg,
                       padding: SPACE.lg,
                       alignItems: 'center', justifyContent: 'center',
                       marginBottom: SPACE.xl,
                     },

  sectionLabel:      {
                       fontSize: 10, fontWeight: '600',
                       color: COLORS.textFaint, letterSpacing: 1.2,
                       textTransform: 'uppercase',
                       marginBottom: SPACE.sm,
                       fontFamily: FONT_FAMILY.mono,
                     },

  ivCardRow:         { gap: 8, paddingBottom: SPACE.xl },
  ivCard:            {
                       width: 96,
                       backgroundColor: COLORS.surface,
                       borderWidth: 1, borderColor: COLORS.border,
                       borderRadius: RADIUS.md,
                       paddingVertical: 12, paddingHorizontal: 8,
                       alignItems: 'center', gap: 8,
                     },
  ivCircle:          {
                       width: 30, height: 30, borderRadius: 15,
                       borderWidth: 1,
                       alignItems: 'center', justifyContent: 'center',
                     },
  ivCircleText:      { fontSize: 12, fontWeight: '700', fontFamily: FONT_FAMILY.mono },
  ivSub:             { fontSize: 11, fontWeight: '500', color: COLORS.textMuted, textAlign: 'center' },

  resScrollContent:  { gap: 10, paddingRight: 8, paddingBottom: SPACE.md },
  resCard:           {
                       width: 220,
                       padding: SPACE.md,
                       borderRadius: RADIUS.md,
                       borderWidth: 1, borderColor: COLORS.border,
                       backgroundColor: COLORS.surface,
                     },
  resCardTop:        { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  resCardArrow:      { fontSize: 16, color: COLORS.accent, fontWeight: '700', lineHeight: 18 },
  resCardName:       { fontSize: 15, fontWeight: '700', color: COLORS.text, flexShrink: 1 },
  resCardLock:       { fontSize: 11, marginLeft: 'auto' },
  resCardBadge:      {
                       alignSelf: 'flex-start',
                       paddingHorizontal: 8, paddingVertical: 3,
                       borderRadius: RADIUS.full,
                       backgroundColor: COLORS.accentSoft,
                       marginBottom: 8,
                     },
  resCardBadgeText:  {
                       fontSize: 10, fontWeight: '700',
                       color: COLORS.text, letterSpacing: 0.5,
                       fontFamily: FONT_FAMILY.mono,
                     },
  resCardWhy:        { fontSize: 11, color: COLORS.textMuted, lineHeight: 16 },

  scrim:        { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 10 },
  drawer:       { position: 'absolute', left: 0, top: 0, bottom: 0, width: DRAWER_W, backgroundColor: COLORS.bgElevated, borderRightWidth: 1, borderRightColor: COLORS.border, zIndex: 20 },
  chordItem:    { paddingVertical: 12, paddingHorizontal: SPACE.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  chordItemActive: { backgroundColor: COLORS.surfaceHigh },
  chordName:    { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 2 },
  chordNameActive: { color: COLORS.accent },
  chordIntervals: { fontSize: 11, color: COLORS.textMuted },

  toggleWrap:    { position: 'absolute', left: 0, top: '35%', zIndex: 30 },
  togglePill:    { backgroundColor: COLORS.surfaceHigh, borderTopRightRadius: 20, borderBottomRightRadius: 20,
                   borderWidth: 1, borderLeftWidth: 0, borderColor: COLORS.borderLight,
                   paddingVertical: 14, paddingLeft: 6, paddingRight: 10, alignItems: 'center', gap: 4 },
  toggleDots:    { fontSize: 13, color: COLORS.textFaint, lineHeight: 14, letterSpacing: -2 },
  toggleArrow:   { fontSize: 16, color: COLORS.text, fontWeight: '600', lineHeight: 18 },
  toggleLabel:   { fontSize: 9, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1.2 },
});
