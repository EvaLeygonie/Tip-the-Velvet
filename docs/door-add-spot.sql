-- Run once in the Supabase SQL editor. Lets a volunteer add a second spot to a door shift that
-- has only one, but only once every time slot has at least one person on it.
create or replace function public.add_door_spot(p_token uuid, p_slot_start timestamptz)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_link record;
  v_slot record;
begin
  select * into v_link from event_info_links where token = p_token and audience = 'volunteer';
  if not found then raise exception 'Ogiltig länk.'; end if;

  if exists (
    select 1
    from (
      select slot_start, bool_or(volunteer_name is not null) as covered
      from door_shift_slots
      where event_id = v_link.event_id
      group by slot_start
    ) w
    where not w.covered
  ) then
    raise exception 'Alla tider behöver minst en person först.';
  end if;

  select slot_start, min(slot_end) as slot_end, count(*) as seats into v_slot
  from door_shift_slots
  where event_id = v_link.event_id and slot_start = p_slot_start
  group by slot_start;
  if not found then raise exception 'Passet finns inte.'; end if;
  if v_slot.seats >= 2 then raise exception 'Passet har redan två platser.'; end if;

  insert into door_shift_slots (event_id, slot_start, slot_end)
  values (v_link.event_id, v_slot.slot_start, v_slot.slot_end);
end;
$function$;

grant execute on function public.add_door_spot(uuid, timestamptz) to anon, authenticated;
