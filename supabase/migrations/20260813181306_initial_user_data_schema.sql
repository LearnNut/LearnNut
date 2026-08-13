create table public.profiles (
  id uuid not null references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_pkey primary key (id),
  constraint profiles_display_name_length
    check (
      display_name is null
      or (
        char_length(display_name) <= 80
        and display_name ~ '[^[:space:]]'
      )
    )
);

create table public.sources (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id text not null,
  label text not null,
  original_url text not null,
  folder_name text,
  source_type text not null default 'website',
  processing_status text not null default 'saved',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint sources_pkey primary key (id),
  constraint sources_user_id_client_id_key unique (user_id, client_id),
  constraint sources_client_id_length
    check (
      char_length(client_id) <= 255
      and client_id ~ '[^[:space:]]'
    ),
  constraint sources_label_length
    check (
      char_length(label) <= 100
      and label ~ '[^[:space:]]'
    ),
  constraint sources_original_url_format_and_length
    check (
      char_length(original_url) <= 2048
      and original_url !~ '[[:space:]]'
      and original_url ~* '^https?://([^/?#[:space:]@]+@)?(\[[0-9a-f:.]+\]|[^/?#[:space:]@:]+)(:[0-9]{1,5})?([/?#]|$)'
    ),
  constraint sources_folder_name_length
    check (
      folder_name is null
      or (
        char_length(folder_name) <= 100
        and folder_name ~ '[^[:space:]]'
      )
    ),
  constraint sources_source_type_supported
    check (source_type in ('website', 'video', 'pdf', 'audio', 'text', 'document')),
  constraint sources_processing_status_supported
    check (processing_status in ('saved', 'queued', 'processing', 'ready', 'failed'))
);

create index sources_user_id_created_at_id_idx
  on public.sources (user_id, created_at desc, id desc);

create function public.learnnut_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

revoke all privileges
on function public.learnnut_set_updated_at()
from public, anon, authenticated, service_role;

create trigger learnnut_profiles_set_updated_at
before update on public.profiles
for each row
execute function public.learnnut_set_updated_at();

create trigger learnnut_sources_set_updated_at
before update on public.sources
for each row
execute function public.learnnut_set_updated_at();

create function public.learnnut_create_profile_for_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all privileges
on function public.learnnut_create_profile_for_new_auth_user()
from public, anon, authenticated, service_role;

create trigger learnnut_create_profile_after_auth_user_insert
after insert on auth.users
for each row
execute function public.learnnut_create_profile_for_new_auth_user();

alter table public.profiles enable row level security;
alter table public.sources enable row level security;

revoke all privileges
on table public.profiles, public.sources
from public, anon, authenticated, service_role;

grant select
on table public.profiles
to authenticated;

grant update (display_name)
on table public.profiles
to authenticated;

grant select, delete
on table public.sources
to authenticated;

grant insert (user_id, client_id, label, original_url, folder_name, source_type)
on table public.sources
to authenticated;

grant update (label, original_url, folder_name, source_type)
on table public.sources
to authenticated;

grant select, insert, update, delete
on table public.profiles, public.sources
to service_role;

create policy learnnut_profiles_select_own
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy learnnut_profiles_update_own
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy learnnut_sources_select_own
on public.sources
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy learnnut_sources_insert_own
on public.sources
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy learnnut_sources_update_own
on public.sources
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy learnnut_sources_delete_own
on public.sources
for delete
to authenticated
using ((select auth.uid()) = user_id);
