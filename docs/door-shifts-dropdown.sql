-- Run once in the Supabase SQL editor. Makes get_event_info also return the door staff's names
-- (volunteers on the guest list shift + doormen) so the volunteer page can show a name dropdown
-- on each door shift. Patched in place from the current definition; stops with an error rather
-- than half-applying if the function text has changed.
do $$
declare
  d text;
  patched text;
begin
  d := pg_get_functiondef('public.get_event_info(uuid)'::regprocedure);
  patched := replace(
    d,
    '''door_people'', case when v_link.audience = ''volunteer'' then',
    '''door_names'', case when v_link.audience = ''volunteer'' then
      coalesce((select jsonb_agg(q.n order by q.n)
                from (select distinct st.name as n
                      from event_staff_volunteers e join staff_volunteers st on st.id = e.staff_id
                      where e.event_id = v_ev.id
                        and (e.role = ''doorman'' or (e.role = ''volunteer'' and e.shift = ''guestlist''))) q),
               ''[]''::jsonb) end,
    ''door_people'', case when v_link.audience = ''volunteer'' then'
  );
  if patched = d then
    raise exception 'get_event_info did not change - check its definition by hand';
  end if;
  execute patched;
end $$;
