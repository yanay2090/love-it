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
  type ExploreChip,
  type PlaceCategory,
} from '@love-it/shared';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapListToggle } from '../components/MapListToggle';
import { PlaceMap, type PlaceMapHandle } from '../components/PlaceMap';
import { PlaceRow } from '../components/PlaceRow';
import { Avatar, Chip, HeartButton, SearchField, Thumb, Wordmark } from '../components/ui';
import { track } from '../analytics';
import { useApp } from '../store';
import { colors, shadow } from '../theme';

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
  const mapRef = useRef<PlaceMapHandle>(null);
  const openedAt = useRef(Date.now());

  useFocusEffect(
    useCallback(() => {
      setLastTab('explore');
    }, [setLastTab]),
  );

  const friendCount = friendLovedPlaces(data, me.id).length;
  const places = useMemo(() => filterExplorePlaces(data, me.id, chip, query), [data, me.id, chip, query]);
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
      mapRef.current?.recenter(isInTelAvivRegion(point) ? point : undefined);
    } catch {
      mapRef.current?.recenter();
    }
  }

  return (
    <View style={styles.screen}>
      {mode === 'map' ? (
        <PlaceMap ref={mapRef} pins={pins} selectedId={selected?.id} onSelect={setSelectedId} />
      ) : (
        <FlatList
          data={places}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingTop: insets.top + 168, paddingHorizontal: 16, paddingBottom: 24 }}
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

      <View style={[styles.header, { paddingTop: insets.top + 6 }]} pointerEvents="box-none">
        <View style={styles.titleRow}>
          <Wordmark />
          <Pressable onPress={() => router.navigate('/me')} accessibilityLabel="My page">
            <Avatar initials={me.initials} color={me.avatarColor} size={40} />
          </Pressable>
        </View>
        <SearchField value={query} onChangeText={setQuery} placeholder="Search places" />
        <View style={styles.chips}>
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
        </View>
        {more ? (
          <View style={styles.chips}>
            {MORE_CHIPS.map((item) => (
              <Chip key={item.id} label={item.label} active={chip === item.id} onPress={() => setChip(item.id)} />
            ))}
          </View>
        ) : null}
      </View>

      {mode === 'map' ? (
        <View style={styles.mapChrome} pointerEvents="box-none">
          <View style={styles.controls}>
            <MapListToggle mode={mode} onChange={setMode} />
            <Pressable style={styles.locate} onPress={() => void recenter()} accessibilityLabel="Recenter map">
              <Ionicons name="locate" size={18} color={colors.ink} />
            </Pressable>
          </View>
          <View style={{ flex: 1 }} />
          {selected ? (
            <PreviewCard
              placeId={selected.id}
              onOpen={() => openPlace(selected.id, 'explore')}
              onHeart={() => onQuick(selected.id, selected.category)}
            />
          ) : null}
        </View>
      ) : (
        <View style={[styles.listToggle, { top: insets.top + 150 }]}>
          <MapListToggle mode={mode} onChange={setMode} />
        </View>
      )}
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
  return (
    <Pressable style={styles.card} onPress={onOpen}>
      <Thumb uri={view.heroPhotos[0]} size={62} />
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{view.place.name}</Text>
        <Text style={styles.cardMeta} numberOfLines={1}>
          {placeListMeta(view.place)}
          {view.place.localName ? ` · ${view.place.localName}` : ''}
        </Text>
        {friends.length > 0 ? (
          <View style={styles.friendLine}>
            <View style={styles.stack}>
              {friends.slice(0, 3).map((friend, index) => (
                <View key={friend.profile.id} style={{ marginLeft: index === 0 ? 0 : -8 }}>
                  <Avatar initials={friend.profile.initials} color={friend.profile.avatarColor} size={20} />
                </View>
              ))}
            </View>
            <Text style={styles.friendNames} numberOfLines={1}>
              {formatNameList(friends.map((friend) => friend.profile))}
            </Text>
          </View>
        ) : null}
      </View>
      <HeartButton filled={Boolean(view.viewerEntry)} onPress={onHeart} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  header: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16, gap: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  filter: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
  },
  mapChrome: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, padding: 16, paddingTop: 210 },
  controls: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8 },
  locate: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
  },
  listToggle: { position: 'absolute', right: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 12,
    marginBottom: 8,
    ...shadow.card,
  },
  cardTitle: { fontSize: 17, fontWeight: '800', color: colors.ink },
  cardMeta: { color: colors.muted, marginTop: 2 },
  friendLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  stack: { flexDirection: 'row' },
  friendNames: { color: colors.coral, fontWeight: '700', flex: 1 },
  empty: { color: colors.muted, padding: 24 },
});
