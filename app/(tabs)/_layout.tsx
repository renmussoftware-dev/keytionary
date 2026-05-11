import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../src/constants/theme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = 54 + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.bgElevated,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom: insets.bottom + 4,
          paddingTop: 6,
        },
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Keyboard',
          tabBarIcon: ({ color }) => <KeyboardIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="chords"
        options={{
          title: 'Chords',
          tabBarIcon: ({ color }) => <ChordIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="progressions"
        options={{
          title: 'Chords',
          tabBarIcon: ({ color }) => <ProgressionsIcon color={color} />,
          tabBarLabel: 'Progressions',
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          title: 'Tools',
          tabBarIcon: ({ color }) => <ToolsIcon color={color} />,
        }}
      />
    </Tabs>
  );
}

// Piano-keys silhouette: three white keys with two short black keys on top.
function KeyboardIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 22, height: 14, flexDirection: 'row', alignItems: 'flex-end', position: 'relative' }}>
      {[0, 1, 2].map(i => (
        <View key={i} style={{
          width: 7, height: 14, marginRight: i === 2 ? 0 : 0.5,
          borderWidth: 1, borderColor: color, borderRadius: 1,
        }} />
      ))}
      <View style={{
        position: 'absolute', top: 0, left: 4.5, width: 4, height: 9,
        backgroundColor: color, borderRadius: 1,
      }} />
      <View style={{
        position: 'absolute', top: 0, left: 12, width: 4, height: 9,
        backgroundColor: color, borderRadius: 1,
      }} />
    </View>
  );
}

function ChordIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 18, height: 18, position: 'relative' }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderWidth: 1.5, borderColor: color, borderRadius: 4 }} />
      <View style={{ position: 'absolute', top: 5, left: 4, width: 10, height: 1.5, backgroundColor: color }} />
      <View style={{ position: 'absolute', top: 10, left: 4, width: 10, height: 1.5, backgroundColor: color }} />
    </View>
  );
}

function ProgressionsIcon({ color }: { color: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 3, alignItems: 'flex-end' }}>
      {[8, 12, 10, 14].map((h, i) => (
        <View key={i} style={{ width: 4, height: h * 0.9, backgroundColor: color, borderRadius: 2 }} />
      ))}
    </View>
  );
}

function ToolsIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 16, height: 18, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        <View style={{ width: 2, height: 9, backgroundColor: color, borderRadius: 1 }} />
        <View style={{ width: 2, height: 9, backgroundColor: color, borderRadius: 1 }} />
      </View>
      <View style={{ width: 8, height: 2, backgroundColor: color, marginTop: -1, borderRadius: 1 }} />
      <View style={{ width: 2, height: 7, backgroundColor: color, borderRadius: 1 }} />
    </View>
  );
}

const styles = StyleSheet.create({});
