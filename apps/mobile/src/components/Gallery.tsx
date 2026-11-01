import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
} from 'react-native-reanimated';
import { brandHaptic } from '../motion';
import { colors } from '../theme';

const AnimatedImage = Animated.createAnimatedComponent(Image);

export function Gallery({
  photos,
  height = 390,
  placeId,
  onDismiss,
}: {
  photos: string[];
  height?: number;
  placeId?: string;
  onDismiss?: () => void;
}) {
  const { width } = useWindowDimensions();
  const reduced = Boolean(useReducedMotion());
  const scrollX = useSharedValue(0);
  const [index, setIndex] = useState(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
      const page = event.contentOffset.x / width;
      const next = Math.round(page);
      if (Math.abs(page - next) < 0.08) runOnJS(setIndex)(Math.min(photos.length - 1, Math.max(0, next)));
      if (event.contentOffset.y > 80) runOnJS(dismiss)();
    },
  });
  function dismiss() {
    onDismiss?.();
  }
  function edgeHaptic() {
    brandHaptic('toggle');
  }
  if (photos.length === 0) {
    return <View style={[styles.fallback, { height: height * 0.72 }]} />;
  }
  return (
    <View>
      <Animated.ScrollView
        horizontal
        pagingEnabled
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onScrollEndDrag={(event) => {
          const x = event.nativeEvent.contentOffset.x;
          if (x <= 0 || x >= width * (photos.length - 1)) edgeHaptic();
        }}
      >
        {photos.map((uri, photoIndex) => (
          <PhotoPage
            key={`${uri}-${photoIndex}`}
            uri={uri}
            index={photoIndex}
            width={width}
            height={height}
            scrollX={scrollX}
            reduced={reduced}
            shared={photoIndex === 0 ? placeId : undefined}
          />
        ))}
      </Animated.ScrollView>
      <View style={styles.counter}>
        <Ionicons name="camera-outline" size={14} color={colors.paper} />
        <Text style={styles.counterText}>
          {index + 1} / {photos.length}
        </Text>
      </View>
      <View style={styles.dots}>
        {photos.slice(0, 10).map((uri, dot) => (
          <Dot key={`${uri}-${dot}`} index={dot} scrollX={scrollX} width={width} />
        ))}
      </View>
    </View>
  );
}

function PhotoPage({
  uri,
  index,
  width,
  height,
  scrollX,
  reduced,
  shared,
}: {
  uri: string;
  index: number;
  width: number;
  height: number;
  scrollX: { value: number };
  reduced: boolean;
  shared?: string;
}) {
  const style = useAnimatedStyle(() => {
    const offset = scrollX.value - index * width;
    return { transform: [{ translateX: reduced ? 0 : offset * -0.15 }] };
  });
  return (
    <View style={{ width, height, overflow: 'hidden' }}>
      <AnimatedImage
        source={{ uri }}
        style={[{ width, height }, style]}
        contentFit="cover"
        sharedTransitionTag={shared ? `place-${shared}-photo` : undefined}
      />
    </View>
  );
}

function Dot({ index, scrollX, width }: { index: number; scrollX: { value: number }; width: number }) {
  const style = useAnimatedStyle(() => {
    const progress = interpolate(scrollX.value / width, [index - 1, index, index + 1], [0, 1, 0], Extrapolation.CLAMP);
    return { width: 5 + progress * 11, opacity: 0.55 + progress * 0.45 };
  });
  return <Animated.View style={[styles.dot, style]} />;
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: colors.hairline,
  },
  counter: {
    position: 'absolute',
    right: 16,
    bottom: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(28,25,23,0.72)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  counterText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  dots: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.7)' },
  dotOn: { width: 16, backgroundColor: colors.white },
});
