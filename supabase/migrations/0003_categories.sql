-- T012: hazard categories (data-model.md categories). Rows come from seed.sql.
create table public.categories (
  id text primary key check (id ~ '^[a-z_]+$'),
  "group" public.category_group not null,
  label text not null check (char_length(label) between 2 and 40),
  icon text not null,
  default_severity public.severity not null,
  sort_order int not null default 0
);

alter table public.categories enable row level security;

create policy "categories: public read" on public.categories
  for select to anon, authenticated using (true);

create policy "categories: admin write" on public.categories
  for all to authenticated
  using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

revoke all on public.categories from anon, authenticated;
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
