-- The person can delete their Love it account from the app (App Store 5.1.1(v)).
-- Runs as the function owner so it can remove the auth user after the diary rows.
-- Profiles cascade to entries, photos, follows, blocks, and reports.

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
