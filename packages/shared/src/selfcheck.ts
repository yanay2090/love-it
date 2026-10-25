import {
  CURRENT_USER_ID,
  buildPlaceView,
  canViewEntry,
  cloneSeed,
  filterExplorePlaces,
  friendLovedPlaces,
  importPlaces,
  photosForEntry,
  placeSourceForDatabase,
  saveEntry,
  searchPlaces,
  searchProfiles,
  toggleQuickSave,
} from './index';
import { seedData } from './seed';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const yael = CURRENT_USER_ID;
const friendPlaces = friendLovedPlaces(seedData, yael);
assert(friendPlaces.length === 12, `expected 12 friend places, got ${friendPlaces.length}`);

const tomEntries = seedData.entries.filter((entry) => entry.userId === 'user_tom');
assert(tomEntries.length === 5, 'Tom’s page lists five places');
assert(
  photosForEntry(seedData, 'entry_tom_tzimtzum').length === 4,
  'Tzimtzum shows 4 photos on Tom’s row',
);
assert(photosForEntry(seedData, 'entry_tom_lev').length === 6, 'Lev shows 6 of Tom’s photos');
assert(photosForEntry(seedData, 'entry_tom_mirpeset').length === 3, 'Mirpeset shows 3 photos');
assert(photosForEntry(seedData, 'entry_tom_ner').length === 2, 'Ner Laila shows 2 photos');
assert(photosForEntry(seedData, 'entry_tom_shuk').length === 5, 'Kafe Shuk shows 5 photos');

assert(
  seedData.entries.some((entry) => entry.userId === yael && entry.placeId === 'place_tzimtzum'),
  'Yael already loves Tzimtzum, so Tom’s heart is filled',
);
assert(
  !seedData.entries.some((entry) => entry.userId === yael && entry.placeId === 'place_lev_florentin'),
  'Yael has not saved Lev Florentin yet',
);

const lev = buildPlaceView(seedData, 'place_lev_florentin', yael);
assert(lev, 'Lev Florentin exists');
assert(lev.heroPhotos.length === 4, 'hero gallery is the 4 cover photos');
assert(lev.friendPhotos.length === 12, 'photos from friends is 12');
assert(lev.friendLovers.length === 3, 'Maya, Tom, and Dana love Lev');
assert(lev.notes.some((note) => note.entry.note.includes('lamb kebab')), 'Maya’s note is on the place');

const jajo = seedData.entries.find((entry) => entry.id === 'entry_yael_jajo');
assert(jajo && !canViewEntry(seedData, jajo, null), 'friends-only saves stay off the public web');
assert(jajo && canViewEntry(seedData, jajo, 'user_tom'), 'Tom follows Yael, so he can see friends saves');

async function main(): Promise<void> {
  const hits = await searchPlaces('lev flo', seedData.places);
assert(hits[0]?.placeId === 'place_lev_florentin', `search "lev flo" should rank Lev first, got ${hits[0]?.name}`);
const bakery = await searchPlaces('levona', seedData.places);
assert(bakery.some((hit) => hit.placeId === 'place_levona'), 'Levona Bakery is searchable with no API key');
const people = await searchPlaces('tom shalev', seedData.places);
assert(people.every((hit) => hit.placeId || hit.applePlaceId || hit.name), 'search returns places');
assert(!people.some((hit) => hit.name.toLowerCase().includes('tom shalev')), 'explore search does not return people');

const profiles = searchProfiles(seedData, yael, 'tom');
assert(profiles.some((profile) => profile.handle === 'tom.sips'), 'find friends searches people');
assert(profiles.every((profile) => profile.id !== yael), 'find friends hides the current user');

const apple = await searchPlaces('coffee', seedData.places, {
  token: 'test-token',
  fetchImpl: async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      results: [
        {
          id: 'apple-cafe-1',
          name: 'Cafe Apple',
          coordinate: { latitude: 32.08, longitude: 34.78 },
          poiCategory: 'Cafe',
          formattedAddressLines: ['1 Allenby St', 'Tel Aviv'],
          structuredAddress: { subLocality: 'Florentin', locality: 'Tel Aviv' },
        },
      ],
    }),
  }),
});
assert(apple[0]?.source === 'apple-maps-server', 'a token uses Apple Maps Server API /v1/search');
assert(apple[0]?.applePlaceId === 'apple-cafe-1', 'Apple place id is kept for MKMapItem');
assert(apple.some((hit) => hit.source === 'seed'), 'seed matches stay in the list as fallback');

const fellBack = await searchPlaces('tzimtzum', seedData.places, {
  token: 'test-token',
  fetchImpl: async () => {
    throw new Error('offline');
  },
});
assert(fellBack[0]?.placeId === 'place_tzimtzum', 'Apple failures fall back to the Tel Aviv catalog');

const native = await searchPlaces('wine', seedData.places, {
  token: 'ignored-when-native-hits',
  nativeSearch: async () => [
    {
      key: 'mk-1',
      applePlaceId: 'mk-item-1',
      isCustomPin: false,
      name: 'Native Wine Bar',
      category: 'bar',
      subtitle: 'Bar',
      neighborhood: "Lev Ha'ir",
      city: 'Tel Aviv',
      address: '1 Allenby',
      lat: 32.07,
      lng: 34.77,
      priceLevel: 3,
      distanceMeters: 0,
      source: 'mk-local-search',
    },
  ],
});
assert(native[0]?.source === 'mk-local-search', 'MKLocalSearch is preferred when the native bridge is present');

const coffee = filterExplorePlaces(seedData, yael, 'cafe', '');
assert(coffee.every((place) => place.category === 'cafe'), 'Coffee chip is cafes only');
assert(coffee.length > 0, 'Coffee chip has places');

let data = cloneSeed();
const tooMany = Array.from({ length: 12 }, (_, index) => ({ uri: `file://photo-${index}.jpg` }));
const saved = saveEntry(data, {
  userId: yael,
  place: data.places[0]!,
  rating: 5,
  note: '  Lamb kebab, sit at the bar  ',
  tags: ['Date spot', 'Date spot', 'Outdoor seating'],
  visibility: 'public',
  photos: tooMany,
});
assert(saved.entry.placeId === 'place_lev_florentin', 'saving the first catalog place keeps its id');
const storedPhotos = saved.data.photos.filter((photo) => photo.entryId === saved.entry.id);
assert(storedPhotos.length === 10, 'photos cap at 10');
assert(storedPhotos.every((photo, index) => photo.position === index + 1), 'positions are 1..n');
assert(saved.entry.note === 'Lamb kebab, sit at the bar', 'notes are trimmed');
assert(saved.entry.tags.length === 2, 'duplicate tags collapse');

const quick = toggleQuickSave(saved.data, yael, 'place_lev_florentin');
assert(quick.saved === false, 'quick-save toggles off an existing save');
const again = toggleQuickSave(quick.data, yael, 'place_ner_laila');
assert(again.saved && again.entry?.rating === 5, 'quick-save loves a place at 5');

const imported = importPlaces(cloneSeed(), yael, ['place_levona', 'place_tzimtzum', 'place_missing']);
assert(imported.imported.map((place) => place.id).join() === 'place_levona', 'import skips places you already love');

const source = placeSourceForDatabase({ ...seedData.places[0]!, applePlaceId: null, isCustomPin: false });
assert(source.is_custom_pin && source.apple_place_id === null, 'unsynced catalog places sync as custom pins');
const appleSource = placeSourceForDatabase({ ...seedData.places[0]!, applePlaceId: 'mk-123', isCustomPin: false });
assert(appleSource.apple_place_id === 'mk-123' && !appleSource.is_custom_pin, 'Apple ids stay the primary key');

  console.log('love-it shared self-check ok');
  console.log(`seed: ${seedData.places.length} places, ${seedData.profiles.length} people, ${seedData.photos.length} photos`);
}

void main();
