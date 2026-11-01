# Love it

A free, map-first diary of the cafes and restaurants you actually love. The first city is Tel Aviv. Each person gets a page with a public link (the one that belongs in a bio). Hotels and attractions are in the model for later; the diary you can click through today is coffee, food, wine, and bakeries.

This repo is the starter: an Expo iPhone app, a Next.js page for public links, shared TypeScript, and the Postgres migration. It runs before any API key exists. Tel Aviv seed data fills the map, search, and the public pages.

## Layout

| Path | What it is |
| --- | --- |
| `apps/mobile` | Expo (React Native, TypeScript, Expo Router). The five screens. |
| `apps/web` | Next.js App Router. Public pages at `/{handle}` (`/@handle` redirects there) and `/places/{id}`, with an open-in-app / install CTA. |
| `packages/shared` | Domain types, Tel Aviv seed data, place search, and the typed PostHog events. |
| `supabase/migrations/0001_love_it_init.sql` | Postgres + PostGIS, RLS, reports, and blocks. |

You are Yael (`@yael.loves`) until real auth is wired. Tom (`@tom.sips`) is the page with Follow, a list of five places, and photo counts. Lev Florentin is the place with the friend cluster, the 4-photo hero, and 12 photos from friends.

## Prerequisites

- Node.js 20.9 or newer
- A Mac with Xcode, for the iOS Simulator or a plugged-in iPhone
- Nothing else is required to click through the app

## Install

From the repo root:

```bash
npm install
```

Check the workspace:

```bash
npm run typecheck
npm run verify
npm run build:web
```

`verify` checks the seed diary: friend pins, Tom’s five places, the 10-photo cap, and that search falls back to the catalog when Apple Maps is unreachable.

## Run the iPhone app

```bash
cd apps/mobile
npx expo start --ios
```

That opens the iOS Simulator. The map is Apple MapKit through `react-native-maps` (the provider is left unset, so it is not Google Maps and it does not need a key). Search, the + Add sheet, photos, follow, and share all work on the seed data.

On a real iPhone, from `apps/mobile`:

```bash
npx expo run:ios --device
```

That compiles a development build and installs it. Use it when the App Store Expo Go build is behind SDK 58, and again after pulling the MapKit search module (`apps/mobile/modules/love-it-local-search`). A JavaScript reload is not enough for that native piece.

The iOS bundle identifier is `com.yanaybenyosef.loveit` (`ios.bundleIdentifier` in `apps/mobile/app.json`). The URL scheme stays `loveit`.

In the Simulator, set the location to Tel Aviv if you want the recenter button to land in the city: **Features → Location → Custom Location…** `32.0853`, `34.7818`. Search stays biased to Tel Aviv either way.

Click through:

1. **Explore** opens on the Friends chip (12 places). Tap the Lev Florentin cluster, then the card, for the place screen.
2. **My page** is Yael’s diary. There is no stories row. **Find friends** searches people. The map/list toggle and category chips filter her saves.
3. Open **@tom.sips** from Find friends. Follow, switch Map/List, and tap a heart to quick-save onto your page. Tzimtzum starts filled because Yael already loves it.
4. The **+** button on every tab opens **Love a place**. Search `lev flo`, rate it (1–5 reads Okay / Good / Great / Loved it), add up to 10 photos, a note, and Public / Friends / Private. Save is meant to take a few seconds.
5. The place screen swipes through photos (`1/N`), shows **Photos from friends**, and the notes under them.

**Reset demo data** is in the ··· menu on My page. **Import from Google Maps** in that same menu records `gmaps_import_started` and `gmaps_import_completed` and drops a few places you don’t have yet. The Takeout parser is the next backend step; the event names are already the day-one ones.

Deep links use the `loveit` scheme: `loveit://u/yael.loves` and `loveit://place/place_lev_florentin`.

## Run the public web app

From the repo root:

```bash
npm run dev:web
```

Open [http://localhost:3000](http://localhost:3000), then [http://localhost:3000/yael.loves](http://localhost:3000/yael.loves) and [http://localhost:3000/tom.sips](http://localhost:3000/tom.sips). `http://localhost:3000/@yael.loves` redirects to `/yael.loves`. Place links look like [http://localhost:3000/places/place_lev_florentin](http://localhost:3000/places/place_lev_florentin).

`/places` and any other real folder under `apps/web/app` is matched before the `[handle]` page. Handles that would collide with the site (`login`, `places`, `favicon.ico`, and the rest of `RESERVED_HANDLES` in `packages/shared`) cannot be claimed. Signup and Edit page both run that check.

**Open in the app** uses the `loveit://` scheme. **Get the iPhone app** goes to `NEXT_PUBLIC_APP_STORE_URL` when that is set, and otherwise to the note on the home page. Both clicks emit PostHog events when a key is present.

Production build:

```bash
npm run build:web
```

A production build defaults to placeholder mode (coming soon on `/`, seed profiles and place pages 404). `npm run dev:web` stays on the full diary. Set `NEXT_PUBLIC_LAUNCH_MODE=live` before the build when the public diary should ship.

## Deploy to loveitapp.com

The site is a Cloudflare Worker in `apps/web`, built with `@opennextjs/cloudflare` for the Workers Free plan. DNS stays on Cloudflare. This is not a Vercel project.

Log Wrangler in once, from `apps/web` (the browser login is stored for later deploys):

```bash
cd apps/web
npx wrangler login
```

Deploy from the repo root. This builds Next.js and ships the Worker named `loveitapp`:

```bash
npm run deploy
```

`npm run preview` builds the same bundle and serves it locally in the Workers runtime. Leave `NEXT_PUBLIC_LAUNCH_MODE` unset, or set it to `placeholder`, so production is the coming-soon page. Set it to `live` only when seed profiles and place pages should be public.

`apps/web/wrangler.jsonc` routes `loveitapp.com` and `www.loveitapp.com` at the Worker. Requests to `www` redirect to `https://loveitapp.com`. Deploy attaches those custom domains when the zone is on the same Cloudflare account. If Wrangler says it could not add the hostname, attach them in the dashboard:

1. Workers & Pages → **loveitapp** → Settings → Domains & Routes.
2. Add Custom domain `loveitapp.com`.
3. Add Custom domain `www.loveitapp.com`.
4. Keep the DNS records Cloudflare creates (proxied). Do not point the names at another host.

Worker variables (Workers & Pages → loveitapp → Settings → Variables and secrets). Next inlines `NEXT_PUBLIC_*` at build time, so put the same values in the environment or in `apps/web/.env.production` before `npm run deploy`:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_LAUNCH_MODE` | `placeholder` until the diary is public, then `live` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...`. Never an `sb_secret_` key. |
| `NEXT_PUBLIC_SITE_URL` | `https://loveitapp.com` |

Verify after deploy:

```bash
curl -sI https://loveitapp.com | head -n 15
curl -sI https://www.loveitapp.com | head -n 15
curl -sI https://loveitapp.com/yael.loves | head -n 15
curl -sI https://loveitapp.com/tom.sips | head -n 15
curl -sI https://loveitapp.com/places/place_lev_florentin | head -n 15
curl -sI https://loveitapp.com/privacy | head -n 15
curl -sI https://loveitapp.com/support | head -n 15
```

Home is 200 and indexable. `www` is a 308 to `https://loveitapp.com/`. `/yael.loves`, `/tom.sips`, and place pages are 404. `/privacy` and `/support` are 200 with `X-Robots-Tag: noindex`. Open https://loveitapp.com and confirm the coming-soon screen. Wrangler also prints a `*.workers.dev` URL at the end of deploy.

To click the coming-soon page on this machine before deploy: `NEXT_PUBLIC_LAUNCH_MODE=placeholder npm run dev:web`.

## Apply the Supabase migration

The app does not need a database to run. When you are ready:

```bash
# Supabase CLI, after `supabase link --project-ref <your-ref>`
supabase db push
```

Or with a direct connection string:

```bash
psql "$DATABASE_URL" -f supabase/migrations/0001_love_it_init.sql
psql "$DATABASE_URL" -f supabase/migrations/0002_handle_rules.sql
psql "$DATABASE_URL" -f supabase/migrations/0003_waitlist.sql
```

The migrations:

- Enables PostGIS.
- `places.location` is a `geography(Point, 4326)`. A row is either an Apple place (`apple_place_id`, the MKMapItem identifier) or a custom pin (`is_custom_pin`).
- `entries` are the saves (rating 1–5, note, tags, visibility `public | friends | private`).
- `place_photos.position` is 1 through 10.
- `profiles` are created from `auth.users` by a trigger. Handles look like `yael.loves`: 3–30 characters of `a-z`, `0-9`, `.`, `_`, unique case-insensitively. `0002_handle_rules.sql` rejects reserved names (`login`, `places`, …). A reserved handle on signup falls back to `lover_<id>` instead of failing the account.
- `follows`, `reports`, and `blocks` back Apple Guideline 1.2. People can report a profile from the ··· menu and block someone, which hides them and drops the follow. Review `reports` in the Supabase dashboard (the service role bypasses RLS).
- RLS: public saves are world-readable (so the link-in-bio page works with the publishable key). Friends-only saves require a follow. Private saves are the author. Blocks hide both sides.
- `0003_waitlist.sql` stores launch emails. Anon can insert. Nobody can read the table with the publishable key. Signups show up in the Supabase dashboard under Table Editor → waitlist.

Copy `.env.example` when you have keys.

```bash
# apps/mobile/.env
EXPO_PUBLIC_SUPABASE_URL=
# sb_publishable_... — sb_secret_ keys must never ship in client code.
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

# apps/web/.env.local
NEXT_PUBLIC_SUPABASE_URL=
# sb_publishable_... — sb_secret_ keys must never ship in client code.
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Public pages keep using the seed diary until those are set and the handle exists in `profiles`. Photo uploads go to the `place-photos` bucket when the mobile URL and publishable key are set; until then the compressed local file is what the diary shows. `uploadPlacePhoto` resizes to 1600px JPEG (quality 0.72) first.

Sign-up smoke test. Needs the project URL, an `sb_publishable_` key, and a real inbox. Supabase Auth rejects `example.com`. The script inserts a random `+tag` before the `@`, so `you@gmail.com` becomes `you+smoke…@gmail.com`. A created user with no session is a pass when **Confirm email** is on.

```bash
SMOKE_TEST_EMAIL=you@gmail.com npm run supabase:smoke
```

Or `npm run supabase:smoke -- you@gmail.com`. `SMOKE_TEST_EMAIL` can also live in `.env`.

`placeSourceForDatabase()` in `@love-it/shared` is the mapping into the SQL check: an Apple id, or a custom pin when the catalog place has not been matched yet.

## Maps and place search

iOS map tiles are Apple MapKit. No Google key, no MapKit JS token.

Place search (the + Add sheet, and only places — Explore never searches people) tries, in order:

1. `NativeModules.LoveItLocalSearch.search(query, latitude, longitude)` if you add an MKLocalSearch dev-client module later.
2. Apple Maps Server API `GET https://maps-api.apple.com/v1/search`, biased to Tel Aviv `32.0853,34.7818`, region around the city, `limitToCountries=IL`, `resultTypeFilter=Poi`. Set `EXPO_PUBLIC_APPLE_MAPS_TOKEN` to turn this on.
3. The Tel Aviv seed catalog, which is what you get with an empty token or a failed request. `lev flo` resolves to Lev Florentin.

## Analytics

Ten day-one events, typed in `packages/shared/src/analytics.ts`:

| Event | When |
| --- | --- |
| `app_opened` | The diary finishes loading |
| `signup_completed` | The first demo session on this install |
| `gmaps_import_started` | Import from Google Maps |
| `gmaps_import_completed` | Import finished, with `imported_count` |
| `place_saved` | Save or quick-save. Includes `time_to_save_ms`, `photo_count`, `has_note` |
| `place_viewed` | A place screen opens |
| `profile_shared` | Share my page, or someone else’s |
| `public_page_viewed` | A public web page loads |
| `public_page_cta_clicked` | Open in the app, or Get the iPhone app |
| `user_followed` | A follow (not an unfollow) |

If `EXPO_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_KEY` is empty, the clients no-op. Host defaults to `https://us.i.posthog.com`.

## Environment

See `.env.example`. All of it is optional for the starter.

| Variable | App | Use |
| --- | --- | --- |
| `EXPO_PUBLIC_POSTHOG_KEY` | mobile | PostHog |
| `EXPO_PUBLIC_WEB_URL` | mobile | Link copied by Share. Defaults to `http://localhost:3000` |
| `EXPO_PUBLIC_APPLE_MAPS_TOKEN` | mobile | Apple Maps Server API search |
| `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | mobile | Photo upload. Key format `sb_publishable_...`. Never an `sb_secret_` key. |
| `NEXT_PUBLIC_POSTHOG_KEY` | web | PostHog |
| `NEXT_PUBLIC_SITE_URL` | web | Public origin. `https://loveitapp.com` in production. |
| `NEXT_PUBLIC_LAUNCH_MODE` | web | `placeholder` (default in production) or `live`. |
| `NEXT_PUBLIC_APP_STORE_URL` | web | Install CTA |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | web | Live public pages. Key format `sb_publishable_...`. Never an `sb_secret_` key. |
| `SMOKE_TEST_EMAIL` | smoke test | Real inbox, for example `you@gmail.com`. The script adds a random `+tag`. Not read by the apps. |

## Scripts

| Command | Where |
| --- | --- |
| `npm install` | root |
| `npm run typecheck` | root, every workspace |
| `npm run verify` | root, seed and search checks |
| `npm run dev:web` | root |
| `npm run build:web` | root |
| `npm run preview` | root, Workers runtime locally (`apps/web` `preview`) |
| `npm run deploy` | root, build and deploy loveitapp.com (`apps/web` `deploy`) |
| `npx expo start --ios` | `apps/mobile` |
| `npx expo run:ios --device` | `apps/mobile` |
| `SMOKE_TEST_EMAIL=you@gmail.com npm run supabase:smoke` | root, signs up `you+smoke…@gmail.com` |
