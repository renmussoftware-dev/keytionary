import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SPACE } from '../../src/constants/theme';
import ChordIdentifier from '../../src/components/ChordIdentifier';
import { useProGate } from '../../src/hooks/useProGate';

// Pro upsell shown when a non-Pro user lands on this tab. Fires the same
// requirePro flow used elsewhere so the paywall view is logged with a
// chord_identifier feature tag — you'll see conversion pull from this
// specific tab surface in Meta Events Manager / Ads Manager.
function ProUpsell({ onUnlock }: { onUnlock: () => void }) {
  return (
    <View style={styles.upsell}>
      <Text style={styles.upsellLock}>🔒</Text>
      <Text style={styles.upsellTitle}>Chord Identifier is Pro</Text>
      <Text style={styles.upsellDesc}>
        Tap any notes on the keyboard and Keytionary spells the chord back —
        including inversions and slash notation. Reverse lookup for the
        "what did I just play?" moment.
      </Text>
      <TouchableOpacity style={styles.upsellBtn} onPress={onUnlock} activeOpacity={0.85}>
        <Text style={styles.upsellBtnText}>Unlock Pro →</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function IdentifyScreen() {
  const { isPro, requirePro } = useProGate();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Reverse lookup</Text>
        <Text style={styles.title}>Identify</Text>
      </View>
      {isPro ? (
        <ChordIdentifier />
      ) : (
        <ScrollView contentContainerStyle={{ paddingTop: SPACE.lg }}>
          <ProUpsell onUnlock={() => requirePro(() => {}, 'chord_identifier')} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingHorizontal: SPACE.lg,
    paddingTop: SPACE.md,
    paddingBottom: SPACE.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  eyebrow: {
    fontSize: 11, fontWeight: '500',
    color: COLORS.textMuted, letterSpacing: 0.4,
    marginBottom: 1,
  },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text, letterSpacing: -0.4 },

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
