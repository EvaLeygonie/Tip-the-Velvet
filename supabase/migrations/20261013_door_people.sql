-- Adds `door_people` (how many door staff there are) to get_event_info, so the volunteer page
-- can say roughly how long each person is expected to stand on the door.
-- Door staff = role 'doorman' or volunteers on the 'guestlist' shift.
create or replace function public.get_event_info(p_token uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_link record;
  v_ev record;
  v_reveal timestamptz;
  v_checkin_reveal timestamptz;
begin
  if p_token is null then raise exception 'Access token saknas.'; end if;
  select * into v_link from event_info_links where token = p_token;
  if not found then raise exception 'Ogiltig länk.'; end if;
  select * into v_ev from events where id = v_link.event_id;
  v_reveal := v_ev.event_start - interval '38 hours';
  v_checkin_reveal := v_ev.event_start - interval '6 hours';

  return jsonb_build_object(
    'audience', v_link.audience,
    'event', jsonb_build_object('id', v_ev.id, 'title', v_ev.title, 'slug', v_ev.slug,
                                'event_start', v_ev.event_start, 'event_end', v_ev.event_end),
    'access', (select jsonb_build_object(
        'door_code', case when now() >= v_reveal then nullif(v.door_code, '') end,
        'has_door_code', coalesce(v.door_code, '') <> '',
        'reveal_at', v_reveal,
        'checkin_url', case when v_link.audience = 'volunteer' and now() >= v_checkin_reveal
                            then nullif(v_ev.checkin_url, '') end,
        'has_checkin_url', v_link.audience = 'volunteer' and coalesce(v_ev.checkin_url, '') <> '',
        'checkin_reveal_at', v_checkin_reveal)
      from (select 1) x left join venues v on v.id = v_ev.venue_id),
    'contacts', (
      select coalesce(jsonb_agg(jsonb_build_object('name', c.name, 'phone', c.phone, 'kind', c.kind)
                                order by c.sort_key, c.name), '[]'::jsonb)
      from (
        select distinct s.id, s.name, s.phone, 'general' as kind, 0 as sort_key
        from event_staff_volunteers e join staff_volunteers s on s.id = e.staff_id
        where v_link.audience = 'volunteer' and e.event_id = v_ev.id and e.in_charge
          and coalesce(s.phone, '') <> ''
        union all
        select s.id, s.name, s.phone, m.kind, m.sort_key
        from staff_volunteers s
        join (values
          ('pontus.lioh@gmail.com',           'artist',       'primary', 1),
          ('pontus.lioh@gmail.com',           'technician',   'primary', 1),
          ('pontus.lioh@gmail.com',           'stage_kitten', 'primary', 1),
          ('pontus.lioh@gmail.com',           'photographer', 'primary', 1),
          ('eva.leygonie@hotmail.fr',         'artist',       'backup',  2),
          ('eva.leygonie@hotmail.fr',         'technician',   'backup',  2),
          ('eva.leygonie@hotmail.fr',         'stage_kitten', 'backup',  2),
          ('eva.leygonie@hotmail.fr',         'photographer', 'primary', 1),
          ('eva.leygonie@hotmail.fr',         'volunteer',    'primary', 1),
          ('andrealuciajensen@gmail.com',     'volunteer',    'backup',  2)
        ) as m(email, audience, kind, sort_key)
          on lower(s.email) = m.email and m.audience = v_link.audience
        where coalesce(s.phone, '') <> ''
      ) c
    ),
    'venue', (select jsonb_build_object('name', v.name, 'location', v.location, 'map_link', v.map_link,
                'practical_info_sv', v.practical_info_sv, 'practical_info_eng', v.practical_info_eng)
              from venues v where v.id = v_ev.venue_id),
    'items', coalesce((select jsonb_agg(to_jsonb(i) - 'event_id' order by i.sort_order, i.created_at)
              from event_info_items i
              where i.event_id = v_ev.id
                and (cardinality(i.audiences) = 0 or v_link.audience = any(i.audiences))), '[]'::jsonb),
    'door_slots', case when v_link.audience = 'volunteer' then
      coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'slot_start', s.slot_start,
                'slot_end', s.slot_end, 'volunteer_name', s.volunteer_name)
                order by s.slot_start, s.created_at)
              from door_shift_slots s where s.event_id = v_ev.id), '[]'::jsonb) end,
    'door_people', case when v_link.audience = 'volunteer' then
      (select count(distinct e.staff_id) from event_staff_volunteers e
        where e.event_id = v_ev.id
          and (e.role = 'doorman' or (e.role = 'volunteer' and e.shift = 'guestlist'))) end
  );
end;
$function$;
