-- Store offline-first application records safely until they are materialized
-- into the normalized business tables by the server-side workflow.
create table if not exists public.app_sync (
  id bigint generated always as identity primary key,
  entity_type text not null,
  entity_id text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  unique (entity_type, entity_id)
);

alter table public.app_sync enable row level security;

-- Grant access to public / anon role so offline sync works out of the box
drop policy if exists "authenticated app sync access" on public.app_sync;
drop policy if exists "public app sync access" on public.app_sync;

create policy "public app sync access" on public.app_sync
for all to public
using (true)
with check (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    join pg_class c on c.oid = pr.prrelid
    where p.pubname = 'supabase_realtime' and c.relname = 'app_sync'
  ) then
    alter publication supabase_realtime add table public.app_sync;
  end if;
end $$;
