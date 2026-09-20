create table public.fuel_entries (
    id uuid primary key default gen_random_uuid(),
    station text not null check (station in ('shell', 'orlen')),
    entry_date date not null,
    liters numeric(8, 2) not null check (liters > 0),
    amount numeric(10, 2) not null check (amount > 0),
    price_per_liter numeric(8, 2),
    created_at timestamptz not null default now()
);

alter table public.fuel_entries enable row level security;

create policy "Allow public reads for Gassy"
on public.fuel_entries for select to anon using (true);

create policy "Allow public inserts for Gassy"
on public.fuel_entries for insert to anon with check (true);
