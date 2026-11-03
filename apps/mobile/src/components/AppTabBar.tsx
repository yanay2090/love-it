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

const TAB_PAD_TOP = 2;
const TAB_ROW = 48;

/** Height of the bar including the home-indicator inset, so maps can run underneath it. */
export function tabBarOffset(bottomInset: number): number {
  return TAB_PAD_TOP + TAB_ROW + (bottomInset > 0 ? bottomInset : 6);
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
    <View style={[styles.wrap, { paddingBottom: insets.bottom > 0 ? insets.bottom : 6 }]}>
      <View style={styles.row}>
        <Tab icon="compass" label="Explore" active={active === 'explore'} onPress={onExplore} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add a place"
          hitSlop={6}
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
            <Ionicons name="add" size={26} color={colors.paper} />
          </Animated.View>
        </Pressable>
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
      hitSlop={4}
    >
      <Ionicons name={name} size={22} color={color} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    backgroundColor: colors.white,
    paddingTop: TAB_PAD_TOP,
  },
  plus: {
    marginTop: -8,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
  },
  row: {
    height: TAB_ROW,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 12,
  },
  tab: { alignItems: 'center', justifyContent: 'center', gap: 1, minWidth: 72, minHeight: 44, flex: 1 },
  label: { fontFamily: fonts.sansSemibold, fontSize: 11 },
});
