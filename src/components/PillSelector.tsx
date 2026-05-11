import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { COLORS, FONT_FAMILY, RADIUS, SPACE } from '../constants/theme';

interface Option {
  label: string;
  value: string;
  color?: string;
  dotColor?: string;
}

interface Props {
  options: Option[];
  value: string | null;
  onChange: (v: string | null) => void;
  allowDeselect?: boolean;
  label?: string;
}

export default function PillSelector({ options, value, onChange, allowDeselect = true, label }: Props) {
  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}>
        {options.map(opt => {
          const active = opt.value === value;
          // Active accent — when a position dot color is provided we tint the
          // ring with it; otherwise we fall back to the brand indigo accent.
          const ringColor = opt.color || COLORS.accent;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => onChange(allowDeselect && active ? null : opt.value)}
              style={[
                styles.pill,
                active && { backgroundColor: COLORS.surfaceActive, borderColor: ringColor },
              ]}
              activeOpacity={0.7}
            >
              {opt.dotColor && (
                <View style={[styles.dot, { backgroundColor: opt.dotColor }]} />
              )}
              <Text style={[styles.text, active && styles.textActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textFaint,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: SPACE.sm,
    paddingHorizontal: SPACE.lg,
    fontFamily: FONT_FAMILY.mono,
  },
  row: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: SPACE.lg,
    paddingBottom: 2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: COLORS.surface,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textMuted,
    letterSpacing: 0.1,
  },
  textActive: {
    color: COLORS.text,
    fontWeight: '600',
  },
});
