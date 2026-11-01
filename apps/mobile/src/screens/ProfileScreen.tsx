import { Ionicons } from '@expo/vector-icons';
import {
  diaryPins,
  entriesForProfile,
  firstName,
  followerCount,
  followingCount,
  isBlocked,
  photosForEntry,
  placeById,
  profileByHandle,
  type PlaceCategory,
} from '@love-it/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, Modal, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackTabs } from '../components/AppTabBar';
import { MapListToggle } from '../components/MapListToggle';
import { PlaceMap } from '../components/PlaceMap';
import { PlaceRow } from '../components/PlaceRow';
import { Avatar, PrimaryButton, SecondaryButton } from '../components/ui';
import { track } from '../analytics';
import { useApp } from '../store';
import { colors } from '../theme';
import { REPORT_REASONS } from '@love-it/shared';

function one(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw ?? '';
}

export function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const handle = one(useLocalSearchParams<{ handle: string }>().handle);
  const { data, me, toggleFollow, quickSave, block, report } = useApp();
  const profile = profileByHandle(data, handle);
  const [mode, setMode] = useState<'map' | 'list'>('list');
  const [menu, setMenu] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');
  const [thanks, setThanks] = useState(false);
  const openedAt = useRef(Date.now());

  if (!profile) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 24, paddingHorizontal: 16 }]}>
        <Text style={styles.name}>No one uses that handle.</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.followLabel}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const blocked = isBlocked(data, me.id, profile.id);
  const following = data.follows.some((follow) => follow.followerId === me.id && follow.followingId === profile.id);
  const entries = entriesForProfile(data, profile.id, me.id);
  const pins = diaryPins(data, profile.id).filter((pin) => entries.some((entry) => entry.placeId === pin.placeId));
  const isMe = profile.id === me.id;

  function onFollow() {
    const nowFollowing = toggleFollow(profile!.id);
    if (nowFollowing) {
      track('user_followed', { target_user_id: profile!.id, target_handle: profile!.handle });
    }
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

  async function sharePage() {
    const url = `${(process.env.EXPO_PUBLIC_WEB_URL || 'http://localhost:3000').replace(/\/$/, '')}/${profile!.handle}`;
    track('profile_shared', { handle: profile!.handle, surface: 'other_page' });
    await Share.share({ message: `${profile!.displayName}’s places on Love it — ${url}`, url });
  }

  return (
    <View style={styles.screen}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16 }}>
        <View style={styles.top}>
          <Pressable onPress={() => router.back()} accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={26} color={colors.ink} />
          </Pressable>
          <Text style={styles.handle}>@{profile.handle}</Text>
          <Pressable onPress={() => setMenu(true)} accessibilityLabel="More">
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.ink} />
          </Pressable>
        </View>
        <View style={styles.identity}>
          <Avatar initials={profile.initials} color={profile.avatarColor} size={84} ring />
          <View style={styles.stats}>
            <Stat value={String(entries.length)} label="Loved" />
            <Stat value={String(followerCount(data, profile.id))} label="Followers" />
            <Stat value={String(followingCount(data, profile.id))} label="Following" />
          </View>
        </View>
        <Text style={styles.name}>{profile.displayName}</Text>
        <Text style={styles.bio}>{profile.bio}</Text>
        {blocked ? (
          <Text style={styles.blocked}>You blocked @{profile.handle}. Their places stay hidden.</Text>
        ) : (
          <View style={styles.actions}>
            {isMe ? (
              <PrimaryButton label="Edit page" onPress={() => router.push('/edit-profile')} />
            ) : (
              <Pressable style={[styles.follow, following && styles.following]} onPress={onFollow}>
                <Text style={[styles.followLabel, following && styles.followingLabel]}>
                  {following ? 'Following' : '+ Follow'}
                </Text>
              </Pressable>
            )}
            <SecondaryButton label="Share" onPress={() => void sharePage()} />
          </View>
        )}
        <View style={styles.placesHead}>
          <Text style={styles.placesTitle}>
            {firstName(profile.displayName)}&apos;s places {entries.length}
          </Text>
          <MapListToggle mode={mode} onChange={setMode} />
        </View>
      </View>

      <View style={styles.body}>
        {mode === 'map' ? (
          <PlaceMap
            pins={pins}
            onSelect={(placeId) => {
              track('place_viewed', { place_id: placeId, source: 'profile' });
              router.push(`/place/${placeId}?from=profile`);
            }}
          />
        ) : (
          <FlatList
            data={entries}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12 }}
            ListEmptyComponent={<Text style={styles.empty}>No places to show.</Text>}
            renderItem={({ item }) => {
              const place = placeById(data, item.placeId);
              if (!place) return null;
              const photos = photosForEntry(data, item.id);
              const mine = data.entries.some((entry) => entry.userId === me.id && entry.placeId === place.id);
              return (
                <PlaceRow
                  place={place}
                  cover={photos[0]?.uri ?? place.covers[0]}
                  photoCount={photos.length}
                  rating={item.rating}
                  author={firstName(profile.displayName)}
                  tag={item.tags[0]}
                  saved={mine}
                  onPress={() => {
                    track('place_viewed', { place_id: place.id, source: 'profile' });
                    router.push(`/place/${place.id}?from=profile`);
                  }}
                  onHeart={() => onQuick(place.id, place.category)}
                />
              );
            }}
          />
        )}
      </View>
      <StackTabs />

      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMenu(false)}>
          <Pressable style={styles.sheet}>
            <Pressable
              style={styles.sheetRow}
              onPress={() => {
                setMenu(false);
                setReporting(true);
              }}
            >
              <Text style={styles.sheetText}>Report @{profile.handle}</Text>
            </Pressable>
            {!isMe ? (
              <Pressable
                style={styles.sheetRow}
                onPress={() => {
                  setMenu(false);
                  block(profile.id);
                  router.back();
                }}
              >
                <Text style={[styles.sheetText, { color: colors.coral }]}>Block @{profile.handle}</Text>
              </Pressable>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={reporting} transparent animationType="slide" onRequestClose={() => setReporting(false)}>
        <Pressable style={styles.backdrop} onPress={() => setReporting(false)}>
          <Pressable style={styles.sheet}>
            <Text style={styles.sheetTitle}>Report</Text>
            {REPORT_REASONS.map((item) => (
              <Pressable key={item} style={styles.sheetRow} onPress={() => setReason(item)}>
                <Text style={[styles.sheetText, reason === item && { color: colors.coral }]}>{item}</Text>
              </Pressable>
            ))}
            <TextInput
              value={details}
              onChangeText={setDetails}
              placeholder="Details, optional"
              placeholderTextColor={colors.faint}
              style={styles.input}
            />
            <PrimaryButton
              label={thanks ? 'Sent' : 'Send report'}
              onPress={() => {
                report({ targetType: 'profile', targetId: profile.id, reason, details });
                setThanks(true);
                setTimeout(() => {
                  setReporting(false);
                  setThanks(false);
                }, 700);
              }}
            />
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
  screen: { flex: 1, backgroundColor: colors.cream },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  handle: { fontSize: 18, fontWeight: '800' },
  identity: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  stats: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { color: colors.muted, fontSize: 13 },
  name: { fontSize: 28, fontWeight: '800', marginTop: 12, letterSpacing: -0.4 },
  bio: { color: colors.muted, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  follow: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  following: { backgroundColor: '#F1EBE4' },
  followLabel: { color: colors.white, fontWeight: '800', fontSize: 16 },
  followingLabel: { color: colors.ink },
  blocked: { marginTop: 12, color: colors.muted },
  placesHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 8 },
  placesTitle: { fontSize: 20, fontWeight: '800' },
  body: { flex: 1 },
  empty: { color: colors.muted, padding: 16 },
  backdrop: { flex: 1, backgroundColor: 'rgba(28,25,23,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.cream, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 8 },
  sheetTitle: { fontSize: 20, fontWeight: '800' },
  sheetRow: { paddingVertical: 12 },
  sheetText: { fontSize: 16, fontWeight: '700' },
  input: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
});
