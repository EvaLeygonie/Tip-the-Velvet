-- "Has sponsored us before" for sponsors (same purpose as staff.worked_with / venues.has_hosted).
alter table public.sponsors add column if not exists has_sponsored boolean not null default false;

-- After an event is over, everyone assigned to it counts as "has worked with us before":
-- staff/volunteers (worked_with), sponsors (has_sponsored) and the venue (has_hosted).
-- Only ever sets flags to true, so manual ticks are never undone. Safe to run repeatedly.
create or replace function public.mark_contacts_after_events()
returns void
language sql
security definer
set search_path = public
as $$
  with past as (
    select id, venue_id
    from public.events
    where status = 'published'
      and coalesce(event_end, event_start + interval '12 hours') < now()
  ),
  staff as (
    update public.staff_volunteers s set worked_with = true
    where coalesce(s.worked_with, false) = false
      and s.id in (select esv.staff_id from public.event_staff_volunteers esv join past on past.id = esv.event_id)
    returning 1
  ),
  sponsors as (
    update public.sponsors sp set has_sponsored = true
    where sp.has_sponsored = false
      and sp.id in (select es.sponsor_id from public.event_sponsors es join past on past.id = es.event_id)
    returning 1
  )
  update public.venues v set has_hosted = true
  where v.has_hosted = false and v.id in (select venue_id from past where venue_id is not null);
$$;

revoke all on function public.mark_contacts_after_events() from public, anon;
grant execute on function public.mark_contacts_after_events() to authenticated;

-- Backfill now, then run every night when pg_cron is enabled (Database -> Extensions).
select public.mark_contacts_after_events();

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('mark-contacts-after-events', '0 4 * * *', 'select public.mark_contacts_after_events()');
  end if;
end $$;
