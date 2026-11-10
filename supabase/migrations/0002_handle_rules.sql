-- Handle rules for public profile URLs (yourdomain/<handle>).
-- Keep the reserved list in sync with RESERVED_HANDLES in packages/shared/src/handles.ts.
--
-- Format: 3–30 characters, lowercase a–z, 0–9, dot, underscore.
-- Reserved names cannot be claimed.
-- Uniqueness is case-insensitive (lower(handle)), so Yael and yael cannot both exist.

create or replace function public.is_allowed_handle(candidate text)
returns boolean
language sql
immutable
as $$
  select candidate ~ '^[a-z0-9._]{3,30}$'
    and lower(candidate) <> all (array[
      'login',
      'signup',
      'signin',
      'logout',
      'privacy',
      'terms',
      'about',
      'help',
      'support',
      'settings',
      'api',
      'admin',
      'app',
      'explore',
      'search',
      'place',
      'places',
      'u',
      'www',
      'static',
      'assets',
      '_next',
      'favicon.ico',
      'robots.txt',
      'sitemap.xml',
      'blog',
      'press',
      'download',
      'invite'
    ]::text[]);
$$;

alter table public.profiles drop constraint if exists profiles_handle_format;
alter table public.profiles
  add constraint profiles_handle_format check (public.is_allowed_handle(handle));

-- Replace the case-sensitive column unique with a case-insensitive one.
alter table public.profiles drop constraint if exists profiles_handle_key;
create unique index if not exists profiles_handle_ci_uidx on public.profiles (lower(handle));

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
  -- Invalid or reserved handles fall back so signup still creates a profile.
  -- A direct insert of a reserved handle still fails profiles_handle_format.
  if not public.is_allowed_handle(desired_handle) then
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
