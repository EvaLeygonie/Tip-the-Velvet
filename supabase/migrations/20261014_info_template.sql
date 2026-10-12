-- Template for the info hub: the rows copied into every new event. Items remember which template
-- row they came from (template_key) so the admin can see when an event's text differs from it
-- and push a changed text back as the new template.
alter table public.event_info_items add column if not exists template_key text;

create table if not exists public.info_template_items (
  key text primary key,
  kind text not null,
  audiences text[] not null default '{}',
  sort_order integer not null default 0,
  time_text text,
  title_sv text,
  title_eng text,
  body_sv text,
  body_eng text,
  updated_at timestamptz not null default now()
);

alter table public.info_template_items enable row level security;

create policy "Authenticated full access to info template"
  on public.info_template_items for all to authenticated
  using (true) with check (true);
