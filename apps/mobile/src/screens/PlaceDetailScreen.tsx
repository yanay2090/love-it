import { Ionicons } from '@expo/vector-icons';
import { buildPlaceView, placeDetailMeta, priceLabel, ratingLabel } from '@love-it/shared';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackTabs } from '../components/AppTabBar';
import { Gallery } from '../components/Gallery';
import { Avatar } from '../components/ui';
import { track } from '../analytics';
import { useApp } from '../store';
import { colors, shadow } from '../theme';

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function PlaceDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string; from?: string }>();
  const id = one(params.id) ?? '';
  const from = one(params.from);
  const { data, me, quickSave } = useApp();
  const view = buildPlaceView(data, id, me.id);
  const [grid, setGrid] = useState(false);
  const openedAt = useRef(Date.now());

  useEffect(() => {
    if (!id) return;
    const source = from === 'explore' || from === 'list' || from === 'profile' ? from : 'deep_link';
    track('place_viewed', { place_id: id, source });
  }, [id, from]);

  if (!view) {
    return (
      <View style={[styles.missing, { paddingTop: insets.top }]}>
        <Text style={styles.title}>This place isn’t in the diary.</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.link}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const { place } = view;
  const saved = Boolean(view.viewerEntry);

  function onLove() {
    if (saved) {
      router.push(`/add?placeId=${place.id}`);
      return;
    }
    const result = quickSave(place.id);
    if (result.saved && result.entry) {
      track('place_saved', {
        place_id: place.id,
        category: place.category,
        rating: result.entry.rating,
        visibility: result.entry.visibility,
        time_to_save_ms: Date.now() - openedAt.current,
        photo_count: 0,
        has_note: false,
      });
    }
  }

  async function sharePlace() {
    const url = `${(process.env.EXPO_PUBLIC_WEB_URL || 'http://localhost:3000').replace(/\/$/, '')}/places/${place.id}`;
    await Share.share({ message: `${place.name} on Love it — ${url}`, url });
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <Gallery photos={view.heroPhotos} />
        <View style={styles.body}>
          <Text style={styles.title}>{place.name}</Text>
          <Text style={styles.meta}>
            {placeDetailMeta(place)} · {priceLabel(place.priceLevel)}
          </Text>
          <View style={styles.actions}>
            <Pressable style={styles.love} onPress={onLove}>
              <Ionicons name="heart" size={18} color={colors.white} />
              <Text style={styles.loveText}>{saved ? 'Loved' : 'Love it'}</Text>
            </Pressable>
            <Pressable
              style={styles.directions}
              onPress={() =>
                void Linking.openURL(
                  `https://maps.apple.com/?daddr=${place.lat},${place.lng}&q=${encodeURIComponent(place.name)}`,
                )
              }
            >
              <Ionicons name="navigate" size={16} color={colors.ink} />
              <Text style={styles.directionsText}>Directions</Text>
            </Pressable>
          </View>

          <View style={styles.sectionHead}>
            <Text style={styles.section}>Photos from friends {view.friendPhotos.length}</Text>
            {view.friendPhotos.length > 0 ? (
              <Pressable onPress={() => setGrid((value) => !value)}>
                <Text style={styles.seeAll}>{grid ? 'Strip' : 'See all'}</Text>
              </Pressable>
            ) : null}
          </View>
          {grid ? (
            <View style={styles.grid}>
              {view.friendPhotos.map(({ photo, profile }) => (
                <View key={photo.id} style={styles.gridItem}>
                  <GalleryTile uri={photo.uri} initials={profile.initials} color={profile.avatarColor} />
                </View>
              ))}
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
              {view.friendPhotos.map(({ photo, profile }) => (
                <GalleryTile key={photo.id} uri={photo.uri} initials={profile.initials} color={profile.avatarColor} />
              ))}
            </ScrollView>
          )}

          <View style={styles.lovedRow}>
            <View style={styles.stack}>
              {view.friendLovers.slice(0, 3).map((lover, index) => (
                <View key={lover.profile.id} style={{ marginLeft: index === 0 ? 0 : -8 }}>
                  <Avatar initials={lover.profile.initials} color={lover.profile.avatarColor} size={28} />
                </View>
              ))}
            </View>
            <Text style={styles.lovedText}>
              {view.friendLovers.length > 0
                ? `Loved by ${view.friendLovers.length} friend${view.friendLovers.length === 1 ? '' : 's'}`
                : 'No friends have saved this yet'}
            </Text>
          </View>

          {view.notes.map((note) => (
            <Pressable key={note.entry.id} style={styles.note} onPress={() => router.push(`/u/${note.profile.handle}`)}>
              <View style={styles.noteHead}>
                <Avatar initials={note.profile.initials} color={note.profile.avatarColor} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.noteName}>{note.profile.displayName}</Text>
                </View>
                <Text style={styles.score}>
                  ♥ {note.entry.rating}/5 · {ratingLabel(note.entry.rating)}
                </Text>
              </View>
              {note.entry.note ? <Text style={styles.noteBody}>{note.entry.note}</Text> : null}
              <View style={styles.tags}>
                {note.entry.tags.map((tag) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <Pressable style={[styles.back, { top: insets.top + 8 }]} onPress={() => router.back()} accessibilityLabel="Back">
        <Ionicons name="chevron-back" size={22} color={colors.ink} />
      </Pressable>
      <Pressable style={[styles.share, { top: insets.top + 8 }]} onPress={() => void sharePlace()} accessibilityLabel="Share place">
        <Ionicons name="share-outline" size={18} color={colors.ink} />
      </Pressable>
      <StackTabs />
    </View>
  );
}

function GalleryTile({ uri, initials, color }: { uri: string; initials: string; color: string }) {
  return (
    <View style={styles.tile}>
      <View style={StyleSheet.absoluteFill}>
        <AvatarImage uri={uri} />
      </View>
      <View style={[styles.tileBadge, { backgroundColor: color }]}>
        <Text style={styles.tileBadgeText}>{initials}</Text>
      </View>
    </View>
  );
}

function AvatarImage({ uri }: { uri: string }) {
  return <Image source={{ uri }} style={styles.tileImage} contentFit="cover" />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  missing: { flex: 1, backgroundColor: colors.cream, padding: 24 },
  body: {
    marginTop: -22,
    backgroundColor: colors.cream,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.6, color: colors.ink },
  meta: { color: colors.muted, marginTop: 4, fontSize: 15 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  love: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.coral,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...shadow.soft,
  },
  loveText: { color: colors.white, fontWeight: '800', fontSize: 16 },
  directions: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EFE8E1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  directionsText: { fontWeight: '800', color: colors.ink },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22 },
  section: { fontSize: 18, fontWeight: '800' },
  seeAll: { color: colors.coral, fontWeight: '800' },
  strip: { gap: 10, paddingVertical: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingVertical: 12 },
  gridItem: { width: '30%' },
  tile: { width: 92, height: 92, borderRadius: 18, overflow: 'hidden', backgroundColor: '#F4A03C' },
  tileImage: { width: '100%', height: '100%' },
  tileBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tileBadgeText: { color: colors.white, fontSize: 10, fontWeight: '800' },
  lovedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  stack: { flexDirection: 'row' },
  lovedText: { fontWeight: '800', fontSize: 16 },
  note: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 14,
    marginTop: 12,
    ...shadow.soft,
  },
  noteHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  noteName: { fontWeight: '800', fontSize: 16 },
  score: { color: colors.coral, fontWeight: '800' },
  noteBody: { marginTop: 8, fontSize: 15, lineHeight: 21 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tag: { backgroundColor: '#F6EFE8', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  tagText: { fontWeight: '700', color: '#6D645C', fontSize: 12 },
  back: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  share: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  link: { color: colors.coral, fontWeight: '800', marginTop: 12 },
});
