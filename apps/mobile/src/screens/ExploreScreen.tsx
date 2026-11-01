import { Ionicons } from '@expo/vector-icons';
import {
  buildPlaceView,
  explorePins,
  filterExplorePlaces,
  firstName,
  formatNameList,
  friendLovedPlaces,
  isInTelAvivRegion,
  placeListMeta,
  sortExplorePlaces,
  type ExploreChip,
  type PlaceCategory,
} from '@love-it/shared';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapListToggle } from '../components/MapListToggle';
import { PlaceMap, type PlaceMapHandle } from '../components/PlaceMap';
import { PlaceRow } from '../components/PlaceRow';
import { Avatar, Chip, HeartButton, SearchField, Thumb, Wordmark } from '../components/ui';
import { track } from '../analytics';
import { brandHaptic, brandSpring, motionTokens } from '../motion';
import { useApp } from '../store';
import { colors, fonts, shadow } from '../theme';

const MAIN_CHIPS: Array<{ id: ExploreChip; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'friends', label: 'Friends' },
  { id: 'cafe', label: 'Coffee' },
  { id: 'restaurant', label: 'Restaurants' },
];

const MORE_CHIPS: Array<{ id: ExploreChip; label: string }> = [
  { id: 'bar', label: 'Bars' },
  { id: 'bakery', label: 'Bakeries' },
  { id: 'hotel', label: 'Hotels' },
  { id: 'attraction', label: 'Attractions' },
];

export function ExploreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, me, setLastTab, quickSave } = useApp();
  const [query, setQuery] = useState('');
  const [chip, setChip] = useState<ExploreChip>('friends');
  const [more, setMore] = useState(false);
  const [mode, setMode] = useState<'map' | 'list'>('map');
  const [selectedId, setSelectedId] = useState('place_lev_florentin');
  const [headerHeight, setHeaderHeight] = useState(0);
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<PlaceMapHandle>(null);
  const openedAt = useRef(Date.now());

  useFocusEffect(
    useCallback(() => {
      setLastTab('explore');
      let cancelled = false;
      void (async () => {
        try {
          const Location = await import('expo-location');
          const permission = await Location.getForegroundPermissionsAsync();
          if (!permission.granted || cancelled) return;
          const last = await Location.getLastKnownPositionAsync();
          const position = last ?? (await Location.getCurrentPositionAsync({}));
          if (!cancelled) {
            setOrigin({ lat: position.coords.latitude, lng: position.coords.longitude });
          }
        } catch {
          // No fix: the list stays most-loved, then newest.
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [setLastTab]),
  );

  const friendCount = friendLovedPlaces(data, me.id).length;
  const places = useMemo(
    () => sortExplorePlaces(data, filterExplorePlaces(data, me.id, chip, query), me.id, origin),
    [data, me.id, chip, query, origin],
  );
  const pins = useMemo(() => explorePins(data, me.id, places), [data, me.id, places]);
  const selected = places.find((place) => place.id === selectedId) ?? places[0];

  function openPlace(placeId: string, source: 'explore' | 'list') {
    track('place_viewed', { place_id: placeId, source });
    router.push(`/place/${placeId}?from=${source}`);
  }

  function onQuick(placeId: string, category: PlaceCategory) {
    const result = quickSave(placeId);
    if (result.saved && result.entry) {
      track('place_saved', {
        place_id: placeId,
        category,
        rating: result.entry.rating,
        visibility: result.entry.visibility,
        time_to_save_ms: Date.now() - openedAt.current,
        photo_count: 0,
        has_note: false,
      });
    }
  }

  async function recenter() {
    try {
      const Location = await import('expo-location');
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        mapRef.current?.recenter();
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      const point = { lat: position.coords.latitude, lng: position.coords.longitude };
      setOrigin(point);
      mapRef.current?.recenter(isInTelAvivRegion(point) ? point : undefined);
    } catch {
      mapRef.current?.recenter();
    }
  }

  return (
    <View style={styles.screen}>
      {mode === 'map' ? (
        <PlaceMap
          ref={mapRef}
          pins={pins}
          selectedId={selected?.id}
          onSelect={(placeId) => {
            brandHaptic('pinSelect');
            setSelectedId(placeId);
            const place = places.find((item) => item.id === placeId);
            if (place) mapRef.current?.recenter({ lat: place.lat, lng: place.lng });
          }}
        />
      ) : (
        <FlatList
          data={places}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingTop: headerHeight + 12, paddingHorizontal: 16, paddingBottom: 24 }}
          ListEmptyComponent={<Text style={styles.empty}>No places match that.</Text>}
          renderItem={({ item }) => {
            const view = buildPlaceView(data, item.id, me.id);
            const friend = view?.friendLovers[0];
            return (
              <PlaceRow
                place={item}
                cover={view?.heroPhotos[0]}
                photoCount={view?.friendPhotos.length ?? 0}
                rating={friend?.entry.rating ?? view?.viewerEntry?.rating}
                author={friend ? firstName(friend.profile.displayName) : undefined}
                tag={friend?.entry.tags[0] ?? view?.viewerEntry?.tags[0]}
                saved={Boolean(view?.viewerEntry)}
                onPress={() => openPlace(item.id, 'list')}
                onHeart={() => onQuick(item.id, item.category)}
              />
            );
          }}
        />
      )}

      <View
        style={[styles.header, { paddingTop: insets.top + 6 }]}
        pointerEvents="box-none"
        onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}
      >
        <View style={styles.titleRow}>
          <Wordmark />
          <Pressable onPress={() => router.navigate('/me')} accessibilityLabel="My page">
            <Avatar initials={me.initials} color={me.avatarColor} size={40} />
          </Pressable>
        </View>
        <SearchField value={query} onChangeText={setQuery} placeholder="Search places" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {MAIN_CHIPS.map((item) => (
            <Chip
              key={item.id}
              label={item.label}
              active={chip === item.id}
              badge={item.id === 'friends' ? friendCount : undefined}
              onPress={() => setChip(item.id)}
            />
          ))}
          <Pressable style={styles.filter} onPress={() => setMore((value) => !value)}>
            <Ionicons name="options-outline" size={18} color={colors.ink} />
          </Pressable>
        </ScrollView>
        {more ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {MORE_CHIPS.map((item) => (
              <Chip key={item.id} label={item.label} active={chip === item.id} onPress={() => setChip(item.id)} />
            ))}
          </ScrollView>
        ) : null}
        <View style={styles.toggleRow}>
          <MapListToggle mode={mode} onChange={setMode} />
          {mode === 'map' ? (
            <Pressable style={styles.locate} onPress={() => void recenter()} accessibilityLabel="Recenter map">
              <Ionicons name="locate" size={18} color={colors.ink} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {mode === 'map' && headerHeight > 0 ? (
        <View style={[styles.mapChrome, { top: headerHeight }]} pointerEvents="box-none">
          {selected ? (
            <PreviewCard
              placeId={selected.id}
              onOpen={() => openPlace(selected.id, 'explore')}
              onHeart={() => onQuick(selected.id, selected.category)}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function PreviewCard({
  placeId,
  onOpen,
  onHeart,
}: {
  placeId: string;
  onOpen: () => void;
  onHeart: () => void;
}) {
  const { data, me } = useApp();
  const view = buildPlaceView(data, placeId, me.id);
  if (!view) return null;
  const friends = view.friendLovers;
  const quote = view.notes.find((note) => note.entry.note)?.entry.note;
  const reduced = Boolean(useReducedMotion());
  const { height } = useWindowDimensions();
  const drag = useSharedValue(reduced ? 0 : 80);
  useEffect(() => {
    const timer = setTimeout(() => {
      drag.value = brandSpring('smooth', 0, reduced);
    }, reduced ? 0 : motionTokens.cardDelayAfterPin);
    return () => clearTimeout(timer);
  }, [drag, reduced]);
  const pan = Gesture.Pan()
    .activeOffsetY([-18, 18])
    .onUpdate((event) => {
      drag.value = event.translationY < 0 ? event.translationY : event.translationY * 0.35;
    })
    .onEnd((event) => {
      const commit =
        event.translationY < -height * motionTokens.thresholds.cardCommitRatio ||
        event.velocityY < motionTokens.thresholds.cardCommitVelocity;
      if (commit && event.translationY < 0) {
        runOnJS(brandHaptic)('detailOpen');
        runOnJS(onOpen)();
      }
      drag.value = brandSpring('smooth', 0, reduced, event.velocityY);
    });
  const rise = useAnimatedStyle(() => ({ transform: [{ translateY: reduced ? Math.min(drag.value, 8) : drag.value }] }));
  return (
    <GestureDetector gesture={pan}>
    <Animated.View style={rise}>
    <Pressable style={styles.card} onPress={onOpen}>
      <Thumb uri={view.heroPhotos[0]} size={96} sharedTag={`place-${placeId}-photo`} />
      <View style={{ flex: 1 }}>
        <Text style={styles.overline} numberOfLines={1}>
          {placeListMeta(view.place).toUpperCase()}
        </Text>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {view.place.name}
        </Text>
        <Text style={styles.cardMeta} numberOfLines={1}>
          {view.place.subtitle || view.place.neighborhood}
          {view.place.neighborhood ? ` · ${view.place.neighborhood}` : ''}
        </Text>
        {quote ? (
          <Text style={styles.quote} numberOfLines={2}>
            “{quote}”
          </Text>
        ) : null}
        {friends.length > 0 ? (
          <Text style={styles.friendNames} numberOfLines={1}>
            {formatNameList(friends.map((friend) => friend.profile))} love it
          </Text>
        ) : null}
      </View>
      <HeartButton filled={Boolean(view.viewerEntry)} onPress={onHeart} size={36} />
    </Pressable>
    </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  header: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16, paddingBottom: 10, gap: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chips: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingRight: 4 },
  toggleRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8 },
  filter: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
  },
  mapChrome: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, justifyContent: 'flex-end' },
  locate: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.linen,
    borderRadius: 20,
    padding: 12,
    marginBottom: 8,
    ...shadow.card,
  },
  overline: { fontFamily: fonts.sansSemibold, fontSize: 11, letterSpacing: 1.1, color: colors.stone },
  cardTitle: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 26, color: colors.ink, marginTop: 2 },
  cardMeta: { fontFamily: fonts.sans, color: colors.stone, marginTop: 2, fontSize: 13 },
  quote: { fontFamily: fonts.serifItalic, color: colors.ink, marginTop: 6, fontSize: 14, lineHeight: 18 },
  friendNames: { fontFamily: fonts.sansMedium, color: colors.clay, marginTop: 6, fontSize: 12 },
  empty: { color: colors.muted, padding: 24 },
});
