-- Run once in the Supabase SQL editor BEFORE using the new "show door shifts" toggle on the
-- Info & links page.
-- 1) a flag on events: is door shift booking open on the volunteer link? (off by default)
-- 2) get_event_info also returns it, patched in place from its current definition
alter table public.events add column if not exists door_signup_open boolean not null default false;

do $$
declare
  d text;
  patched text;
begin
  d := pg_get_functiondef('public.get_event_info(uuid)'::regprocedure);
  patched := replace(
    d,
    '''audience'', v_link.audience,',
    '''audience'', v_link.audience, ''door_signup_open'', coalesce(v_ev.door_signup_open, false),'
  );
  if patched = d then
    raise exception 'get_event_info did not change - check its definition by hand';
  end if;
  execute patched;
end $$;
