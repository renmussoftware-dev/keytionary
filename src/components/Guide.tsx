import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { COLORS, RADIUS, SPACE } from '../constants/theme';
import { useProGate } from '../hooks/useProGate';

interface FeatureRow {
  name: string;
  desc: string;
  badge?: 'free' | 'pro' | 'mixed';
}

interface Section {
  title: string;
  intro?: string;
  features: FeatureRow[];
  navTo?: string;
  navLabel?: string;
}

const SECTIONS: Section[] = [
  {
    title: 'Keyboard',
    intro: 'The interactive piano — switch between scales, chords and custom modes. Color-coded by interval (root / 3rd / 5th / extension).',
    navTo: '/',
    navLabel: 'Open Keyboard',
    features: [
      { name: 'Scales mode',  desc: '14 scales — Major, all 7 modes, pentatonics, blues, harmonic/melodic minor, whole-tone, diminished.', badge: 'mixed' },
      { name: 'Chords mode',  desc: 'Light up any of 35 chord types across the keys.', badge: 'mixed' },
      { name: 'Custom mode',  desc: 'Tap notes to highlight any combination on the keyboard.', badge: 'pro' },
      { name: 'Note labels',  desc: 'Toggle between note name, scale degree, interval, or no label.', badge: 'free' },
    ],
  },
  {
    title: 'Chord Library',
    intro: 'Browse every chord type with a piano diagram and pedagogical resolution suggestions.',
    navTo: '/chords',
    navLabel: 'Open Chord Library',
    features: [
      { name: 'Chord diagrams',         desc: 'Two-octave piano view with chord notes color-coded by interval.', badge: 'mixed' },
      { name: 'Resolution suggestions', desc: 'Each chord shows where it commonly resolves to with the voice-leading reason.', badge: 'free' },
      { name: 'Tap to hear',            desc: 'Tap any chord to play it back with real piano audio.', badge: 'free' },
    ],
  },
  {
    title: 'Progressions',
    intro: 'Learn and play 22 common chord progressions across genres, build diatonic sequences, or write your own.',
    navTo: '/progressions',
    navLabel: 'Open Progressions',
    features: [
      { name: 'Common progressions', desc: '22 famous progressions across pop, rock, jazz, blues, folk and more.', badge: 'mixed' },
      { name: 'Diatonic builder',    desc: 'Pick any key and see all 7 diatonic chords.', badge: 'free' },
      { name: 'Custom builder',      desc: 'Stack your own chord sequence.', badge: 'free' },
      { name: 'Audio playback',      desc: 'Play progressions back at any BPM with real piano audio.', badge: 'pro' },
    ],
  },
  {
    title: 'Metronome',
    intro: 'Practice in time with a drift-corrected metronome on the Tools tab.',
    features: [
      { name: 'Metronome', desc: 'BPM 40–240, six time signatures, accent + offbeat clicks, tap-tempo.', badge: 'pro' },
    ],
  },
  {
    title: 'Saved',
    intro: 'Tap the heart on any chord, scale or progression to save it. Recents are auto-tracked. Access via the ♥ button on every tab.',
    features: [
      { name: 'Favorites', desc: 'Pin combos you keep coming back to.', badge: 'free' },
      { name: 'Recents',   desc: 'Last 20 chords / scales / progressions you selected.', badge: 'free' },
    ],
  },
];

function Badge({ kind }: { kind: 'free' | 'pro' | 'mixed' }) {
  if (kind === 'free') {
    return <View style={[styles.badge, styles.badgeFree]}><Text style={styles.badgeFreeText}>FREE</Text></View>;
  }
  if (kind === 'pro') {
    return <View style={[styles.badge, styles.badgePro]}><Text style={styles.badgeProText}>🔒 PRO</Text></View>;
  }
  return <View style={[styles.badge, styles.badgeMixed]}><Text style={styles.badgeMixedText}>FREE + PRO</Text></View>;
}

export default function Guide() {
  const { isPro } = useProGate();

  return (
    <View style={styles.wrap}>
      <View style={styles.intro}>
        <Text style={styles.welcome}>Welcome to Keytionary</Text>
        <Text style={styles.welcomeSub}>
          The piano dictionary. Every scale, chord, and progression — visualized on the keys.
        </Text>
        {!isPro && (
          <View style={styles.proHint}>
            <Text style={styles.proHintText}>
              You{'’'}re on the <Text style={{ fontWeight: '700' }}>Free</Text> plan. Items marked
              {' '}<Text style={{ color: '#E8D44D', fontWeight: '700' }}>🔒 PRO</Text>{' '}
              unlock with a subscription.
            </Text>
            <TouchableOpacity onPress={() => router.push('/paywall')} activeOpacity={0.85} style={styles.proCta}>
              <Text style={styles.proCtaText}>Unlock Pro →</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {SECTIONS.map(section => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.intro && <Text style={styles.sectionIntro}>{section.intro}</Text>}

          {section.features.map(f => (
            <View key={f.name} style={styles.row}>
              <View style={styles.rowHeader}>
                <Text style={styles.rowName}>{f.name}</Text>
                {f.badge && <Badge kind={f.badge} />}
              </View>
              <Text style={styles.rowDesc}>{f.desc}</Text>
            </View>
          ))}

          {section.navTo && (
            <TouchableOpacity
              onPress={() => router.push(section.navTo as any)}
              activeOpacity={0.7}
              style={styles.navBtn}
            >
              <Text style={styles.navBtnText}>{section.navLabel} →</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: SPACE.lg, paddingTop: SPACE.md, paddingBottom: SPACE.xl },

  intro: { marginBottom: SPACE.xl },
  welcome: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  welcomeSub: { fontSize: 14, color: COLORS.textMuted, lineHeight: 21 },

  proHint: {
    marginTop: SPACE.md,
    padding: SPACE.md,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(83,74,183,0.10)',
    borderWidth: 1, borderColor: 'rgba(83,74,183,0.3)',
  },
  proHintText: { fontSize: 13, color: COLORS.text, lineHeight: 19, marginBottom: 8 },
  proCta: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent,
  },
  proCtaText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  section: {
    marginBottom: SPACE.xl,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACE.lg,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  sectionIntro: { fontSize: 13, color: COLORS.textMuted, lineHeight: 19, marginBottom: SPACE.md },

  row: {
    paddingVertical: SPACE.sm,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  rowName: { fontSize: 13, fontWeight: '600', color: COLORS.text, flexShrink: 1 },
  rowDesc: { fontSize: 12, color: COLORS.textMuted, lineHeight: 17 },

  badge: {
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: RADIUS.sm,
    marginLeft: 'auto',
  },
  badgeFree: { backgroundColor: 'rgba(29,158,117,0.18)', borderWidth: 1, borderColor: '#1D9E75' },
  badgeFreeText: { fontSize: 9, fontWeight: '800', color: '#1D9E75', letterSpacing: 0.4 },
  badgePro: { backgroundColor: 'rgba(232,212,77,0.15)', borderWidth: 1, borderColor: '#C4A800' },
  badgeProText: { fontSize: 9, fontWeight: '800', color: '#E8D44D', letterSpacing: 0.4 },
  badgeMixed: { backgroundColor: 'rgba(110,96,217,0.18)', borderWidth: 1, borderColor: '#6E60D9' },
  badgeMixedText: { fontSize: 9, fontWeight: '800', color: '#837AB7', letterSpacing: 0.4 },

  navBtn: {
    marginTop: SPACE.md,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.accent,
    backgroundColor: COLORS.accentLight,
    alignItems: 'center',
  },
  navBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.accent },
});
