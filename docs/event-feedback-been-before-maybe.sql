-- Run once in the Supabase SQL editor, AFTER docs/event-feedback-been-before.sql. Safe to run again.
-- Afterwards regenerate src/types/database.types.ts, and commit it together with the code.
--
-- "Have you been to Tip the Velvet before?" gets a "maybe" answer, so it becomes text: 'yes' | 'no' |
-- 'maybe' (null = not specified). Existing true / false answers become 'yes' / 'no'.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'event_feedback'
               and column_name = 'been_before' and data_type = 'boolean') then
    alter table public.event_feedback alter column been_before type text
      using case when been_before is true then 'yes' when been_before is false then 'no' end;
  end if;
end $$;

alter table public.event_feedback drop constraint if exists event_feedback_been_before_check;
alter table public.event_feedback add constraint event_feedback_been_before_check
  check (been_before is null or been_before in ('yes', 'no', 'maybe'));

drop function if exists public.submit_event_feedback(uuid, text, numeric, jsonb, text, text, text, text, text, boolean, text, text, text, text, boolean);
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
  p_extra_comment text default null,
  p_how_found_note text default null,
  p_would_recommend_note text default null,
  p_been_before text default null
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
    may_quote, voter_token, language, extra_comment, how_found_note, would_recommend_note,
    been_before
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
    nullif(left(trim(coalesce(p_extra_comment, '')), 2000), ''),
    nullif(left(trim(coalesce(p_how_found_note, '')), 200), ''),
    nullif(left(trim(coalesce(p_would_recommend_note, '')), 500), ''),
    case when p_been_before in ('yes', 'no', 'maybe') then p_been_before end
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
    how_found_note = excluded.how_found_note,
    would_recommend_note = excluded.would_recommend_note,
    been_before = excluded.been_before,
    updated_at = now();
end;
$$;

grant execute on function public.submit_event_feedback(uuid, text, numeric, jsonb, text, text, text, text, text, boolean, text, text, text, text, text) to anon, authenticated;
