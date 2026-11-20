-- T082: incident list with search, filters and pagination (contracts/database.md list_incidents).

create or replace function public.list_incidents(
  q text default null,
  statuses public.incident_status[] default null,
  category_ids text[] default null,
  since timestamptz default null,
  page int default 1,
  page_size int default 11
)
returns jsonb
language sql
stable
set search_path = public
as $$
  with filtered as (
    select v.*
    from public.incidents_public v
    where (statuses is null or v.status = any (statuses))
      and (category_ids is null or v.category_id = any (category_ids))
      and (since is null or v.reported_at >= since)
      and (
        q is null or q = ''
        or v.title ilike '%' || q || '%'
        or v.description ilike '%' || q || '%'
        or v.place_name ilike '%' || q || '%'
      )
  ),
  paged as (
    select * from filtered
    order by reported_at desc
    limit least(greatest(page_size, 1), 50)
    offset (greatest(page, 1) - 1) * least(greatest(page_size, 1), 50)
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'rows', coalesce((select jsonb_agg(to_jsonb(p) order by p.reported_at desc) from paged p), '[]'::jsonb)
  );
$$;

grant execute on function public.list_incidents(text, public.incident_status[], text[], timestamptz, int, int) to anon, authenticated;
