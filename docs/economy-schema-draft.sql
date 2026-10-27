-- DRAFT. Not run, and nothing in the app uses it yet. Read it through, change what you disagree
-- with, then run it in the Supabase SQL editor when the economy work starts. Safe to run again.
-- Afterwards regenerate src/types/database.types.ts.
--
-- Why: the database has no place for what a show cost, what it earned, how each ticket type sold,
-- or whether a person has actually been paid. This adds those places, and nothing else.
-- Context and sources: the "Drive Review & Retroactive Data Plan" and "To Do Next" docs, and
-- docs/ticket-sales.md. Ready-to-load numbers: docs/imports/budget-lines.csv,
-- budget-ticket-scenarios.csv and ticket-types-sold.csv (counts only, no personal data). Tickets
-- sold per day stay in the Drive sheet "Biljettförsäljning - överblick", not in the database.
--
-- Rules the design follows:
--   * Every money amount is SEK, whole kronor or two decimals, and says whether VAT is included.
--   * Anything that is a plan carries a status, so a planned fee is never mistaken for a paid one.
--   * Ticket revenue is always computed from ticket_types, never typed in a second place.
--   * event_id is null on a row that belongs to the association rather than one show.
--   * Admin-only, like the rest of the board tools (any logged-in board member has full access).

-- 1. Ticket types per event (early bird, regular, support, ...) -------------------------------
create table if not exists public.ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  -- early_bird | regular | support | vip | door | complimentary
  kind text not null,
  label text,
  price_sek numeric(10,2),
  capacity integer,
  sold integer not null default 0,
  -- online | door | complimentary
  channel text not null default 'online',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (event_id, kind, channel)
);

-- 2. Planned budget lines, one row per cost with the three scenarios the sheets use -------------
create table if not exists public.event_budget_lines (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  -- venue | artists | photographer | doorman | technician | dj | food | marketing | decorations |
  -- stage | early_bird | taxi | board | other
  category text not null,
  label text,
  min_sek numeric(10,2),
  max_sek numeric(10,2),
  preferred_sek numeric(10,2),
  vat_included boolean,
  note text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- 2b. Planned ticket price and attendance (low, mid, high), so break-even can be read off the plan
create table if not exists public.event_budget_scenarios (
  event_id uuid not null references public.events(id) on delete cascade,
  -- low | mid | high
  scenario text not null,
  price_sek numeric(10,2) not null,
  tickets integer not null,
  primary key (event_id, scenario)
);

-- 3. What was actually spent ------------------------------------------------------------------
create table if not exists public.event_expenses (
  id uuid primary key default gen_random_uuid(),
  -- null = an association cost that belongs to no single show (bank, accountant, insurance)
  event_id uuid references public.events(id) on delete cascade,
  spent_on date,
  -- same list as event_budget_lines.category, plus: ticket_fees | travel | accommodation | prizes |
  -- print | brunch | membership | other
  category text not null,
  label text not null,
  amount_sek numeric(10,2) not null,
  vat_sek numeric(10,2),
  -- who or what was paid (a company or a role, not a private person's details)
  counterparty text,
  -- the board member who laid out the money, and whether they have been repaid
  paid_by text,
  reimbursed boolean not null default false,
  -- planned | agreed | invoiced | paid
  status text not null default 'paid',
  -- storage path of the receipt or invoice, or a link to the Drive file
  receipt_path text,
  source_url text,
  note text,
  created_at timestamptz not null default now()
);

-- 4. Money that came in other than through ticket types ---------------------------------------
create table if not exists public.event_income (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  received_on date,
  -- ticket_payout | bar_share | sponsor | vendor_table | external_job | donation | other
  category text not null,
  label text not null,
  amount_sek numeric(10,2) not null,
  vat_sek numeric(10,2),
  status text not null default 'paid',
  source_url text,
  note text,
  created_at timestamptz not null default now()
);

-- 5. Has a person actually been paid? ---------------------------------------------------------
alter table public.event_performers
  -- placeholder (the 999 kr rows) | planned | agreed | invoiced | paid
  add column if not exists fee_status text not null default 'planned',
  add column if not exists paid_on date,
  -- invoice | private_999 | frilansfinans | other
  add column if not exists payment_method text,
  add column if not exists paid_amount_sek numeric(10,2);

alter table public.event_staff_volunteers
  add column if not exists fee_status text not null default 'planned',
  add column if not exists paid_on date,
  add column if not exists payment_method text,
  add column if not exists paid_amount_sek numeric(10,2);

-- 6. How the night went -----------------------------------------------------------------------
alter table public.events
  add column if not exists attendance integer,
  -- tickets needed to cover the costs, so "short by 15" is a number on the page
  add column if not exists break_even_tickets integer,
  add column if not exists after_show_notes text;

-- 7. Yearly results from the annual reports (association level) ---------------------------------
create table if not exists public.association_year_results (
  year integer primary key,
  net_turnover_sek numeric(12,2),
  result_sek numeric(12,2),
  equity_sek numeric(12,2),
  source_url text,
  note text
);

-- Admin-only access on every new table
do $$
declare t text;
begin
  foreach t in array array[
    'ticket_types', 'event_budget_lines', 'event_budget_scenarios', 'event_expenses',
    'event_income', 'association_year_results'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "Admins full access %s" on public.%I', t, t);
    execute format(
      'create policy "Admins full access %s" on public.%I for all to authenticated using (true) with check (true)',
      t, t
    );
  end loop;
end $$;

create index if not exists event_expenses_event_idx on public.event_expenses (event_id, spent_on);
create index if not exists event_income_event_idx on public.event_income (event_id, received_on);
create index if not exists event_budget_lines_event_idx on public.event_budget_lines (event_id);

-- Optional, run after the draft above and only once you are happy with it:
-- mark the 999 kr placeholders on the four past shows so nobody reads them as real fees.
-- update public.event_performers ep set fee_status = 'placeholder'
--   from public.events e
--  where e.id = ep.event_id and ep.final_fee = 999 and e.event_start < '2026-10-01';
