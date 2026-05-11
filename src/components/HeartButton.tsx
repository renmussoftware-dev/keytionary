import React from 'react';
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { COLORS } from '../constants/theme';
import { useStore, type SavedItemInput } from '../store/useStore';

interface Props {
  item: SavedItemInput;
  size?: 'sm' | 'md';
  withLabel?: boolean;
}

export default function HeartButton({ item, size = 'md', withLabel = false }: Props) {
  const isFavorite = useStore(s => s.isFavorite(item));
  const toggleFavorite = useStore(s => s.toggleFavorite);

  const dim = size === 'sm' ? 16 : 22;
  const accent = '#E24B4A';
  const fill = isFavorite ? accent : 'none';
  const stroke = isFavorite ? accent : COLORS.textMuted;

  return (
    <TouchableOpacity
      onPress={() => toggleFavorite(item)}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[styles.btn, withLabel && styles.btnWithLabel]}
    >
      <Svg width={dim} height={dim} viewBox="0 0 24 24">
        <Path
          d="M12 21s-7-4.5-9.5-9C0.5 8 3 4 6.5 4c2 0 3.5 1 5.5 3 2-2 3.5-3 5.5-3C21 4 23.5 8 21.5 12c-2.5 4.5-9.5 9-9.5 9z"
          fill={fill}
          stroke={stroke}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      </Svg>
      {withLabel && (
        <Text style={[styles.label, { color: stroke }]}>
          {isFavorite ? 'Saved' : 'Save'}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { padding: 4, alignItems: 'center', justifyContent: 'center' },
  btnWithLabel: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  label: { fontSize: 12, fontWeight: '600' },
});
