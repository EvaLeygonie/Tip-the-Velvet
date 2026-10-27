-- Run once in the Supabase SQL editor, AFTER docs/event-feedback-decimal-rating.sql. Safe to run again.
-- Afterwards regenerate src/types/database.types.ts.
--
-- Adds a public "review" text right under the star rating. It is the only guest text that can appear on
-- the website (when the guest ticks "show my review" AND the board approves it on /admin/feedback).
-- "What did you like / what can we do better" stay private, for the board.
alter table public.event_feedback add column if not exists review text;

drop function if exists public.submit_event_feedback(uuid, text, numeric, jsonb, text, text, text, text, boolean, text);
create or replace function public.submit_event_feedback(
  p_event_id uuid,
  p_token text,
  p_rating numeric,
  p_aspects jsonb default '{}'::jsonb,
  p_review text default null,
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
  if p_rating is null or p_rating < 0.5 or p_rating > 5 or (p_rating * 2) <> trunc(p_rating * 2) then
    raise exception 'invalid rating';
  end if;
  if not public.event_feedback_is_open(p_event_id) then
    raise exception 'feedback is closed';
  end if;

  insert into public.event_feedback as f (
    event_id, rating, aspect_ratings, review, liked, improve, how_found, would_recommend,
    may_quote, voter_token, language
  ) values (
    p_event_id,
    p_rating,
    coalesce(p_aspects, '{}'::jsonb),
    nullif(left(trim(coalesce(p_review, '')), 2000), ''),
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
    review = excluded.review,
    liked = excluded.liked,
    improve = excluded.improve,
    how_found = excluded.how_found,
    would_recommend = excluded.would_recommend,
    may_quote = excluded.may_quote,
    language = excluded.language,
    updated_at = now();
end;
$$;

-- Public summary: the quotes shown on event pages are now the approved public reviews.
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
      'quotes', coalesce((select jsonb_agg(q.review) from (
          select review from public.event_feedback
          where event_id = p_event_id and not is_hidden and may_quote and is_quote_approved
            and review is not null
          order by created_at desc limit 3) q), '[]'::jsonb)
    );
  end if;
  return v_result;
end;
$$;

grant execute on function public.submit_event_feedback(uuid, text, numeric, jsonb, text, text, text, text, text, boolean, text) to anon, authenticated;
grant execute on function public.get_event_feedback_summary(uuid, integer) to anon, authenticated;
