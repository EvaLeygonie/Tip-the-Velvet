-- Run once in the Supabase SQL editor. Safe to run again. Afterwards regenerate
-- src/types/database.types.ts.
--
-- Lets the board star up to three approved reviews per event (on /admin/feedback). Starred reviews
-- are the first ones shown on the event page; the rest follow, newest first.
alter table public.event_feedback add column if not exists is_featured boolean not null default false;

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
        order by is_featured desc, created_at desc
        limit greatest(least(p_limit, 50), 1) offset greatest(p_offset, 0)) r), '[]'::jsonb)
  );
$$;

grant execute on function public.get_event_feedback_reviews(uuid, integer, integer) to anon, authenticated;
