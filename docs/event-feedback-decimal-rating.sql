-- Run once in the Supabase SQL editor, AFTER docs/event-feedback-auto-open.sql. Safe to run again.
-- Afterwards regenerate src/types/database.types.ts.
--
-- 1. Guests can give half stars (0.5 steps), and imported answers from the old Google forms carry an
--    average of several questions (e.g. 4.4), so the overall rating is stored with one decimal.
-- 2. The rating can be empty: Once Upon a Time's old form had no rating questions, only comments.
--    Empty ratings are left out of every average and count.
alter table public.event_feedback drop constraint if exists event_feedback_rating_check;
alter table public.event_feedback alter column rating type numeric(2,1) using rating::numeric;
alter table public.event_feedback alter column rating drop not null;
alter table public.event_feedback add constraint event_feedback_rating_check
  check (rating is null or rating between 0.5 and 5);

-- 3. Old forms (Once Upon a Time) asked "what did you like / what can we do better" as tick-boxes of
--    topics. Those are kept as topic tags (the same keys as the rating rows, e.g. 'theme',
--    'photo_booth') so the admin page can show them next to the written comments.
alter table public.event_feedback
  add column if not exists liked_aspects text[],
  add column if not exists improve_aspects text[];

-- Guest submit with half stars. (Replaces the version that took a whole number.)
drop function if exists public.submit_event_feedback(uuid, text, integer, jsonb, text, text, text, text, boolean, text);
create or replace function public.submit_event_feedback(
  p_event_id uuid,
  p_token text,
  p_rating numeric,
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
  -- 0.5 to 5 in steps of 0.5
  if p_rating is null or p_rating < 0.5 or p_rating > 5 or (p_rating * 2) <> trunc(p_rating * 2) then
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

-- Public summary: only answers with a rating count, and the star distribution counts each answer
-- under its nearest whole star.
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
  where event_id = p_event_id and not is_hidden and rating is not null;

  v_result := jsonb_build_object(
    'count', v_count, 'min', p_min, 'is_open', public.event_feedback_is_open(p_event_id)
  );

  if v_count >= p_min then
    v_result := v_result || jsonb_build_object(
      'average', (select round(avg(rating)::numeric, 1)
                  from public.event_feedback where event_id = p_event_id and not is_hidden),
      'distribution', (select jsonb_object_agg(r::text, c) from (
          select g.r, (select count(*) from public.event_feedback f
                       where f.event_id = p_event_id and not f.is_hidden and f.rating is not null
                         and round(f.rating) = g.r) as c
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

grant execute on function public.submit_event_feedback(uuid, text, numeric, jsonb, text, text, text, text, boolean, text) to anon, authenticated;
grant execute on function public.get_event_feedback_summary(uuid, integer) to anon, authenticated;
