-- Run in the Supabase SQL editor BEFORE using /admin/feedback or the public feedback page.
-- Safe to run again. Afterwards regenerate src/types/database.types.ts.
--
-- Guests give feedback without logging in, so they never touch the table directly:
--   submit_event_feedback()        one rating per device per event (a second submit replaces the first)
--   get_event_feedback_summary()   the public average / distribution, only once enough guests answered
-- Admins (logged-in board members) have full access to event_feedback.

alter table public.events
  add column if not exists feedback_open boolean not null default false,
  -- which aspect rows the form shows (keys from src/lib/feedbackAspects.ts); null = the defaults
  add column if not exists feedback_aspects text[];

create table if not exists public.event_feedback (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  -- overall stars, 1-5
  rating smallint not null check (rating between 1 and 5),
  -- per-aspect stars, e.g. {"theme": 5, "photo_booth": 4}
  aspect_ratings jsonb not null default '{}'::jsonb,
  liked text,
  improve text,
  how_found text,
  -- 'yes' | 'maybe' | 'no'
  would_recommend text,
  -- the guest ticked "you may quote me anonymously"
  may_quote boolean not null default false,
  -- random id the browser keeps, so one device = one rating per event
  voter_token text not null,
  language text,
  -- 'site' for ours; later 'billeto' / 'diversia' / 'google_form' for imported scores
  source text not null default 'site',
  -- board-side moderation
  is_hidden boolean not null default false,
  is_quote_approved boolean not null default false,
  is_actioned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, voter_token)
);

create index if not exists event_feedback_event_idx on public.event_feedback (event_id, created_at desc);

alter table public.event_feedback enable row level security;
drop policy if exists "Admins full access event_feedback" on public.event_feedback;
create policy "Admins full access event_feedback" on public.event_feedback
  for all to authenticated using (true) with check (true);

-- Guest submit. Security definer so the table stays closed; validates everything itself.
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
  if not exists (select 1 from public.events where id = p_event_id and feedback_open) then
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

-- Public summary. The average and distribution are only returned once at least p_min guests
-- answered, so one early ballot can't define a small event. Quotes are only the ones the
-- board approved AND the guest allowed.
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

  v_result := jsonb_build_object('count', v_count, 'min', p_min);

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

grant execute on function public.submit_event_feedback(uuid, text, integer, jsonb, text, text, text, text, boolean, text) to anon, authenticated;
grant execute on function public.get_event_feedback_summary(uuid, integer) to anon, authenticated;
