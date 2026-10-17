-- Run once in the Supabase SQL editor. Makes get_event_info also return which shift each
-- general (volunteer marked "in charge") is in charge of, so the volunteer info page can show
-- each general's number inside their own shift section. Patched in place from the current
-- definition; nothing else in the function changes.
do $$
declare
  d text;
  patched text;
begin
  d := pg_get_functiondef('public.get_event_info(uuid)'::regprocedure);
  patched := d;
  patched := replace(patched,
    '''general'' as kind, 0 as sort_key',
    '''general'' as kind, 0 as sort_key, e.shift::text as shift');
  patched := replace(patched,
    'select s.id, s.name, s.phone, m.kind, m.sort_key',
    'select s.id, s.name, s.phone, m.kind, m.sort_key, null::text as shift');
  patched := replace(patched,
    '''kind'', c.kind)',
    '''kind'', c.kind, ''shift'', c.shift)');
  if patched = d or position('e.shift::text as shift' in patched) = 0
     or position('null::text as shift' in patched) = 0
     or position('''shift'', c.shift' in patched) = 0 then
    raise exception 'get_event_info did not patch cleanly - check its definition by hand';
  end if;
  execute patched;
end $$;
