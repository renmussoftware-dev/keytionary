import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACE } from '../../constants/theme';
import Exercises from './Exercises';
import Progress from './Progress';

// Exercises are the play-alongs; Progress is the streak and stats view.
type Tab = 'exercises' | 'progress';
const TABS: { tab: Tab; label: string }[] = [
  { tab: 'exercises', label: 'Exercises' },
  { tab: 'progress',  label: 'Progress' },
];

interface Props {
  // Scrolls the screen back to the top — the library is long enough that
  // opening an exercise from the bottom would otherwise land mid-page.
  onScrollTop?: () => void;
}

export default function Practice({ onScrollTop = () => {} }: Props) {
  const [tab, setTab] = useState<Tab>('exercises');

  const tabs = (
    <View style={styles.tabs}>
      {TABS.map(t => (
        <TouchableOpacity
          key={t.tab}
          onPress={() => setTab(t.tab)}
          activeOpacity={0.8}
          style={[styles.tab, tab === t.tab && styles.tabActive]}
        >
          <Text style={[styles.tabText, tab === t.tab && styles.tabTextActive]}>{t.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (tab === 'exercises') {
    return <Exercises tabs={tabs} onScrollTop={onScrollTop} />;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.tabsPad}>{tabs}</View>
      <Progress />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: SPACE.md },
  tabsPad: { paddingHorizontal: SPACE.lg },
  tabs: {
    flexDirection: 'row', padding: 3, marginBottom: SPACE.lg,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: RADIUS.full },
  tabActive: { backgroundColor: COLORS.accent },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: '#fff', fontWeight: '700' },
});
