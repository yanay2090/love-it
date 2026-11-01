import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import { brandHaptic, brandSpring } from '../motion';
import { colors, fonts, shadow } from '../theme';

export function MapListToggle({
  mode,
  onChange,
}: {
  mode: 'map' | 'list';
  onChange: (mode: 'map' | 'list') => void;
}) {
  const reduced = Boolean(useReducedMotion());
  const x = useSharedValue(mode === 'map' ? 0 : 1);
  useEffect(() => {
    x.value = brandSpring('snappy', mode === 'map' ? 0 : 1, reduced);
  }, [mode, reduced, x]);
  const thumb = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value * 78 }],
  }));
  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.thumb, thumb]} />
      <Side
        label="Map"
        icon="map"
        active={mode === 'map'}
        onPress={() => {
          brandHaptic('toggle');
          onChange('map');
        }}
      />
      <Side
        label="List"
        icon="list"
        active={mode === 'list'}
        onPress={() => {
          brandHaptic('toggle');
          onChange('list');
        }}
      />
    </View>
  );
}

function Side({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: 'map' | 'list';
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.side}>
      <Ionicons name={icon} size={14} color={active ? colors.paper : colors.ink} />
      <Text style={[styles.text, active && styles.textOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 164,
    flexDirection: 'row',
    backgroundColor: colors.linen,
    borderRadius: 18,
    padding: 4,
    ...shadow.soft,
  },
  thumb: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 78,
    height: 30,
    borderRadius: 14,
    backgroundColor: colors.ink,
  },
  side: {
    flex: 1,
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    zIndex: 1,
  },
  text: { fontFamily: fonts.sansSemibold, color: colors.ink, fontSize: 13 },
  textOn: { color: colors.paper },
});
