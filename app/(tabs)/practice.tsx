import React, { useCallback, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACE } from '../../src/constants/theme';
import Practice from '../../src/components/practice/Practice';

export default function PracticeScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const scrollTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Play along</Text>
        <Text style={styles.title}>Practice</Text>
      </View>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.body}
      >
        <Practice onScrollTop={scrollTop} />
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
  },
  eyebrow: {
    fontSize: 11, fontWeight: '500',
    color: COLORS.textMuted, letterSpacing: 0.4,
    marginBottom: 1,
  },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text, letterSpacing: -0.4 },
  body: { paddingBottom: 60 },
});
