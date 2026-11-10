import { Ionicons } from '@expo/vector-icons';
import { type Href } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import { brandHaptic, brandSpring, brandTiming } from '../motion';
import { colors, shadow } from '../theme';

const FAB = 60;
const RECENTER = 44;
const GAP = 12;

/** List and My Page clearance so the last row sits above the FAB. */
export function fabListPadding(bottomInset: number): number {
  return bottomInset + 16 + FAB + 16;
}

/** Pushed viewing screens have no FAB. */
export function detailBottomPadding(bottomInset: number): number {
  return bottomInset + 16;
}

export function backToMap(router: { canGoBack: () => boolean; back: () => void; replace: (href: Href) => void }) {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/**
 * Bottom-right Add button, with Recenter stacked 12 pt above it on the map.
 * `cardHeight` lifts both so they sit 16 pt above the place card.
 */
export function MapActions({
  bottomInset,
  cardHeight = 0,
  cardVisible = false,
  showRecenter = false,
  hidden = false,
  onAdd,
  onRecenter,
}: {
  bottomInset: number;
  cardHeight?: number;
  cardVisible?: boolean;
  showRecenter?: boolean;
  hidden?: boolean;
  onAdd: () => void;
  onRecenter?: () => void;
}) {
  const reduced = Boolean(useReducedMotion());
  const bottom = useSharedValue(bottomInset + 16);
  const opacity = useSharedValue(hidden ? 0 : 1);
  const scale = useSharedValue(1);

  useEffect(() => {
    const rest = bottomInset + 16;
    const lifted = bottomInset + 8 + cardHeight + 16;
    const target = cardVisible && cardHeight > 0 ? lifted : rest;
    bottom.value = brandSpring('smooth', target, reduced);
  }, [bottom, bottomInset, cardHeight, cardVisible, reduced]);

  useEffect(() => {
    opacity.value = brandTiming(hidden ? 0 : 1, reduced, hidden ? 'out' : 'in');
  }, [hidden, opacity, reduced]);

  const stackStyle = useAnimatedStyle(() => ({
    bottom: bottom.value,
    opacity: opacity.value,
  }));
  const plusStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View pointerEvents={hidden ? 'none' : 'box-none'} style={[styles.stack, stackStyle]}>
      {showRecenter ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Recenter map on my location"
          onPress={onRecenter}
          style={styles.recenter}
        >
          <Ionicons name="locate" size={20} color={colors.ink} />
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add a place"
        onPressIn={() => {
          scale.value = brandSpring('snappy', 0.92, reduced);
        }}
        onPressOut={() => {
          scale.value = brandSpring('snappy', 1, reduced);
        }}
        onPress={() => {
          brandHaptic('addOpen');
          onAdd();
        }}
      >
        <Animated.View style={[styles.fab, plusStyle]}>
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <Path d="M12 4.5v15M4.5 12h15" stroke={colors.paper} strokeWidth={1.8} strokeLinecap="round" />
          </Svg>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stack: {
    position: 'absolute',
    right: 20,
    alignItems: 'flex-end',
    gap: GAP,
    zIndex: 20,
  },
  fab: {
    width: FAB,
    height: FAB,
    borderRadius: FAB / 2,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.fab,
  },
  recenter: {
    width: RECENTER,
    height: RECENTER,
    borderRadius: RECENTER / 2,
    backgroundColor: colors.linen,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
  },
});
