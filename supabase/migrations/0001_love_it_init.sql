-- Love it — initial schema
-- Postgres + PostGIS, with RLS.
-- Places point at an Apple MKMapItem identifier, or a person-dropped custom pin.
-- Reports and blocks are here for Apple Guideline 1.2 (user-generated content).

create extension if not exists postgis;
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text not null unique,
  display_name text not null,
  bio text not null default '',
  avatar_url text,
  city text not null default 'Tel Aviv',
  created_at timestamptz not null default now(),
  constraint profiles_handle_format check (handle ~ '^[a-z0-9._]{3,30}$')
);

create table public.places (
  id uuid primary key default gen_random_uuid(),
  apple_place_id text unique,
  is_custom_pin boolean not null default false,
  name text not null,
  category text not null,
  subtitle text not null default '',
  neighborhood text not null default '',
  city text not null default 'Tel Aviv',
  address text not null default '',
  price_level smallint,
  local_name text,
  location geography(Point, 4326) not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint places_category_chk check (
    category in ('cafe', 'restaurant', 'bar', 'bakery', 'hotel', 'attraction')
  ),
  constraint places_price_chk check (price_level is null or price_level between 1 and 4),
  -- Every stored place is either an Apple MKMapItem or a custom pin.
  constraint places_identity_chk check (
    (apple_place_id is not null and is_custom_pin = false)
    or (apple_place_id is null and is_custom_pin = true)
  )
);

create index places_location_idx on public.places using gist (location);
create index places_category_idx on public.places (category);
create index places_city_idx on public.places (city);

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  place_id uuid not null references public.places (id) on delete cascade,
  rating smallint not null,
  note text not null default '',
  tags text[] not null default '{}',
  visibility text not null default 'public',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint entries_rating_chk check (rating between 1 and 5),
  constraint entries_visibility_chk check (visibility in ('public', 'friends', 'private')),
  constraint entries_note_len_chk check (char_length(note) <= 180),
  constraint entries_user_place_unique unique (user_id, place_id)
);

create index entries_user_idx on public.entries (user_id, created_at desc);
create index entries_place_idx on public.entries (place_id);
create index entries_visibility_idx on public.entries (visibility);

create table public.place_photos (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  place_id uuid not null references public.places (id) on delete cascade,
  storage_path text not null,
  position smallint not null,
  width integer,
  height integer,
  created_at timestamptz not null default now(),
  constraint place_photos_position_chk check (position between 1 and 10),
  constraint place_photos_entry_position_unique unique (entry_id, position)
);

create index place_photos_place_idx on public.place_photos (place_id, position);
create index place_photos_entry_idx on public.place_photos (entry_id);

create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self check (follower_id <> following_id)
);

create index follows_following_idx on public.follows (following_id);

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_no_self check (blocker_id <> blocked_id)
);

create index blocks_blocked_idx on public.blocks (blocked_id);

-- Guideline 1.2: people can report a profile, save, photo, or place.
-- Review the rows in the Supabase dashboard (service role bypasses RLS).
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  details text,
  created_at timestamptz not null default now(),
  constraint reports_target_chk check (target_type in ('profile', 'entry', 'photo', 'place')),
  constraint reports_reason_len_chk check (char_length(reason) between 1 and 80)
);

create index reports_created_idx on public.reports (created_at desc);
create index reports_target_idx on public.reports (target_type, target_id);

comment on table public.reports is
  'User reports for Apple Guideline 1.2. Moderate from the Supabase dashboard.';
comment on table public.blocks is
  'Blocks hide both people’s saves from each other and drop the follow.';

-- ---------------------------------------------------------------------------
-- Helpers. Security definer so policies can read follows/blocks without
-- recursing through RLS.
-- ---------------------------------------------------------------------------

create or replace function public.is_blocked(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.blocks
    where (blocker_id = a and blocked_id = b)
       or (blocker_id = b and blocked_id = a)
  );
$$;

create or replace function public.follows_author(author uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.follows
    where follower_id = auth.uid()
      and following_id = author
  );
$$;

create or replace function public.can_view_entry(entry_user uuid, entry_visibility text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when auth.uid() is not null and public.is_blocked(auth.uid(), entry_user) then false
      when auth.uid() is not null and auth.uid() = entry_user then true
      when entry_visibility = 'public' then true
      when entry_visibility = 'friends' and public.follows_author(entry_user) then true
      else false
    end;
$$;

create or replace function public.touch_entry_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger entries_set_updated_at
  before update on public.entries
  for each row execute function public.touch_entry_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  desired_handle text;
begin
  desired_handle := lower(coalesce(new.raw_user_meta_data->>'handle', ''));
  if desired_handle !~ '^[a-z0-9._]{3,30}$' then
    desired_handle := 'lover_' || left(replace(new.id::text, '-', ''), 8);
  end if;

  begin
    insert into public.profiles (id, handle, display_name)
    values (
      new.id,
      desired_handle,
      coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), 'New on Love it')
    );
  exception
    when unique_violation then
      insert into public.profiles (id, handle, display_name)
      values (
        new.id,
        'lover_' || left(replace(new.id::text, '-', ''), 8),
        coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), 'New on Love it')
      );
  end;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Public counts for profile pages. security invoker so RLS still applies
-- when the view is queried through the API.
create or replace view public.profile_stats
with (security_invoker = true) as
select
  p.id,
  p.handle,
  (select count(*) from public.entries e where e.user_id = p.id and e.visibility = 'public') as public_loved_count,
  (select count(*) from public.follows f where f.following_id = p.id) as followers_count,
  (select count(*) from public.follows f where f.follower_id = p.id) as following_count
from public.profiles p;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.places enable row level security;
alter table public.entries enable row level security;
alter table public.place_photos enable row level security;
alter table public.follows enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;

create policy "profiles are readable"
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy "users insert their profile"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "users update their profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "places are readable"
  on public.places for select
  to anon, authenticated
  using (true);

create policy "signed-in users add places"
  on public.places for insert
  to authenticated
  with check (created_by is null or created_by = auth.uid());

create policy "creators update their places"
  on public.places for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "entries follow visibility"
  on public.entries for select
  to anon, authenticated
  using (public.can_view_entry(user_id, visibility));

create policy "users insert their entries"
  on public.entries for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "users update their entries"
  on public.entries for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "users delete their entries"
  on public.entries for delete
  to authenticated
  using (user_id = auth.uid());

create policy "photos follow the parent entry"
  on public.place_photos for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.entries e
      where e.id = place_photos.entry_id
        and public.can_view_entry(e.user_id, e.visibility)
    )
  );

create policy "users add their photos"
  on public.place_photos for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "users delete their photos"
  on public.place_photos for delete
  to authenticated
  using (user_id = auth.uid());

create policy "follows are readable"
  on public.follows for select
  to anon, authenticated
  using (true);

create policy "users follow as themselves"
  on public.follows for insert
  to authenticated
  with check (
    follower_id = auth.uid()
    and not public.is_blocked(auth.uid(), following_id)
  );

create policy "users unfollow as themselves"
  on public.follows for delete
  to authenticated
  using (follower_id = auth.uid());

create policy "users see their blocks"
  on public.blocks for select
  to authenticated
  using (blocker_id = auth.uid());

create policy "users create blocks"
  on public.blocks for insert
  to authenticated
  with check (blocker_id = auth.uid());

create policy "users remove their blocks"
  on public.blocks for delete
  to authenticated
  using (blocker_id = auth.uid());

create policy "users read their own reports"
  on public.reports for select
  to authenticated
  using (reporter_id = auth.uid());

create policy "users file reports"
  on public.reports for insert
  to authenticated
  with check (reporter_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Grants. RLS still filters rows; these only open the API roles.
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

grant select on public.profiles, public.places, public.entries, public.place_photos, public.follows, public.profile_stats
  to anon, authenticated;

grant insert, update on public.profiles to authenticated;
grant insert, update on public.places to authenticated;
grant insert, update, delete on public.entries to authenticated;
grant insert, delete on public.place_photos to authenticated;
grant insert, delete on public.follows to authenticated;
grant select, insert, delete on public.blocks to authenticated;
grant select, insert on public.reports to authenticated;

-- ---------------------------------------------------------------------------
-- Storage bucket for the up-to-10 photos on a save.
-- Skipped quietly when this file is applied to plain Postgres without Storage.
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage')
     and exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public)
    values ('place-photos', 'place-photos', true)
    on conflict (id) do nothing;
  end if;
exception
  when others then
    raise notice 'place-photos bucket was not created: %', sqlerrm;
end $$;
