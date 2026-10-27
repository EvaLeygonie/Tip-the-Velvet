-- Run once in the Supabase SQL editor, AFTER docs/event-feedback.sql. Safe to run again.
-- Afterwards regenerate src/types/database.types.ts.
--
-- Feedback now opens by itself: from 23:00 (Stockholm time) on the event's day, with no one having
-- to remember. events.feedback_mode replaces the old on/off events.feedback_open:
--   'auto'   (default) opens at 23:00 on the event day and stays open
--   'open'   open right now, whatever the clock says
--   'closed' closed, whatever the clock says
-- Change the 23:00 in event_feedback_opens_at() below if the board wants another time.

alter table public.events
  add column if not exists feedback_mode text not null default 'auto'
  check (feedback_mode in ('auto', 'open', 'closed'));

-- Carry over what the board already chose, then keep long-past shows closed so their pages don't
-- suddenly show a "be the first to rate" box (open one on purpose from /admin/feedback if wanted).
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'events' and column_name = 'feedback_open') then
    update public.events set feedback_mode = 'open' where feedback_open;
    update public.events set feedback_mode = 'closed'
      where not feedback_open and event_start < now() - interval '14 days';
  end if;
end $$;

create or replace function public.event_feedback_opens_at(p_event_id uuid)
returns timestamptz
language sql
stable
set search_path = public
as $$
  select ((e.event_start at time zone 'Europe/Stockholm')::date + time '23:00') at time zone 'Europe/Stockholm'
  from public.events e
  where e.id = p_event_id and e.event_start is not null;
$$;

create or replace function public.event_feedback_is_open(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select case e.feedback_mode
             when 'open' then true
             when 'closed' then false
             else coalesce(now() >= public.event_feedback_opens_at(e.id), false)
           end
    from public.events e
    where e.id = p_event_id and e.status in ('published', 'archived')
  ), false);
$$;

-- The public page's event lookup. Published and archived events only, with everything the page
-- needs including whether feedback is open right now.
create or replace function public.get_feedback_event(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', e.id,
    'title', e.title,
    'slug', e.slug,
    'event_start', e.event_start,
    'feedback_aspects', to_jsonb(e.feedback_aspects),
    'feedback_mode', e.feedback_mode,
    'is_open', public.event_feedback_is_open(e.id),
    'opens_at', public.event_feedback_opens_at(e.id)
  )
  from public.events e
  where e.slug = p_slug and e.status in ('published', 'archived');
$$;

-- Same submit as before, but "open" now comes from the rule above.
create or replace function public.submit_event_feedback(
  p_event_id uuid,
  p_token text,
  p_rating integer,
  p_aspects jsonb default '{}'::jsonb,
  p_liked text default null,
  p_improve text default null,
  p_how_found text default null,
  p_would_recommend text default null,
  p_may_quote boolean default false,
  p_language text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_token is null or length(p_token) < 8 or length(p_token) > 100 then
    raise exception 'invalid token';
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'invalid rating';
  end if;
  if not public.event_feedback_is_open(p_event_id) then
    raise exception 'feedback is closed';
  end if;

  insert into public.event_feedback as f (
    event_id, rating, aspect_ratings, liked, improve, how_found, would_recommend,
    may_quote, voter_token, language
  ) values (
    p_event_id,
    p_rating,
    coalesce(p_aspects, '{}'::jsonb),
    nullif(left(trim(coalesce(p_liked, '')), 2000), ''),
    nullif(left(trim(coalesce(p_improve, '')), 2000), ''),
    nullif(left(trim(coalesce(p_how_found, '')), 200), ''),
    case when p_would_recommend in ('yes', 'maybe', 'no') then p_would_recommend end,
    coalesce(p_may_quote, false),
    p_token,
    left(p_language, 8)
  )
  on conflict (event_id, voter_token) do update set
    rating = excluded.rating,
    aspect_ratings = excluded.aspect_ratings,
    liked = excluded.liked,
    improve = excluded.improve,
    how_found = excluded.how_found,
    would_recommend = excluded.would_recommend,
    may_quote = excluded.may_quote,
    language = excluded.language,
    updated_at = now();
end;
$$;

-- Public summary, now also saying whether feedback is open so event pages need no other lookup.
create or replace function public.get_event_feedback_summary(p_event_id uuid, p_min integer default 5)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_result jsonb;
begin
  select count(*) into v_count
  from public.event_feedback
  where event_id = p_event_id and not is_hidden;

  v_result := jsonb_build_object(
    'count', v_count, 'min', p_min, 'is_open', public.event_feedback_is_open(p_event_id)
  );

  if v_count >= p_min then
    v_result := v_result || jsonb_build_object(
      'average', (select round(avg(rating)::numeric, 1)
                  from public.event_feedback where event_id = p_event_id and not is_hidden),
      'distribution', (select jsonb_object_agg(r::text, c) from (
          select g.r, (select count(*) from public.event_feedback f
                       where f.event_id = p_event_id and not f.is_hidden and f.rating = g.r) as c
          from generate_series(1, 5) as g(r)) d),
      'quotes', coalesce((select jsonb_agg(q.liked) from (
          select liked from public.event_feedback
          where event_id = p_event_id and not is_hidden and may_quote and is_quote_approved
            and liked is not null
          order by created_at desc limit 3) q), '[]'::jsonb)
    );
  end if;
  return v_result;
end;
$$;

alter table public.events drop column if exists feedback_open;

grant execute on function public.event_feedback_opens_at(uuid) to anon, authenticated;
grant execute on function public.event_feedback_is_open(uuid) to anon, authenticated;
grant execute on function public.get_feedback_event(text) to anon, authenticated;
grant execute on function public.submit_event_feedback(uuid, text, integer, jsonb, text, text, text, text, boolean, text) to anon, authenticated;
grant execute on function public.get_event_feedback_summary(uuid, integer) to anon, authenticated;
