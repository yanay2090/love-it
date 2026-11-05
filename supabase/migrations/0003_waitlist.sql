-- Launch waitlist for loveitapp.com.
-- Visitors may insert an email with the publishable key. They cannot read the list.

create extension if not exists citext;

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email citext not null,
  source text not null default 'loveitapp.com',
  created_at timestamptz not null default now(),
  constraint waitlist_email_key unique (email),
  constraint waitlist_email_format check (
    char_length(email::text) between 3 and 254
    and email::text ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  constraint waitlist_source_length check (char_length(source) between 1 and 80)
);

alter table public.waitlist enable row level security;

create policy waitlist_insert on public.waitlist
  for insert
  to anon, authenticated
  with check (true);

revoke all on public.waitlist from anon, authenticated;
grant insert on public.waitlist to anon, authenticated;
