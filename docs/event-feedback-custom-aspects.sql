-- Run once in the Supabase SQL editor. Safe to run again. Afterwards regenerate
-- src/types/database.types.ts.
--
-- Lets the board add their own "parts of the night guests can rate" on /admin/feedback:
--   * for one event only (event_id set), or
--   * as a template (event_id null, in_template true): offered on every event, and ticked by default on
--     events that have not customised their list.
-- Removing one only archives it, so the labels of ratings already given stay readable.
create table if not exists public.feedback_custom_aspects (
  key text primary key,
  label_sv text not null,
  label_eng text not null,
  event_id uuid references public.events(id) on delete cascade,
  in_template boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.feedback_custom_aspects enable row level security;
drop policy if exists "Admins full access feedback_custom_aspects" on public.feedback_custom_aspects;
create policy "Admins full access feedback_custom_aspects" on public.feedback_custom_aspects
  for all to authenticated using (true) with check (true);

-- The public page's event lookup, now also returning the custom categories that apply to the event
-- (its own plus the templates), so guests see their labels.
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
    'opens_at', public.event_feedback_opens_at(e.id),
    'custom_aspects', coalesce((
      select jsonb_agg(jsonb_build_object(
        'key', a.key, 'label_sv', a.label_sv, 'label_eng', a.label_eng,
        'event_id', a.event_id, 'in_template', a.in_template))
      from public.feedback_custom_aspects a
      where not a.is_archived and (a.event_id = e.id or a.in_template)
    ), '[]'::jsonb)
  )
  from public.events e
  where e.slug = p_slug and e.status in ('published', 'archived');
$$;

grant execute on function public.get_feedback_event(text) to anon, authenticated;
