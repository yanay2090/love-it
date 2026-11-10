import { Ionicons } from '@expo/vector-icons';
import {
  diaryPins,
  entriesForProfile,
  followerCount,
  followingCount,
  photosForEntry,
  placeById,
  profileUrl,
  type ExploreChip,
} from '@love-it/shared';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { backToMap, fabListPadding, MapActions } from '../components/MapActions';
import { MapListToggle } from '../components/MapListToggle';
import { PlaceMap } from '../components/PlaceMap';
import { PlaceRow } from '../components/PlaceRow';
import { Avatar, Chip, PrimaryButton, SecondaryButton } from '../components/ui';
import { track } from '../analytics';
import { sharePublicUrl } from '../share';
import { useAccountGate } from '../auth/useAccountGate';
import { useAuth } from '../auth/AuthProvider';
import { useApp } from '../store';
import { colors, fonts } from '../theme';

const CHIPS: Array<{ id: ExploreChip; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'cafe', label: 'Coffee' },
  { id: 'restaurant', label: 'Restaurants' },
  { id: 'bar', label: 'Bars' },
];

export function MyPageScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, me, quickSave, diaryError, reloadDiary } = useApp();
  const { session, profileError, signOut, deleteAccount, refreshProfile } = useAuth();
  const requireAccount = useAccountGate();
  const [mode, setMode] = useState<'map' | 'list'>('map');
  const [chip, setChip] = useState<ExploreChip>('all');
  const [publicOnly, setPublicOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [menu, setMenu] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (session) {
        void refreshProfile();
        void reloadDiary();
      }
    }, [refreshProfile, reloadDiary, session]),
  );

  const pageName = me.displayName;
  const pageHandle = me.handle;
  const pageAvatar = me.avatarUrl;

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
    const handle = pageHandle;
    if (!handle) return;
    const url = profileUrl(handle, process.env.EXPO_PUBLIC_WEB_URL);
    track('profile_shared', { handle, surface: 'my_page' });
    await sharePublicUrl(url);
  }

  return (
    <View style={styles.root}>
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.top}>
        <Pressable
          onPress={() => backToMap(router)}
          accessibilityRole="button"
          accessibilityLabel="Back to Map"
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
          <Text style={styles.backLabel}>Map</Text>
        </Pressable>
        <View style={styles.topActions}>
          <Pressable
            onPress={() => void sharePage()}
            accessibilityRole="button"
            accessibilityLabel="Share"
            style={styles.iconHit}
          >
            <Ionicons name="share-outline" size={20} color={colors.ink} />
          </Pressable>
          <Pressable onPress={() => setMenu(true)} accessibilityLabel="More" style={styles.iconHit}>
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.ink} />
          </Pressable>
        </View>
      </View>

      <View style={styles.identity}>
        <Avatar initials={me.initials} color={me.avatarColor} size={84} ring imageUri={pageAvatar} />
        <View style={styles.stats}>
          <Stat value={String(entriesForProfile(data, me.id, me.id).length)} label="Loved" />
          <Stat value={String(followerCount(data, me.id))} label="Followers" />
          <Stat value={String(followingCount(data, me.id))} label="Following" />
        </View>
      </View>

      <Text style={styles.handle}>@{pageHandle || '…'}</Text>
      <Pressable
        style={styles.find}
        accessibilityRole="button"
        accessibilityLabel="Find friends"
        onPress={() => router.push('/find-friends')}
      >
        <Text style={styles.findText}>Find friends</Text>
      </Pressable>
      {!session ? (
        <Pressable style={styles.signIn} onPress={() => router.push('/sign-in')}>
          <Text style={styles.signInText}>Sign in</Text>
        </Pressable>
      ) : null}

      <Text style={styles.name}>{pageName || ' '}</Text>
      <Text style={styles.bio}>{me.bio}</Text>
      {profileError || diaryError ? <Text style={styles.profileError}>{profileError || diaryError}</Text> : null}

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
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: fabListPadding(insets.bottom) }}
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
                  onHeart={() => {
                    if (!requireAccount()) return;
                    void quickSave(place.id).catch((error: unknown) => {
                      Alert.alert('Could not update that save', error instanceof Error ? error.message : 'Try again.');
                    });
                  }}
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
            {session ? (
              <>
                <Pressable
                  style={styles.sheetRow}
                  onPress={() => {
                    setMenu(false);
                    void signOut();
                  }}
                >
                  <Text style={styles.sheetText}>Sign out</Text>
                </Pressable>
                <Pressable
                  style={styles.sheetRow}
                  onPress={() => {
                    setMenu(false);
                    Alert.alert(
                      'Delete account',
                      'This removes your profile, saves, and sign-in from Love it. It cannot be undone.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete account',
                          style: 'destructive',
                          onPress: () => {
                            void deleteAccount().then((error) => {
                              if (error) Alert.alert('Could not delete the account', error);
                            });
                          },
                        },
                      ],
                    );
                  }}
                >
                  <Text style={styles.sheetText}>Delete account</Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                style={styles.sheetRow}
                onPress={() => {
                  setMenu(false);
                  router.push('/sign-in');
                }}
              >
                <Text style={styles.sheetText}>Sign in</Text>
              </Pressable>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
    <MapActions bottomInset={insets.bottom} onAdd={() => router.push('/add')} />
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
  root: { flex: 1, backgroundColor: colors.cream },
  screen: { flex: 1, backgroundColor: colors.cream, paddingHorizontal: 16 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 },
  back: { minHeight: 44, paddingRight: 8, flexDirection: 'row', alignItems: 'center' },
  backLabel: { fontFamily: fonts.sansSemibold, fontSize: 17, lineHeight: 22, color: colors.ink },
  iconHit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  handle: { fontSize: 20, fontWeight: '800', color: colors.ink },
  topActions: { flexDirection: 'row', alignItems: 'center' },
  identity: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  stats: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.ink },
  statLabel: { color: colors.muted, fontSize: 13 },
  find: {
    alignSelf: 'flex-start',
    height: 40,
    borderRadius: 999,
    backgroundColor: colors.ink,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  findText: { color: colors.paper, fontFamily: fonts.sansSemibold, fontSize: 15 },
  signIn: {
    alignSelf: 'center',
    marginTop: 10,
    backgroundColor: colors.ink,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  signInText: { color: colors.paper, fontWeight: '800' },
  name: { fontSize: 26, fontWeight: '800', marginTop: 14, letterSpacing: -0.4 },
  bio: { color: colors.muted, marginTop: 4, fontSize: 15 },
  profileError: { color: colors.tomato, marginTop: 8, fontWeight: '700' },
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
