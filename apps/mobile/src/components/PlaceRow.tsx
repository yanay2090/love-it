import { placeListMeta, ratingLabel, type Place, type Rating } from '@love-it/shared';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import { HeartButton, Thumb } from './ui';

export function PlaceRow({
  place,
  cover,
  photoCount = 0,
  rating,
  author,
  tag,
  saved,
  onPress,
  onHeart,
}: {
  place: Place;
  cover?: string;
  photoCount?: number;
  rating?: Rating;
  author?: string;
  tag?: string;
  saved: boolean;
  onPress: () => void;
  onHeart: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View>
        <Thumb uri={cover} />
        {photoCount > 0 ? (
          <View style={styles.count}>
            <Text style={styles.countText}>{photoCount}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.body}>
        <Text style={styles.name}>{place.name}</Text>
        <Text style={styles.meta}>{placeListMeta(place)}</Text>
        {rating ? (
          <Text style={styles.rating}>
            {author ? `${author} ` : ''}
            {rating}/5
            {author ? '' : ` · ${ratingLabel(rating)}`}
          </Text>
        ) : null}
        {tag ? (
          <View style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ) : null}
      </View>
      <HeartButton filled={saved} onPress={onHeart} size={42} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  body: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '800', color: colors.ink },
  meta: { color: colors.muted, fontSize: 13 },
  rating: { color: colors.coral, fontWeight: '800', fontSize: 13, marginTop: 2 },
  tag: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: '#F6EFE8',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: { fontSize: 12, color: '#6D645C', fontWeight: '700' },
  count: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    backgroundColor: colors.ink,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  countText: { color: colors.white, fontSize: 10, fontWeight: '800' },
});
