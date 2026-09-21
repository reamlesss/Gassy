create table public.fuel_entries (
    id uuid primary key default gen_random_uuid(),
    station text not null check (station in ('shell', 'orlen')),
    entry_date date not null,
    liters numeric(8, 2) check (liters is null or liters > 0),
    amount numeric(10, 2) not null check (amount > 0),
    price_per_liter numeric(8, 2),
    created_at timestamptz not null default now()
);

alter table public.fuel_entries enable row level security;

create policy "Allow public reads for Gassy"
on public.fuel_entries for select to anon using (true);

create policy "Allow public inserts for Gassy"
on public.fuel_entries for insert to anon with check (true);

-- Run these two statements when upgrading an existing table created earlier.
alter table public.fuel_entries alter column liters drop not null;
alter table public.fuel_entries drop constraint if exists fuel_entries_liters_check;
alter table public.fuel_entries add constraint fuel_entries_liters_check check (liters is null or liters > 0);
