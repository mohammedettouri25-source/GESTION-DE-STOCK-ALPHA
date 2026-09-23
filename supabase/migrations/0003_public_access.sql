-- Enable public (anon) access for all tables used by AlphaShop07 client

-- 1. Ensure app_sync has full public access
alter table if exists public.app_sync enable row level security;
drop policy if exists "public app sync access" on public.app_sync;
create policy "public app sync access" on public.app_sync for all to public using (true) with check (true);

-- 2. Ensure normalized tables also have public access if present
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'products') then
    alter table public.products enable row level security;
    drop policy if exists "public full access products" on public.products;
    create policy "public full access products" on public.products for all to public using (true) with check (true);
  end if;

  if exists (select 1 from information_schema.tables where table_name = 'product_variants') then
    alter table public.product_variants enable row level security;
    drop policy if exists "public full access variants" on public.product_variants;
    create policy "public full access variants" on public.product_variants for all to public using (true) with check (true);
  end if;

  if exists (select 1 from information_schema.tables where table_name = 'sales') then
    alter table public.sales enable row level security;
    drop policy if exists "public full access sales" on public.sales;
    create policy "public full access sales" on public.sales for all to public using (true) with check (true);
  end if;

  if exists (select 1 from information_schema.tables where table_name = 'customers') then
    alter table public.customers enable row level security;
    drop policy if exists "public full access customers" on public.customers;
    create policy "public full access customers" on public.customers for all to public using (true) with check (true);
  end if;
end $$;
