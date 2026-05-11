import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { COLORS, RADIUS } from '../constants/theme';

interface Props {
  size?: 'sm' | 'md';
  style?: any;
}

export function ProLockBadge({ size = 'sm', style }: Props) {
  return (
    <View style={[styles.badge, size === 'md' && styles.badgeMd, style]}>
      <Text style={[styles.lock, size === 'md' && styles.lockMd]}>🔒</Text>
    </View>
  );
}

/**
 * ProLockedRow — wraps a list item with a lock badge and paywall trigger.
 * Dims the content and shows a lock icon.
 */
interface RowProps {
  children: React.ReactNode;
  style?: any;
  onPress?: () => void;
}

export function ProLockedRow({ children, style, onPress }: RowProps) {
  return (
    <TouchableOpacity
      style={[styles.lockedRow, style]}
      onPress={() => router.push('/paywall')}
      activeOpacity={0.7}
    >
      <View style={styles.lockedContent} pointerEvents="none">
        {children}
      </View>
      <ProLockBadge size="sm" style={styles.rowBadge} />
    </TouchableOpacity>
  );
}

/**
 * ProBanner — shown at the top of a list when some items are locked.
 */
export function ProBanner() {
  return (
    <TouchableOpacity
      style={styles.banner}
      onPress={() => router.push('/paywall')}
      activeOpacity={0.85}
    >
      <Text style={styles.bannerText}>🔒 Unlock all features with Pro</Text>
      <Text style={styles.bannerCta}>Upgrade →</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 18, height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeMd: { width: 26, height: 26, borderRadius: 13 },
  lock:   { fontSize: 9 },
  lockMd: { fontSize: 13 },

  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    opacity: 0.45,
  },
  lockedContent: { flex: 1 },
  rowBadge: { marginRight: 12 },

  banner: {
    flexDirection: 'column',
    backgroundColor: 'rgba(83,74,183,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(83,74,183,0.3)',
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  bannerText: { fontSize: 13, color: COLORS.text, fontWeight: '500', marginBottom: 4 },
  bannerCta:  { fontSize: 13, color: '#837AB7', fontWeight: '700' },
});
