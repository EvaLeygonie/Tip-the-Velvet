-- 1. One place for "what happens when an event is over": event_status_handler (already run daily
--    by the archive-finished-events-daily cron job) now also flags sponsors and the venue, next to
--    the staff/volunteers it already handled. Replaces the separate mark_contacts_after_events.
create or replace function public.event_status_handler()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
BEGIN
  -- 1. Draft → Published (reveal date has passed) + open staff recruitment
  UPDATE public.events
  SET status = 'published',
      staff_recruitment_open = true,
      updated_at = now()
  WHERE status = 'draft'
    AND reveal_date IS NOT NULL
    AND reveal_date < now();

  -- 2. Open casting calls whose start date has arrived
  UPDATE public.events
  SET has_casting_call = true,
      updated_at = now()
  WHERE has_casting_call = false
    AND casting_call_start IS NOT NULL
    AND casting_call_start <= now()::date
    AND (casting_call_deadline IS NULL OR casting_call_deadline >= now()::date);

  -- 3. Close casting calls (deadline date has passed)
  UPDATE public.events
  SET has_casting_call = false,
      updated_at = now()
  WHERE has_casting_call = true
    AND casting_call_deadline IS NOT NULL
    AND casting_call_deadline < now()::date;

  -- 4. Close staff recruitment on the day of the event
  UPDATE public.events
  SET staff_recruitment_open = false,
      updated_at = now()
  WHERE staff_recruitment_open = true
    AND event_start IS NOT NULL
    AND event_start::date <= now()::date;

  -- 5. Published → Archived (event date has passed) — and, exactly once, at the same moment,
  --    mark everyone assigned to the event as "has worked with us before": staff/volunteers
  --    (worked_with), sponsors (has_sponsored) and the venue (has_hosted).
  WITH to_archive AS (
    UPDATE public.events
    SET status = 'archived',
        updated_at = now()
    WHERE status = 'published'
      AND event_end IS NOT NULL
      AND event_end < now()::date
    RETURNING id, venue_id
  ),
  staff AS (
    UPDATE public.staff_volunteers
    SET worked_with = true
    WHERE id IN (
      SELECT esv.staff_id
      FROM public.event_staff_volunteers esv
      JOIN to_archive ON to_archive.id = esv.event_id
    )
    RETURNING 1
  ),
  sponsors AS (
    UPDATE public.sponsors
    SET has_sponsored = true
    WHERE id IN (
      SELECT es.sponsor_id
      FROM public.event_sponsors es
      JOIN to_archive ON to_archive.id = es.event_id
    )
    RETURNING 1
  )
  UPDATE public.venues
  SET has_hosted = true
  WHERE id IN (SELECT venue_id FROM to_archive WHERE venue_id IS NOT NULL);

  -- 6. Reveal performers whose scheduled reveal date has arrived, approving their
  --    profile too if this is their first event
  WITH to_reveal AS (
    UPDATE public.event_performers
    SET is_revealed = true
    WHERE is_revealed = false
      AND reveal_date IS NOT NULL
      AND reveal_date <= now()::date
    RETURNING performer_id
  )
  UPDATE public.performers
  SET is_approved = true
  WHERE is_approved = false
    AND id IN (SELECT performer_id FROM to_reveal);

  -- 7. Reveal pre-show entertainers whose scheduled reveal date has arrived
  UPDATE public.event_staff_volunteers
  SET is_revealed = true
  WHERE role = 'entertainment'
    AND is_revealed = false
    AND reveal_date IS NOT NULL
    AND reveal_date <= now()::date;
END;
$function$;

-- 2. One-off catch-up for events that were archived before sponsors/venues were tracked.
update public.sponsors set has_sponsored = true
where id in (select es.sponsor_id from public.event_sponsors es join public.events e on e.id = es.event_id where e.status = 'archived');
update public.venues set has_hosted = true
where id in (select venue_id from public.events where status = 'archived' and venue_id is not null);

-- 3. Remove the temporary function + nightly job from 20261016 (now handled above).
select cron.unschedule('mark-contacts-after-events');
drop function if exists public.mark_contacts_after_events();

-- 4. Unused leftovers: nothing in the app, edge functions, triggers or defaults calls these.
drop function if exists public.get_performer_by_slug_for_edit(text);
drop function if exists public.update_performer_by_slug(text, text, text, text, text, text, text, text, text, text);
drop function if exists public.slugify(text);
