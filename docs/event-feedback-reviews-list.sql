-- Run once in the Supabase SQL editor. Safe to run again. Afterwards regenerate
-- src/types/database.types.ts.
--
-- 1. get_event_feedback_reviews: the approved public reviews of one event, a page at a time, so the
--    event page can show three and let guests load the rest ("show more").
-- 2. get_event_feedback_averages: the public average for every event that has enough ratings, in one
--    call, for the star rating on the cards in the events list.
create or replace function public.get_event_feedback_reviews(
  p_event_id uuid, p_limit integer default 3, p_offset integer default 0
) returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'total', (select count(*) from public.event_feedback
              where event_id = p_event_id and not is_hidden and may_quote and is_quote_approved
                and review is not null),
    'reviews', coalesce((select jsonb_agg(r) from (
        select review, created_at from public.event_feedback
        where event_id = p_event_id and not is_hidden and may_quote and is_quote_approved
          and review is not null
        order by created_at desc
        limit greatest(least(p_limit, 50), 1) offset greatest(p_offset, 0)) r), '[]'::jsonb)
  );
$$;

create or replace function public.get_event_feedback_averages(p_min integer default 5)
returns table (event_id uuid, average numeric, count integer)
language sql
stable
security definer
set search_path = public
as $$
  select f.event_id, round(avg(f.rating)::numeric, 1), count(*)::integer
  from public.event_feedback f
  join public.events e on e.id = f.event_id and e.status in ('published', 'archived')
  where not f.is_hidden and f.rating is not null
  group by f.event_id
  having count(*) >= p_min;
$$;

grant execute on function public.get_event_feedback_reviews(uuid, integer, integer) to anon, authenticated;
grant execute on function public.get_event_feedback_averages(integer) to anon, authenticated;
