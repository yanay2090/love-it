import { Ionicons } from '@expo/vector-icons';
import {
  DEMO_ORIGIN,
  MAX_NOTE_LENGTH,
  MAX_PHOTOS_PER_ENTRY,
  PLACE_CATEGORIES,
  RATINGS,
  SUGGESTED_TAGS,
  categoryLabel,
  customPinPlace,
  formatDistance,
  placeById,
  placeFromHit,
  placeListMeta,
  ratingLabel,
  viewerEntryFor,
  visibilityLabel,
  type Place,
  type PlaceCategory,
  type PlaceSearchHit,
  type Rating,
  type Visibility,
} from '@love-it/shared';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { track } from '../analytics';
import { pickPlacePhotos, uploadPlacePhoto, type PreparedPhoto } from '../photos';
import { searchTelAvivPlaces } from '../search';
import { useApp } from '../store';
import { colors, shadow } from '../theme';
import { Thumb } from '../components/ui';
import { brandHaptic } from '../motion';

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const VISIBILITIES: Visibility[] = ['public', 'friends', 'private'];

export function AddScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, me, save } = useApp();
  const placeId = one(useLocalSearchParams<{ placeId?: string }>().placeId);
  const seeded = placeId ? placeById(data, placeId) : undefined;
  const existing = placeId ? viewerEntryFor(data, me.id, placeId) : undefined;
  const openedAt = useRef(Date.now());

  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<PlaceSearchHit[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(placeId ?? null);
  const [custom, setCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState<PlaceCategory>('cafe');
  const [rating, setRating] = useState<Rating>(existing?.rating ?? 5);
  const [tags, setTags] = useState<string[]>(existing?.tags ?? []);
  const [note, setNote] = useState(existing?.note ?? '');
  const [visibility, setVisibility] = useState<Visibility>(existing?.visibility ?? 'public');
  const [showVisibility, setShowVisibility] = useState(false);
  const [addingTag, setAddingTag] = useState(false);
  const [tagDraft, setTagDraft] = useState('');
  const [photos, setPhotos] = useState<PreparedPhoto[]>(() =>
    existing
      ? data.photos
          .filter((photo) => photo.entryId === existing.id)
          .sort((a, b) => a.position - b.position)
          .map((photo) => ({ uri: photo.uri, width: photo.width, height: photo.height }))
      : [],
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(() => {
      void searchTelAvivPlaces(query, data.places).then((next) => {
        if (cancelled) return;
        setHits(next);
        setSelectedKey((current) => {
          if (next.some((hit) => hit.key === current || hit.placeId === current)) return current;
          if (!query.trim() && placeId) return placeId;
          return next[0]?.key ?? null;
        });
      });
    }, 160);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, data.places, placeId]);

  const selectedHit =
    hits.find((hit) => hit.key === selectedKey || hit.placeId === selectedKey) ??
    (!query.trim() && seeded ? hitFromPlace(seeded) : undefined);
  const selectedPlace = resolvePlace(selectedHit, data.places);

  function toggleTag(tag: string) {
    setTags((current) => (current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag].slice(0, 8)));
  }

  async function addPhotos() {
    const picked = await pickPlacePhotos(photos.length);
    if (picked.length === 0) return;
    setPhotos((current) => [...current, ...picked].slice(0, MAX_PHOTOS_PER_ENTRY));
  }

  async function onSave() {
    const place = custom
      ? customPinPlace({
          name: customName,
          category: customCategory,
          lat: DEMO_ORIGIN.lat,
          lng: DEMO_ORIGIN.lng,
          neighborhood: 'Tel Aviv',
        })
      : selectedPlace;
    if (!place || busy) return;
    if (custom && customName.trim().length < 2) return;
    setBusy(true);
    try {
      const uploaded: PreparedPhoto[] = [];
      for (let index = 0; index < photos.length; index += 1) {
        const photo = photos[index];
        if (!photo) continue;
        const remote = photo.uri.startsWith('http')
          ? photo.uri
          : await uploadPlacePhoto(photo.uri, `${me.id}/${place.id}/${index + 1}.jpg`);
        uploaded.push({ ...photo, uri: remote });
      }
      const entry = save({
        place,
        rating,
        note,
        tags,
        visibility,
        photos: uploaded,
      });
      track('place_saved', {
        place_id: entry.placeId,
        category: place.category,
        rating,
        visibility,
        time_to_save_ms: Date.now() - openedAt.current,
        photo_count: uploaded.length,
        has_note: note.trim().length > 0,
      });
      brandHaptic('addComplete');
      router.replace(`/place/${entry.placeId}?from=list`);
    } finally {
      setBusy(false);
    }
  }

  const canSave = custom ? customName.trim().length >= 2 : Boolean(selectedPlace);

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>Love a place</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={(value) => {
              setQuery(value);
              setCustom(false);
            }}
            placeholder="Search cafes and restaurants"
            placeholderTextColor={colors.faint}
            style={styles.searchInput}
            autoFocus={!placeId}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
        <Text style={styles.kicker}>{query.trim() ? 'PLACES' : 'NEAR YOU'}</Text>
        {hits.map((hit) => {
          const active = !custom && (hit.key === selectedHit?.key || hit.placeId === selectedHit?.placeId);
          return (
            <Pressable
              key={hit.key}
              style={styles.result}
              onPress={() => {
                setCustom(false);
                setSelectedKey(hit.key);
              }}
            >
              <Thumb uri={hit.placeId ? placeById(data, hit.placeId)?.covers[0] : undefined} size={48} />
              <View style={{ flex: 1 }}>
                <Text style={styles.resultName}>{hit.name}</Text>
                <Text style={styles.resultMeta}>
                  {hit.subtitle} · {hit.neighborhood}
                  {hit.distanceMeters ? ` · ${formatDistance(hit.distanceMeters)}` : ''}
                </Text>
              </View>
              <View style={[styles.check, active && styles.checkOn]}>
                {active ? <Ionicons name="checkmark" size={16} color={colors.white} /> : null}
              </View>
            </Pressable>
          );
        })}
        <Pressable style={styles.customLink} onPress={() => setCustom(true)}>
          <Text style={styles.customLinkText}>Can’t find it? Drop a custom pin</Text>
        </Pressable>

        {custom ? (
          <View style={styles.card}>
            <Text style={styles.label}>Custom pin</Text>
            <TextInput
              value={customName}
              onChangeText={setCustomName}
              placeholder="Place name"
              placeholderTextColor={colors.faint}
              style={styles.note}
            />
            <View style={styles.tags}>
              {PLACE_CATEGORIES.map((category) => (
                <Pressable
                  key={category}
                  onPress={() => setCustomCategory(category)}
                  style={[styles.tag, customCategory === category && styles.tagOn]}
                >
                  <Text style={[styles.tagText, customCategory === category && styles.tagTextOn]}>
                    {categoryLabel(category)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {canSave ? (
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <View style={{ flex: 1 }}>
                <Text style={styles.placeName}>{custom ? customName : selectedPlace?.name}</Text>
                <Text style={styles.resultMeta}>
                  {custom ? `${categoryLabel(customCategory)} · Tel Aviv` : selectedPlace ? placeListMeta(selectedPlace) : ''}
                </Text>
              </View>
              <Pressable
                style={styles.bigHeart}
                onPress={() => {
                  brandHaptic('save');
                  setRating(5);
                }}
              >
                <Ionicons name="heart" size={28} color={colors.white} />
              </Pressable>
            </View>

            <View style={styles.howMuch}>
              <Text style={styles.label}>How much?</Text>
              <Text style={styles.ratingWord}>{ratingLabel(rating)}</Text>
            </View>
            <View style={styles.scores}>
              {RATINGS.map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setRating(value)}
                  style={[styles.score, value <= rating && styles.scoreOn]}
                >
                  <Text style={[styles.scoreText, value <= rating && styles.scoreTextOn]}>{value}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.tags}>
              {Array.from(new Set([...SUGGESTED_TAGS, ...tags])).map((tag) => {
                const on = tags.includes(tag);
                return (
                  <Pressable key={tag} onPress={() => toggleTag(tag)} style={[styles.tag, on && styles.tagOn]}>
                    {on ? <Ionicons name="checkmark" size={12} color={colors.coralDark} /> : null}
                    <Text style={[styles.tagText, on && styles.tagTextOn]}>{tag}</Text>
                  </Pressable>
                );
              })}
              <Pressable style={styles.tag} onPress={() => setAddingTag(true)}>
                <Text style={styles.tagText}>+ Tag</Text>
              </Pressable>
            </View>
            {addingTag ? (
              <TextInput
                value={tagDraft}
                onChangeText={setTagDraft}
                onSubmitEditing={() => {
                  if (tagDraft.trim()) toggleTag(tagDraft.trim());
                  setTagDraft('');
                  setAddingTag(false);
                }}
                placeholder="Tag"
                placeholderTextColor={colors.faint}
                style={styles.note}
                autoFocus
              />
            ) : null}

            <View style={styles.noteWrap}>
              <TextInput
                value={note}
                onChangeText={(value) => setNote(value.slice(0, MAX_NOTE_LENGTH))}
                placeholder="Lamb kebab, sit at the bar"
                placeholderTextColor={colors.faint}
                style={styles.note}
              />
              <Text style={styles.optional}>Note · optional</Text>
            </View>

            <View style={styles.photoHead}>
              <Text style={styles.label}>Add photos · optional</Text>
              <Text style={styles.optional}>
                {photos.length} of {MAX_PHOTOS_PER_ENTRY}
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
              {photos.map((photo, index) => (
                <View key={`${photo.uri}-${index}`}>
                  <Image source={{ uri: photo.uri }} style={styles.photo} contentFit="cover" />
                  <Pressable
                    style={styles.remove}
                    onPress={() => setPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index))}
                  >
                    <Ionicons name="close" size={12} color={colors.white} />
                  </Pressable>
                </View>
              ))}
              {photos.length < MAX_PHOTOS_PER_ENTRY ? (
                <Pressable style={styles.addPhoto} onPress={() => void addPhotos()}>
                  <Ionicons name="add" size={18} color={colors.coral} />
                  <Text style={styles.addPhotoText}>Photo</Text>
                </Pressable>
              ) : null}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable style={styles.visibility} onPress={() => setShowVisibility((value) => !value)}>
          <Ionicons
            name={visibility === 'private' ? 'lock-closed-outline' : visibility === 'friends' ? 'people-outline' : 'globe-outline'}
            size={16}
            color={colors.ink}
          />
          <Text style={styles.visibilityText}>{visibilityLabel(visibility)}</Text>
        </Pressable>
        <Pressable style={[styles.save, !canSave && { opacity: 0.45 }]} disabled={!canSave || busy} onPress={() => void onSave()}>
          <Ionicons name="heart" size={16} color={colors.white} />
          <Text style={styles.saveText}>{busy ? 'Saving' : 'Save'}</Text>
        </Pressable>
      </View>
      {showVisibility ? (
        <View style={[styles.visibilityMenu, { bottom: Math.max(insets.bottom, 12) + 64 }]}>
          {VISIBILITIES.map((item) => (
            <Pressable
              key={item}
              style={styles.visibilityItem}
              onPress={() => {
                setVisibility(item);
                setShowVisibility(false);
              }}
            >
              <Text style={[styles.visibilityText, item === visibility && { color: colors.coral }]}>
                {visibilityLabel(item)}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

function hitFromPlace(place: Place): PlaceSearchHit {
  return {
    key: place.id,
    placeId: place.id,
    applePlaceId: place.applePlaceId,
    isCustomPin: place.isCustomPin,
    name: place.name,
    category: place.category,
    subtitle: place.subtitle,
    neighborhood: place.neighborhood,
    city: place.city,
    address: place.address,
    lat: place.lat,
    lng: place.lng,
    priceLevel: place.priceLevel,
    distanceMeters: 0,
    source: 'seed',
  };
}

function resolvePlace(hit: PlaceSearchHit | undefined, places: Place[]): Place | undefined {
  if (!hit) return undefined;
  if (hit.placeId) return places.find((place) => place.id === hit.placeId) ?? placeFromHit(hit);
  return placeFromHit(hit);
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  cancel: { color: colors.coral, fontWeight: '800', fontSize: 16 },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F6F1EB',
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 48,
  },
  searchInput: { flex: 1, fontSize: 16, color: colors.ink },
  kicker: { marginTop: 16, marginBottom: 8, color: colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 0.6 },
  result: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  resultName: { fontWeight: '800', fontSize: 16 },
  resultMeta: { color: colors.muted, marginTop: 2 },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#E4DBD2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.coral, borderColor: colors.coral },
  customLink: { paddingVertical: 12 },
  customLinkText: { color: colors.coral, fontWeight: '800' },
  card: {
    backgroundColor: '#FBF6F1',
    borderRadius: 22,
    padding: 14,
    marginTop: 8,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  placeName: { fontSize: 22, fontWeight: '800' },
  bigHeart: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
  },
  label: { fontWeight: '800', fontSize: 15 },
  howMuch: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  ratingWord: { color: colors.coral, fontWeight: '800' },
  scores: { flexDirection: 'row', gap: 8, marginTop: 10 },
  score: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#EFE8E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreOn: { backgroundColor: colors.coral },
  scoreText: { fontWeight: '800', color: colors.ink },
  scoreTextOn: { color: colors.white },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFE8E1',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  tagOn: { backgroundColor: colors.coralSoft },
  tagText: { fontWeight: '700', color: '#6D645C' },
  tagTextOn: { color: colors.coralDark },
  noteWrap: { marginTop: 12 },
  note: {
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.ink,
  },
  optional: { color: colors.muted, marginTop: 6, alignSelf: 'flex-end' },
  photoHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  photoRow: { gap: 10, paddingTop: 10 },
  photo: { width: 72, height: 72, borderRadius: 16 },
  remove: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhoto: {
    width: 72,
    height: 72,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoText: { color: colors.coral, fontWeight: '800', fontSize: 12 },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: colors.white,
  },
  visibility: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1EBE4',
    borderRadius: 24,
    paddingHorizontal: 14,
  },
  visibilityText: { fontWeight: '800' },
  visibilityMenu: {
    position: 'absolute',
    left: 16,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 8,
    ...shadow.card,
  },
  visibilityItem: { paddingVertical: 8, paddingHorizontal: 8 },
  save: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.coral,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveText: { color: colors.white, fontWeight: '800', fontSize: 16 },
});
