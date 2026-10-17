-- Run once in the Supabase SQL editor BEFORE using the new "nearest stop" field.
-- 1) a dedicated nearest-stop column on venues
-- 2) get_event_info (the info-page function) also returns it, patched in place from its current
--    definition so nothing else in the function changes
-- 3) Auktionsverket: fill in the stop and take the address / tram lines out of the note text

alter table public.venues add column if not exists nearest_stop text;

do $$
declare
  d text;
  patched text;
begin
  d := pg_get_functiondef('public.get_event_info(uuid)'::regprocedure);
  patched := replace(
    d,
    '''practical_info_sv'', v.practical_info_sv,',
    '''nearest_stop'', v.nearest_stop, ''practical_info_sv'', v.practical_info_sv,'
  );
  if patched = d then
    raise exception 'get_event_info did not change - check its definition by hand';
  end if;
  execute patched;
end $$;

update public.venues set
  nearest_stop = 'Järntorget',
  practical_info_sv = nullif(trim(both E'\n ' from regexp_replace(
    practical_info_sv, '^(Adress:|Närmaste spårvagnshållplats|\s*---+\s*$).*\n?', '', 'gn')), ''),
  practical_info_eng = nullif(trim(both E'\n ' from regexp_replace(
    practical_info_eng, '^(Address:|The nearest tram stop|\s*---+\s*$).*\n?', '', 'gn')), '')
where id = 'bb5d8af3-61e7-4cb7-8c4b-b381881768ca';
