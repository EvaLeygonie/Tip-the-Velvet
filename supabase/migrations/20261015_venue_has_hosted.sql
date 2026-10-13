-- Marks venues where Tip the Velvet has already held a party, so a long list of potential venues
-- can include ones we haven't been to yet (filterable on the Contacts → Venues tab).
alter table public.venues add column if not exists has_hosted boolean not null default false;
