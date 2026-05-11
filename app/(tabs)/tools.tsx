import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { COLORS, FONT_FAMILY, RADIUS, SPACE } from '../../src/constants/theme';
import Metronome from '../../src/components/Metronome';
import Guide from '../../src/components/Guide';
import { useProGate } from '../../src/hooks/useProGate';

type ToolMode = 'guide' | 'metronome';

const TOOLS: { mode: ToolMode; label: string; sub: string }[] = [
  { mode: 'guide',     label: 'Guide',     sub: 'Features & what\u2019s free' },
  { mode: 'metronome', label: 'Metronome', sub: 'BPM & time sig' },
];

function ProUpsell() {
  return (
    <View style={styles.upsell}>
      <Text style={styles.upsellLock}>🔒</Text>
      <Text style={styles.upsellTitle}>Metronome is Pro</Text>
      <Text style={styles.upsellDesc}>
        Practice in time with a built-in metronome. BPM, time signature, accent beat, and tap-tempo.
      </Text>
      <TouchableOpacity
        style={styles.upsellBtn}
        onPress={() => router.push('/paywall')}
        activeOpacity={0.85}
      >
        <Text style={styles.upsellBtnText}>Unlock Pro →</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ToolsScreen() {
  const { isPro } = useProGate();
  const [mode, setMode] = useState<ToolMode>('guide');

  let body: React.ReactNode;
  if (mode === 'guide')           body = <Guide />;
  else if (!isPro)                body = <ProUpsell />;
  else                            body = <Metronome />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Workshop</Text>
          <Text style={styles.title}>Tools</Text>
        </View>
        <View style={styles.tabs}>
          {TOOLS.map(t => (
            <TouchableOpacity
              key={t.mode}
              onPress={() => setMode(t.mode)}
              activeOpacity={0.7}
              style={[styles.tab, mode === t.mode && styles.tabActive]}
            >
              <Text style={[styles.tabText, mode === t.mode && styles.tabTextActive]}>
                {t.label}
              </Text>
              <Text style={[styles.tabSub, mode === t.mode && styles.tabSubActive]}>
                {t.sub}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        {body}
        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    paddingTop: SPACE.md, paddingBottom: SPACE.md, paddingHorizontal: SPACE.lg,
    gap: SPACE.md,
  },
  eyebrow: {
    fontSize: 11, fontWeight: '500',
    color: COLORS.textMuted, letterSpacing: 0.4,
    marginBottom: 1,
  },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text, letterSpacing: -0.4 },

  tabs: {
    flexDirection: 'row', gap: 4,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md, padding: 3,
    borderWidth: 1, borderColor: COLORS.border,
  },
  tab: {
    flex: 1, paddingVertical: 8, paddingHorizontal: 6,
    alignItems: 'center', borderRadius: 7,
  },
  tabActive: { backgroundColor: COLORS.surfaceActive },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted, letterSpacing: 0.1 },
  tabTextActive: { color: COLORS.text },
  tabSub: { fontSize: 9, color: COLORS.textFaint, marginTop: 2 },
  tabSubActive: { color: COLORS.textMuted },

  body: { paddingTop: SPACE.lg },

  upsell: {
    margin: SPACE.lg, padding: SPACE.xl, alignItems: 'center',
    borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  upsellLock: { fontSize: 36, marginBottom: SPACE.md },
  upsellTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: SPACE.sm },
  upsellDesc: {
    fontSize: 14, color: COLORS.textMuted, lineHeight: 20,
    textAlign: 'center', marginBottom: SPACE.lg,
  },
  upsellBtn: {
    paddingHorizontal: 24, paddingVertical: 11, borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent,
  },
  upsellBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
