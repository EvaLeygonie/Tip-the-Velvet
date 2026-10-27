-- Run once in the Supabase SQL editor, AFTER docs/event-feedback-public-review.sql. Safe to run again.
-- Afterwards regenerate src/types/database.types.ts.
--
-- An "extra comment" at the end of the feedback form, for anything that doesn't fit the other fields.
-- Private, like "what did you like / what can we do better": only the board reads it.
alter table public.event_feedback add column if not exists extra_comment text;

drop function if exists public.submit_event_feedback(uuid, text, numeric, jsonb, text, text, text, text, text, boolean, text);
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
  p_language text default null,
  p_extra_comment text default null
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
    may_quote, voter_token, language, extra_comment
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
    left(p_language, 8),
    nullif(left(trim(coalesce(p_extra_comment, '')), 2000), '')
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
    extra_comment = excluded.extra_comment,
    updated_at = now();
end;
$$;

grant execute on function public.submit_event_feedback(uuid, text, numeric, jsonb, text, text, text, text, text, boolean, text, text) to anon, authenticated;
