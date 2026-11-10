import { Ionicons } from '@expo/vector-icons';
import {
  buildPlaceView,
  categoryLabel,
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
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Alert, FlatList, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fabListPadding, MapActions } from '../components/MapActions';
import { MapListToggle } from '../components/MapListToggle';
import { PlaceMap, type PlaceMapHandle } from '../components/PlaceMap';
import { PlaceRow } from '../components/PlaceRow';
import { Avatar, Chip, HeartButton, SearchField, Thumb, Wordmark } from '../components/ui';
import { track } from '../analytics';
import { brandHaptic, brandSpring, motionTokens } from '../motion';
import { useAccountGate } from '../auth/useAccountGate';
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
  const { data, me, quickSave } = useApp();
  const requireAccount = useAccountGate();
  const [query, setQuery] = useState('');
  const [chip, setChip] = useState<ExploreChip>('friends');
  const [more, setMore] = useState(false);
  const [mode, setMode] = useState<'map' | 'list'>('map');
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [cardHeight, setCardHeight] = useState(0);
  const [searchFocused, setSearchFocused] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<PlaceMapHandle>(null);
  const searchRef = useRef<ComponentRef<typeof TextInput>>(null);
  const openedAt = useRef(Date.now());
  const pinTapAt = useRef(0);
  const dismissSearch = useCallback(() => {
    searchRef.current?.blur();
    Keyboard.dismiss();
  }, []);

  useFocusEffect(
    useCallback(() => {
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
    }, []),
  );

  const friendCount = friendLovedPlaces(data, me.id).length;
  const places = useMemo(
    () => sortExplorePlaces(data, filterExplorePlaces(data, me.id, chip, query), me.id, origin),
    [data, me.id, chip, query, origin],
  );
  const pins = useMemo(() => explorePins(data, me.id, places), [data, me.id, places]);
  const selected = places.find((place) => place.id === selectedId);

  function openPlace(placeId: string, source: 'explore' | 'list') {
    track('place_viewed', { place_id: placeId, source });
    router.push(`/place/${placeId}?from=${source}`);
  }

  async function onQuick(placeId: string, category: PlaceCategory) {
    if (!requireAccount()) return;
    let result: Awaited<ReturnType<typeof quickSave>>;
    try {
      result = await quickSave(placeId);
    } catch (error) {
      Alert.alert('Could not save', error instanceof Error ? error.message : 'Try again.');
      return;
    }
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
          legalBottomInset={insets.bottom}
          selectedId={selected?.id}
          onInteract={() => {
            dismissSearch();
            if (Date.now() - pinTapAt.current < 350) return;
            setSelectedId(undefined);
          }}
          onSelect={(placeId) => {
            pinTapAt.current = Date.now();
            dismissSearch();
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
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{
            paddingTop: headerHeight + 12,
            paddingHorizontal: 16,
            paddingBottom: fabListPadding(insets.bottom),
          }}
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
                onPress={() => {
                  dismissSearch();
                  openPlace(item.id, 'list');
                }}
                onHeart={() => onQuick(item.id, item.category)}
              />
            );
          }}
        />
      )}

      <LinearGradient
        colors={['rgba(247,243,236,0.50)', 'rgba(247,243,236,0)']}
        style={styles.scrim}
        pointerEvents="none"
      />
      <View
        style={[styles.header, { paddingTop: insets.top + 8 }]}
        pointerEvents="box-none"
        onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}
      >
        <View style={styles.titleRow}>
          <Text style={styles.wordmark} accessibilityElementsHidden>
            <Wordmark size={24} markScale={0.56} />
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open My page, ${me.displayName}`}
            onPress={() => router.push('/me')}
            style={styles.avatarHit}
          >
            <View style={styles.avatarRing}>
              <Avatar initials={me.initials} color={me.avatarColor} size={36} imageUri={me.avatarUrl} />
            </View>
          </Pressable>
        </View>
        <SearchField
          ref={searchRef}
          value={query}
          onChangeText={setQuery}
          placeholder="Search places"
          accessibilityLabel="Search places"
          appearance="field"
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {MAIN_CHIPS.map((item) => (
            <Chip
              key={item.id}
              label={item.label}
              active={chip === item.id}
              badge={item.id === 'friends' ? friendCount : undefined}
              onPress={() => {
                dismissSearch();
                setChip(item.id);
              }}
            />
          ))}
          <Pressable
            style={styles.filter}
            onPress={() => {
              dismissSearch();
              setMore((value) => !value);
            }}
          >
            <Ionicons name="options-outline" size={18} color={colors.ink} />
          </Pressable>
        </ScrollView>
        {more ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {MORE_CHIPS.map((item) => (
              <Chip
                key={item.id}
                label={item.label}
                active={chip === item.id}
                onPress={() => {
                  dismissSearch();
                  setChip(item.id);
                }}
              />
            ))}
          </ScrollView>
        ) : null}
        <View style={styles.toggleRow}>
          <MapListToggle mode={mode} onChange={setMode} />
        </View>
      </View>

      {mode === 'map' && selected ? (
        <View
          style={[styles.cardSlot, { bottom: insets.bottom + 8 }]}
          onLayout={(event) => setCardHeight(event.nativeEvent.layout.height)}
        >
          <PreviewCard
            placeId={selected.id}
            onOpen={() => openPlace(selected.id, 'explore')}
            onHeart={() => onQuick(selected.id, selected.category)}
            onDismiss={() => setSelectedId(undefined)}
          />
        </View>
      ) : null}

      <MapActions
        bottomInset={insets.bottom}
        cardHeight={cardHeight}
        cardVisible={mode === 'map' && Boolean(selected)}
        showRecenter={mode === 'map'}
        hidden={searchFocused}
        onAdd={() => router.push('/add')}
        onRecenter={() => void recenter()}
      />
    </View>
  );
}

function PreviewCard({
  placeId,
  onOpen,
  onHeart,
  onDismiss,
}: {
  placeId: string;
  onOpen: () => void;
  onHeart: () => void;
  onDismiss: () => void;
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
      if (event.translationY > 72 || event.velocityY > 700) {
        runOnJS(onDismiss)();
        return;
      }
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
    <Pressable
      style={styles.card}
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`${view.place.name}, ${categoryLabel(view.place.category)}, ${view.place.neighborhood}`}
    >
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
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, height: 100, zIndex: 1 },
  header: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2, paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  titleRow: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wordmark: {
    textShadowColor: 'rgba(247,243,236,0.95)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  avatarHit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  avatarRing: {
    borderWidth: 1.5,
    borderColor: colors.linen,
    borderRadius: 18,
    ...shadow.soft,
  },
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
  cardSlot: { position: 'absolute', left: 12, right: 12, zIndex: 3 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.linen,
    borderRadius: 20,
    padding: 12,
    ...shadow.card,
  },
  overline: { fontFamily: fonts.sansSemibold, fontSize: 11, letterSpacing: 1.1, color: colors.stone },
  cardTitle: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 26, color: colors.ink, marginTop: 2 },
  cardMeta: { fontFamily: fonts.sans, color: colors.stone, marginTop: 2, fontSize: 13 },
  quote: { fontFamily: fonts.serifItalic, color: colors.ink, marginTop: 6, fontSize: 14, lineHeight: 18 },
  friendNames: { fontFamily: fonts.sansMedium, color: colors.clay, marginTop: 6, fontSize: 12 },
  empty: { color: colors.muted, padding: 24 },
});
