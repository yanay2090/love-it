import type { Entry, LoveItData, Place, PlacePhoto, Rating, ReportTargetType, UserProfile, Visibility } from './domain';
import { MAX_NOTE_LENGTH, MAX_PHOTOS_PER_ENTRY, MAX_TAGS } from './domain';
import { distanceMeters } from './geo';

export function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export interface SavePhotoInput {
  uri: string;
  width?: number;
  height?: number;
}

export interface SaveEntryInput {
  userId: string;
  place: Place;
  rating: Rating;
  note: string;
  tags: string[];
  visibility: Visibility;
  photos: SavePhotoInput[];
  now?: string;
}

export function matchExistingPlace(data: LoveItData, place: Place): Place | undefined {
  if (place.applePlaceId) {
    const byApple = data.places.find((item) => item.applePlaceId === place.applePlaceId);
    if (byApple) return byApple;
  }
  const byId = data.places.find((item) => item.id === place.id);
  if (byId) return byId;
  const name = place.name.trim().toLowerCase();
  return data.places.find(
    (item) => item.name.trim().toLowerCase() === name && distanceMeters(item, place) < 80,
  );
}

export function saveEntry(data: LoveItData, input: SaveEntryInput): { data: LoveItData; entry: Entry } {
  const matched = matchExistingPlace(data, input.place) ?? input.place;
  const places = data.places.some((place) => place.id === matched.id)
    ? data.places.map((place) => (place.id === matched.id ? { ...place, ...matched, covers: place.covers } : place))
    : [matched, ...data.places];

  const existing = data.entries.find((entry) => entry.userId === input.userId && entry.placeId === matched.id);
  const entry: Entry = {
    id: existing?.id ?? createId('entry'),
    userId: input.userId,
    placeId: matched.id,
    rating: input.rating,
    note: input.note.trim().slice(0, MAX_NOTE_LENGTH),
    tags: uniqueTags(input.tags).slice(0, MAX_TAGS),
    visibility: input.visibility,
    createdAt: existing?.createdAt ?? input.now ?? new Date().toISOString(),
  };

  const photos: PlacePhoto[] = input.photos.slice(0, MAX_PHOTOS_PER_ENTRY).map((photo, index) => ({
    id: createId('photo'),
    entryId: entry.id,
    userId: input.userId,
    placeId: matched.id,
    uri: photo.uri,
    position: index + 1,
    width: photo.width,
    height: photo.height,
  }));

  return {
    entry,
    data: {
      ...data,
      places,
      entries: existing
        ? data.entries.map((item) => (item.id === existing.id ? entry : item))
        : [entry, ...data.entries],
      photos: [...data.photos.filter((photo) => photo.entryId !== entry.id), ...photos],
    },
  };
}

export function removeEntry(data: LoveItData, entryId: string): LoveItData {
  return {
    ...data,
    entries: data.entries.filter((entry) => entry.id !== entryId),
    photos: data.photos.filter((photo) => photo.entryId !== entryId),
  };
}

export function toggleQuickSave(
  data: LoveItData,
  userId: string,
  placeId: string,
  now = new Date().toISOString(),
): { data: LoveItData; saved: boolean; entry?: Entry } {
  const existing = data.entries.find((entry) => entry.userId === userId && entry.placeId === placeId);
  if (existing) return { data: removeEntry(data, existing.id), saved: false };
  const place = data.places.find((item) => item.id === placeId);
  if (!place) return { data, saved: false };
  const result = saveEntry(data, {
    userId,
    place,
    rating: 5,
    note: '',
    tags: [],
    visibility: 'public',
    photos: [],
    now,
  });
  return { data: result.data, saved: true, entry: result.entry };
}

export function toggleFollow(
  data: LoveItData,
  followerId: string,
  followingId: string,
  now = new Date().toISOString(),
): { data: LoveItData; following: boolean } {
  if (followerId === followingId) return { data, following: false };
  if (data.blocks.some((block) => block.blockerId === followerId && block.blockedId === followingId)) {
    return { data, following: false };
  }
  const existing = data.follows.some(
    (follow) => follow.followerId === followerId && follow.followingId === followingId,
  );
  if (existing) {
    return {
      following: false,
      data: {
        ...data,
        follows: data.follows.filter(
          (follow) => !(follow.followerId === followerId && follow.followingId === followingId),
        ),
      },
    };
  }
  return {
    following: true,
    data: {
      ...data,
      follows: [...data.follows, { followerId, followingId, createdAt: now }],
    },
  };
}

export function updateProfile(
  data: LoveItData,
  userId: string,
  patch: { displayName?: string; handle?: string; bio?: string },
): LoveItData {
  const handle = patch.handle?.trim().toLowerCase();
  if (handle !== undefined && !/^[a-z0-9._]{3,30}$/.test(handle)) {
    throw new Error('Handles are 3–30 characters: letters, numbers, dots, or underscores.');
  }
  if (handle && data.profiles.some((profile) => profile.handle === handle && profile.id !== userId)) {
    throw new Error('That handle is taken.');
  }
  const displayName = patch.displayName?.trim();
  if (displayName !== undefined && displayName.length === 0) {
    throw new Error('Name can’t be empty.');
  }
  return {
    ...data,
    profiles: data.profiles.map((profile) => {
      if (profile.id !== userId) return profile;
      const next: UserProfile = {
        ...profile,
        displayName: displayName ?? profile.displayName,
        handle: handle ?? profile.handle,
        bio: patch.bio !== undefined ? patch.bio.trim().slice(0, 140) : profile.bio,
      };
      const parts = next.displayName.split(' ').filter(Boolean);
      const letters = (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
      next.initials = (letters || next.initials).toUpperCase();
      return next;
    }),
  };
}

export function blockUser(data: LoveItData, blockerId: string, blockedId: string, now = new Date().toISOString()): LoveItData {
  if (blockerId === blockedId) return data;
  const follows = data.follows.filter(
    (follow) =>
      !((follow.followerId === blockerId && follow.followingId === blockedId) ||
        (follow.followerId === blockedId && follow.followingId === blockerId)),
  );
  const already = data.blocks.some((block) => block.blockerId === blockerId && block.blockedId === blockedId);
  return {
    ...data,
    follows,
    blocks: already ? data.blocks : [...data.blocks, { blockerId, blockedId, createdAt: now }],
  };
}

export function unblockUser(data: LoveItData, blockerId: string, blockedId: string): LoveItData {
  return {
    ...data,
    blocks: data.blocks.filter((block) => !(block.blockerId === blockerId && block.blockedId === blockedId)),
  };
}

export function addReport(
  data: LoveItData,
  input: { reporterId: string; targetType: ReportTargetType; targetId: string; reason: string; details?: string; now?: string },
): LoveItData {
  return {
    ...data,
    reports: [
      {
        id: createId('report'),
        reporterId: input.reporterId,
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason.trim(),
        details: input.details?.trim() || undefined,
        createdAt: input.now ?? new Date().toISOString(),
      },
      ...data.reports,
    ],
  };
}

export function importPlaces(
  data: LoveItData,
  userId: string,
  placeIds: readonly string[],
  now = new Date().toISOString(),
): { data: LoveItData; imported: Place[] } {
  let next = data;
  const imported: Place[] = [];
  placeIds.forEach((placeId, index) => {
    const place = next.places.find((item) => item.id === placeId);
    if (!place) return;
    if (next.entries.some((entry) => entry.userId === userId && entry.placeId === placeId)) return;
    const saved = saveEntry(next, {
      userId,
      place,
      rating: 5,
      note: 'Imported from Google Maps',
      tags: [],
      visibility: 'public',
      photos: [],
      now: new Date(Date.parse(now) + index).toISOString(),
    });
    next = saved.data;
    imported.push(place);
  });
  return { data: next, imported };
}

function uniqueTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tag of tags) {
    const clean = tag.trim().slice(0, 32);
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    result.push(clean);
  }
  return result;
}
