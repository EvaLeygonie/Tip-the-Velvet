-- Keeps the casting row's travel offer in step with the final reimbursement once the artist
-- (or the board, on the artist page) has settled it, and remembers the original estimate.

alter table public.casting_applications add column if not exists original_travel_estimate numeric;

-- One-off: for confirmed artists with travel, copy the final amount into the offer and keep the
-- old offer as the estimate.
update public.casting_applications ca
set original_travel_estimate = coalesce(ca.original_travel_estimate, ca.travel_cost_amount),
    travel_cost_amount = ep.travel_covered
from public.event_performers ep
where ep.performer_id = ca.performer_id
  and ep.event_id = ca.event_id
  and ca.needs_travel_costs
  and ca.booking_status = 'confirmed'
  and coalesce(ep.travel_covered, 0) > 0;

-- From now on, whenever the final amount changes, the offer follows.
create or replace function public.sync_travel_offer_from_final()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.travel_covered is distinct from old.travel_covered and coalesce(new.travel_covered, 0) > 0 then
    update public.casting_applications ca
    set original_travel_estimate = coalesce(ca.original_travel_estimate, ca.travel_cost_amount),
        travel_cost_amount = new.travel_covered
    where ca.performer_id = new.performer_id
      and ca.event_id = new.event_id
      and ca.needs_travel_costs
      and ca.booking_status = 'confirmed';
  end if;
  return new;
end;
$$;

drop trigger if exists sync_travel_offer_from_final_trg on public.event_performers;
create trigger sync_travel_offer_from_final_trg
  after update of travel_covered on public.event_performers
  for each row execute function public.sync_travel_offer_from_final();
