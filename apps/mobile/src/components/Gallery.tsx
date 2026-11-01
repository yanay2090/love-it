import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { colors } from '../theme';

export function Gallery({ photos, height = 390 }: { photos: string[]; height?: number }) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  if (photos.length === 0) {
    return <View style={[styles.fallback, { height: height * 0.72 }]} />;
  }
  return (
    <View>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={(event) => {
          const next = Math.round(event.nativeEvent.contentOffset.x / width);
          setIndex(Math.min(photos.length - 1, Math.max(0, next)));
        }}
        scrollEventThrottle={16}
      >
        {photos.map((uri, photoIndex) => (
          <Image key={`${uri}-${photoIndex}`} source={{ uri }} style={{ width, height }} contentFit="cover" />
        ))}
      </ScrollView>
      <View style={styles.counter}>
        <Ionicons name="camera-outline" size={14} color={colors.white} />
        <Text style={styles.counterText}>
          {index + 1} / {photos.length}
        </Text>
      </View>
      <View style={styles.dots}>
        {photos.slice(0, 8).map((uri, dot) => (
          <View key={`${uri}-${dot}`} style={[styles.dot, dot === index && styles.dotOn]} />
        ))}
      </View>
    </View>
  );
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
