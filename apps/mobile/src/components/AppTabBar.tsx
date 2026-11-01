import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { brandHaptic, brandSpring } from '../motion';
import { useApp } from '../store';
import { colors, fonts, shadow } from '../theme';

export function StackTabs() {
  const router = useRouter();
  const { lastTab } = useApp();
  return (
    <AppTabBar
      active={lastTab}
      onExplore={() => router.navigate('/')}
      onMe={() => router.navigate('/me')}
      onAdd={() => router.push('/add')}
    />
  );
}

export function AppTabBar({
  active,
  onExplore,
  onMe,
  onAdd,
}: {
  active: 'explore' | 'me';
  onExplore: () => void;
  onMe: () => void;
  onAdd: () => void;
}) {
  const insets = useSafeAreaInsets();
  const reduced = Boolean(useReducedMotion());
  const plus = useSharedValue(1);
  const plusStyle = useAnimatedStyle(() => ({ transform: [{ scale: plus.value }] }));
  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.plusRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add a place"
          onPressIn={() => {
            plus.value = brandSpring('snappy', 0.92, reduced);
          }}
          onPressOut={() => {
            plus.value = brandSpring('snappy', 1, reduced);
          }}
          onPress={() => {
            brandHaptic('addOpen');
            onAdd();
          }}
        >
          <Animated.View style={[styles.plus, plusStyle]}>
            <Ionicons name="add" size={34} color={colors.paper} />
          </Animated.View>
        </Pressable>
      </View>
      <View style={styles.row}>
        <Tab icon="compass" label="Explore" active={active === 'explore'} onPress={onExplore} />
        <View style={{ width: 76 }} />
        <Tab icon="person" label="My page" active={active === 'me'} onPress={onMe} />
      </View>
    </View>
  );
}

function Tab({
  icon,
  label,
  active,
  onPress,
}: {
  icon: 'compass' | 'person';
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const color = active ? colors.ink : colors.stone;
  const name = active ? icon : (`${icon}-outline` as const);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        brandHaptic('tab');
        onPress();
      }}
      style={styles.tab}
    >
      <Ionicons name={name} size={22} color={color} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.white,
    paddingTop: 8,
  },
  plusRow: { alignItems: 'center', height: 28 },
  plus: {
    marginTop: -22,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
    shadowColor: colors.ink,
    shadowOpacity: 0.2,
  },
  row: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end' },
  tab: { alignItems: 'center', gap: 2, minWidth: 72, paddingBottom: 2 },
  label: { fontFamily: fonts.sansSemibold, fontSize: 11 },
});
