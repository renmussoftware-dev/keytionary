import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useStore } from '../store/useStore';
import { COLORS, RADIUS, SPACE } from '../constants/theme';
import { logProLockHit } from '../lib/analytics';

// Proactive Pro-prompt sheet. Renders whenever the store sets `proPrompt`,
// driven by recordVoicingPlay / recordFavoriteAdded. Sits at the app root
// so it overlays any tab. Uses the same paywall route as reactive lock-hits
// so the post-tap experience is identical — only the entry point differs.
export default function ProPromptSheet() {
  const proPrompt = useStore(s => s.proPrompt);
  const dismissProPrompt = useStore(s => s.dismissProPrompt);

  // Log on appearance — feeds the same Meta lock-hit funnel as reactive
  // triggers, tagged so you can A/B proactive (prompt:*) vs reactive
  // (voicing:*, etc.) conversion in Ads Manager.
  useEffect(() => {
    if (proPrompt) logProLockHit(`prompt:${proPrompt.source}`);
  }, [proPrompt]);

  if (!proPrompt) return null;

  function onUnlock() {
    dismissProPrompt();
    router.push('/paywall');
  }

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={dismissProPrompt}
    >
      <Pressable style={styles.backdrop} onPress={dismissProPrompt}>
        {/* Stop-propagation so taps on the sheet itself don't dismiss it. */}
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>{proPrompt.title}</Text>
          <Text style={styles.subtitle}>{proPrompt.subtitle}</Text>

          <TouchableOpacity onPress={onUnlock} style={styles.primaryBtn} activeOpacity={0.85}>
            <Text style={styles.primaryText}>Unlock Pro</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={dismissProPrompt} style={styles.secondaryBtn} activeOpacity={0.7}>
            <Text style={styles.secondaryText}>Maybe later</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.bgElevated,
    paddingHorizontal: SPACE.lg,
    paddingTop: 12,
    paddingBottom: SPACE.xxl + SPACE.md,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: COLORS.borderLight,
    alignSelf: 'center',
    marginBottom: SPACE.md,
  },
  title: {
    fontSize: 22, fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACE.sm,
  },
  subtitle: {
    fontSize: 14, color: COLORS.textMuted, lineHeight: 21,
    marginBottom: SPACE.xl,
  },
  primaryBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 100,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: SPACE.sm,
  },
  primaryText: { color: '#1a1400', fontWeight: '700', fontSize: 15 },
  secondaryBtn: { paddingVertical: 10, alignItems: 'center' },
  secondaryText: { color: COLORS.textMuted, fontSize: 13 },
});
