import React, { useState } from 'react';
import {
  View, Text, Modal, ScrollView, TouchableOpacity, Pressable, StyleSheet, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { COLORS, RADIUS, SPACE } from '../constants/theme';
import { NOTES } from '../constants/music';
import { useStore, type SavedItem } from '../store/useStore';

interface Props {
  visible: boolean;
  onClose: () => void;
}

type Tab = 'favorites' | 'recents';

const KIND_LABEL: Record<SavedItem['kind'], string> = {
  scale: 'SCALE',
  chord: 'CHORD',
  progression: 'PROG',
};

const KIND_COLOR: Record<SavedItem['kind'], string> = {
  scale: '#378ADD',
  chord: '#1D9E75',
  progression: '#BA7517',
};

function itemTitle(it: SavedItem): string {
  const root = NOTES[it.root];
  if (it.kind === 'scale')       return `${root} ${it.scaleKey}`;
  if (it.kind === 'chord')       return `${root} ${it.chordKey}`;
  return `${it.progName} · in ${root}`;
}

export default function SavedSheet({ visible, onClose }: Props) {
  const favorites = useStore(s => s.favorites);
  const recents = useStore(s => s.recents);
  const toggleFavorite = useStore(s => s.toggleFavorite);
  const clearRecents = useStore(s => s.clearRecents);
  const setRoot = useStore(s => s.setRoot);
  const setScaleKey = useStore(s => s.setScaleKey);
  const setMode = useStore(s => s.setMode);
  const setPendingNav = useStore(s => s.setPendingNav);
  const [tab, setTab] = useState<Tab>('favorites');

  const items = tab === 'favorites' ? favorites : recents;

  function handleTap(it: SavedItem) {
    onClose();
    setRoot(it.root);
    if (it.kind === 'scale') {
      setScaleKey(it.scaleKey);
      setMode('scales');
      router.push('/');
    } else if (it.kind === 'chord') {
      setPendingNav(it);
      router.push('/chords');
    } else {
      setPendingNav(it);
      router.push('/progressions');
    }
  }

  function handleClearRecents() {
    Alert.alert('Clear recents?', 'Your saved favorites won\u2019t be affected.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clearRecents },
    ]);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Saved</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.close}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tabs}>
            {(['favorites', 'recents'] as Tab[]).map(t => (
              <TouchableOpacity
                key={t}
                onPress={() => setTab(t)}
                activeOpacity={0.7}
                style={[styles.tab, tab === t && styles.tabActive]}
              >
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                  {t === 'favorites' ? `Favorites (${favorites.length})` : `Recents (${recents.length})`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {tab === 'recents' && recents.length > 0 && (
            <TouchableOpacity onPress={handleClearRecents} activeOpacity={0.7} style={styles.clearBtn}>
              <Text style={styles.clearText}>Clear recents</Text>
            </TouchableOpacity>
          )}

          <ScrollView showsVerticalScrollIndicator={false} style={styles.list}>
            {items.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>
                  {tab === 'favorites' ? 'No favorites yet' : 'No recents yet'}
                </Text>
                <Text style={styles.emptyDesc}>
                  {tab === 'favorites'
                    ? 'Tap the heart on any chord, scale, or progression to save it for later.'
                    : 'Chords, scales, and progressions you select will appear here.'}
                </Text>
              </View>
            ) : (
              items.map(it => (
                <TouchableOpacity
                  key={`${it.kind}-${it.root}-${'scaleKey' in it ? it.scaleKey : 'chordKey' in it ? it.chordKey : it.progName}`}
                  onPress={() => handleTap(it)}
                  activeOpacity={0.7}
                  style={styles.row}
                >
                  <View style={[styles.kindBadge, { backgroundColor: KIND_COLOR[it.kind] }]}>
                    <Text style={styles.kindText}>{KIND_LABEL[it.kind]}</Text>
                  </View>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {itemTitle(it)}
                  </Text>
                  {tab === 'favorites' && (
                    <TouchableOpacity
                      onPress={() => toggleFavorite(it)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={styles.removeBtn}>×</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              ))
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.bgElevated,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '85%', paddingBottom: 30,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACE.lg, paddingTop: SPACE.lg, paddingBottom: SPACE.sm,
  },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.text },
  close: { fontSize: 14, color: COLORS.accent, fontWeight: '600', padding: 4 },

  tabs: {
    flexDirection: 'row',
    marginHorizontal: SPACE.lg, marginBottom: SPACE.sm,
    backgroundColor: COLORS.bg, borderRadius: RADIUS.md, padding: 3,
    borderWidth: 1, borderColor: COLORS.border,
  },
  tab: { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: RADIUS.sm },
  tabActive: { backgroundColor: COLORS.surfaceHigh },
  tabText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: COLORS.text },

  clearBtn: { paddingHorizontal: SPACE.lg, paddingTop: 4, paddingBottom: 6, alignSelf: 'flex-end' },
  clearText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },

  list: { },
  empty: { paddingHorizontal: SPACE.xl, paddingVertical: SPACE.xxl, alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  emptyDesc: {
    fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 19,
  },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: SPACE.lg, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  kindBadge: {
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: RADIUS.sm,
    minWidth: 50, alignItems: 'center',
  },
  kindText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.6 },
  itemTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.text },
  removeBtn: { fontSize: 22, color: COLORS.textMuted, paddingHorizontal: 6, lineHeight: 24 },
});
