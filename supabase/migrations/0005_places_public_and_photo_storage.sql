-- Lat/lng for public pages (PostgREST otherwise returns geography as hex EWKB)
-- and owner-scoped policies for the place-photos bucket.
-- Also removes a deleted account's photos from Storage.

create or replace view public.places_public
with (security_invoker = true) as
select
  id,
  apple_place_id,
  is_custom_pin,
  name,
  category,
  subtitle,
  neighborhood,
  city,
  address,
  price_level,
  local_name,
  created_by,
  created_at,
  st_y(location::geometry) as lat,
  st_x(location::geometry) as lng
from public.places;

grant select on public.places_public to anon, authenticated;

do $$
begin
  if to_regclass('storage.objects') is null then
    raise notice 'storage.objects missing; skipped place-photos policies';
    return;
  end if;

  execute 'drop policy if exists "place photos are world readable" on storage.objects';
  execute 'drop policy if exists "place photos insert own folder" on storage.objects';
  execute 'drop policy if exists "place photos update own folder" on storage.objects';
  execute 'drop policy if exists "place photos delete own folder" on storage.objects';

  execute $policy$
    create policy "place photos are world readable"
      on storage.objects for select
      to anon, authenticated
      using (bucket_id = 'place-photos')
  $policy$;

  execute $policy$
    create policy "place photos insert own folder"
      on storage.objects for insert
      to authenticated
      with check (
        bucket_id = 'place-photos'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
  $policy$;

  execute $policy$
    create policy "place photos update own folder"
      on storage.objects for update
      to authenticated
      using (
        bucket_id = 'place-photos'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
      with check (
        bucket_id = 'place-photos'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
  $policy$;

  execute $policy$
    create policy "place photos delete own folder"
      on storage.objects for delete
      to authenticated
      using (
        bucket_id = 'place-photos'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
  $policy$;
end $$;

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;

  if to_regclass('storage.objects') is not null then
    delete from storage.objects
    where bucket_id = 'place-photos'
      and name like uid::text || '/%';
  end if;

  delete from public.place_photos where user_id = uid;
  delete from public.entries where user_id = uid;
  delete from public.follows where follower_id = uid or following_id = uid;
  delete from public.blocks where blocker_id = uid or blocked_id = uid;
  delete from public.reports where reporter_id = uid;
  delete from public.profiles where id = uid;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_own_account() from public;
revoke all on function public.delete_own_account() from anon;
grant execute on function public.delete_own_account() to authenticated;
