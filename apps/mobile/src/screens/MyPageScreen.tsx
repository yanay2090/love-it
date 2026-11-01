import { Ionicons } from '@expo/vector-icons';
import {
  diaryPins,
  entriesForProfile,
  followerCount,
  followingCount,
  photosForEntry,
  placeById,
  type ExploreChip,
} from '@love-it/shared';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapListToggle } from '../components/MapListToggle';
import { PlaceMap } from '../components/PlaceMap';
import { PlaceRow } from '../components/PlaceRow';
import { Avatar, Chip, PrimaryButton, SecondaryButton } from '../components/ui';
import { track } from '../analytics';
import { useApp } from '../store';
import { colors } from '../theme';

const CHIPS: Array<{ id: ExploreChip; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'cafe', label: 'Coffee' },
  { id: 'restaurant', label: 'Restaurants' },
  { id: 'bar', label: 'Bars' },
];

export function MyPageScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, me, setLastTab, quickSave, resetDemo } = useApp();
  const [mode, setMode] = useState<'map' | 'list'>('map');
  const [chip, setChip] = useState<ExploreChip>('all');
  const [publicOnly, setPublicOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [menu, setMenu] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setLastTab('me');
    }, [setLastTab]),
  );

  const entries = useMemo(() => {
    return entriesForProfile(data, me.id, me.id).filter((entry) => {
      if (publicOnly && entry.visibility !== 'public') return false;
      const place = placeById(data, entry.placeId);
      if (!place) return false;
      if (chip !== 'all' && chip !== 'friends' && place.category !== chip) return false;
      return true;
    });
  }, [data, me.id, chip, publicOnly]);

  const pins = useMemo(() => {
    const allowed = new Set(entries.map((entry) => entry.placeId));
    return diaryPins(data, me.id).filter((pin) => allowed.has(pin.placeId));
  }, [data, me.id, entries]);

  async function sharePage() {
    const url = `${(process.env.EXPO_PUBLIC_WEB_URL || 'http://localhost:3000').replace(/\/$/, '')}/${me.handle}`;
    track('profile_shared', { handle: me.handle, surface: 'my_page' });
    await Share.share({ message: `My favorite places in Tel Aviv — ${url}`, url });
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.top}>
        <Text style={styles.handle}>@{me.handle}</Text>
        <View style={styles.topActions}>
          <Pressable onPress={() => void sharePage()} accessibilityLabel="Share my page">
            <Ionicons name="share-outline" size={22} color={colors.ink} />
          </Pressable>
          <Pressable onPress={() => setMenu(true)} accessibilityLabel="More">
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.ink} />
          </Pressable>
        </View>
      </View>

      <View style={styles.identity}>
        <Avatar initials={me.initials} color={me.avatarColor} size={84} ring />
        <View style={styles.stats}>
          <Stat value={String(entriesForProfile(data, me.id, me.id).length)} label="Loved" />
          <Stat value={String(followerCount(data, me.id))} label="Followers" />
          <Stat value={String(followingCount(data, me.id))} label="Following" />
        </View>
      </View>

      <Pressable style={styles.find} onPress={() => router.push('/find-friends')}>
        <Ionicons name="search" size={14} color={colors.coral} />
        <Text style={styles.findText}>Find friends</Text>
      </Pressable>

      <Text style={styles.name}>{me.displayName}</Text>
      <Text style={styles.bio}>{me.bio}</Text>

      <View style={styles.actions}>
        <PrimaryButton label="Share my page" icon="share-outline" onPress={() => void sharePage()} />
        <SecondaryButton label="Edit page" onPress={() => router.push('/edit-profile')} />
      </View>

      <Text style={styles.placesTitle}>My places {entries.length}</Text>
      <View style={styles.chips}>
        {CHIPS.map((item) => (
          <Chip key={item.id} label={item.label} active={chip === item.id} onPress={() => setChip(item.id)} />
        ))}
      </View>
      <View style={styles.toggleRow}>
        <MapListToggle mode={mode} onChange={setMode} />
      </View>

      <View style={styles.mapWrap}>
        {mode === 'map' ? (
          <>
            <PlaceMap
              pins={pins}
              selectedId={selectedId}
              onSelect={(placeId) => {
                setSelectedId(placeId);
                track('place_viewed', { place_id: placeId, source: 'profile' });
                router.push(`/place/${placeId}?from=profile`);
              }}
            />
            <Pressable style={styles.publicPill} onPress={() => setPublicOnly((value) => !value)}>
              <Ionicons name="globe-outline" size={14} color={colors.ink} />
              <Text style={styles.publicText}>{publicOnly ? 'Public only' : 'Public page'}</Text>
            </Pressable>
          </>
        ) : (
          <FlatList
            data={entries}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
            renderItem={({ item }) => {
              const place = placeById(data, item.placeId);
              if (!place) return null;
              const photos = photosForEntry(data, item.id);
              return (
                <PlaceRow
                  place={place}
                  cover={photos[0]?.uri ?? place.covers[0]}
                  photoCount={photos.length}
                  rating={item.rating}
                  tag={item.tags[0]}
                  saved
                  onPress={() => {
                    track('place_viewed', { place_id: place.id, source: 'profile' });
                    router.push(`/place/${place.id}?from=profile`);
                  }}
                  onHeart={() => quickSave(place.id)}
                />
              );
            }}
          />
        )}
      </View>

      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMenu(false)}>
          <Pressable style={styles.sheet}>
            <Text style={styles.sheetTitle}>Your page</Text>
            <Pressable
              style={styles.sheetRow}
              onPress={() => {
                setMenu(false);
                router.push('/import');
              }}
            >
              <Text style={styles.sheetText}>Import from Google Maps</Text>
            </Pressable>
            <Pressable
              style={styles.sheetRow}
              onPress={() => {
                setMenu(false);
                resetDemo();
              }}
            >
              <Text style={styles.sheetText}>Reset demo data</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream, paddingHorizontal: 16 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  handle: { fontSize: 20, fontWeight: '800', color: colors.ink },
  topActions: { flexDirection: 'row', gap: 16 },
  identity: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  stats: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.ink },
  statLabel: { color: colors.muted, fontSize: 13 },
  find: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.coral,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 8,
  },
  findText: { color: colors.coral, fontWeight: '800' },
  name: { fontSize: 26, fontWeight: '800', marginTop: 14, letterSpacing: -0.4 },
  bio: { color: colors.muted, marginTop: 4, fontSize: 15 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  placesTitle: { fontSize: 20, fontWeight: '800', marginTop: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  toggleRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, marginBottom: 10 },
  mapWrap: { flex: 1, marginHorizontal: -16, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  publicPill: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  publicText: { fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(28,25,23,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.cream, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 4 },
  sheetTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  sheetRow: { paddingVertical: 14 },
  sheetText: { fontSize: 16, fontWeight: '700' },
});
