# Event-day script & checklist page

Written 2026-10-26. **Not built yet.** A page for the day of the show that says what needs doing, by
whom and at what time, so nothing depends on someone remembering. Built from how Pandaemonium and
the costume competition actually ran.

## The idea

A page in the event-scoped admin (e.g. `/admin/event-day`, or a tab in Event Plan), per event:

- A **timeline of tasks**, each with an optional time, an owner (a role or a named person), and a tick.
- Tasks come from a **standard template** (like `print_standard_items`): every event starts with the same
  script, the board edits it for one event only, and ticked state resets for the next show.
- **Time-aware:** the page highlights what is due now and what is overdue, and shows the next three
  tasks large, so it works as a phone/iPad screen in the middle of the evening.
- Tasks can link to the thing they need (the QR code download, the costume page, the VIP list, the
  door shifts), so "put out the review QR codes" is one tap from the file to print.
- Fits the CLAUDE.md goal: a due-time warning beats another manual toggle.

## Standard script (first draft, from this event)

Times are relative to doors (19:00); the page stores them as offsets from the event's start so they move
with the event. Show: Act 1 21:00–22:00, break 22:00–22:30, Act 2 22:30–23:30.

| When | Task | Who |
| --- | --- | --- |
| Setup (afternoon) | Put up decor, signs, photo corner, contest table with the iPad, door table | Setup crew |
| Setup | Everything from the "To print" list is printed and in the bag | Board |
| Before doors | Door has the VIP list, door shifts and guard number | Door |
| Before doors | iPad charged, logged in, the costume registration page open | Contest volunteers |
| 19:00 | Doors open; costume sign-up starts | Door / contest |
| 19:00–20:45 | Costume registration (see roles below) | Contest volunteers |
| 20:45 | Registration closes; contestants' photos and numbers complete | Contest volunteers |
| ~21:00 | Act 1 | |
| After Act 1 (22:00) | Board announces the competition and calls out everyone on the list | Board |
| After Act 1 | Contest volunteers set up the voting QR codes (walls, tables) while the announcement runs | Contest volunteers |
| Break | Board deliberates privately on the iPad (the jury page with all contestants) | Board |
| During Act 2 | Voting open; the live result page updates | |
| End of Act 2 (~23:30) | Close voting; announce winners from the results page on the stage | Board |
| After the show (~23:00 onwards) | Put the review QR codes on walls and tables; announce the review page and that the link also goes out on social media within a few days | Contest volunteers |
| 23:00 | Feedback opens by itself (see `event-feedback-auto-open.sql`) | Automatic |
| Close | Takedown: everything that was put up comes down | Takedown crew (ideally some of the setup crew) |
| After | Thank-you and evaluation posts, payouts, expenses | Board |

## Volunteer roles and numbers

Each role has a **minimum**; the page warns when a role is under it for the event.

- **Setup: at least 6.** **Takedown** is its own volunteer category (shorter, after the show). They are
  two separate roles and anyone can be added to either; people won't always manage both (setup from
  13:00, takedown until about 02:30). The page can show who is on both, and when staffing it the board
  asks the setup volunteers whether they can stay for takedown too. That is a request, not a rule, and
  the page doesn't enforce it.
- **Door: at least 4,** two hours each (the door-shift system already exists).
- **Costume competition: 2 (new volunteer category).** Details in `costume-competition.md`.

### Roles in the database vs. the "Join us" form

Two different things, kept apart:

- **Join us form (public):** a person signs up as a plain *volunteer*. What changes is the help text
  next to the form (the "We're looking for" box already lists setup, door, backstage & stage and
  takedown; it should be rewritten to describe each role and add the costume competition) and a
  **second dropdown, shown when "volunteer" is chosen, where they pick one or more roles they are
  interested in** (setup, door, backstage & stage, costume competition, takedown, anything). Stored
  as their interests on the volunteer, e.g. a `role_interests text[]` column on `staff_volunteers`.
  The existing one-role-per-person rule (`unique_volunteer_role`) doesn't get in the way, since
  interests are not roles.
- **Event staffing (admin):** the board assigns people to a specific event with a role from the
  `staff_volunteer_type` list (the roles you see on the event staffing and contacts pages). Setup,
  takedown and costume competition need to be added to that list so they can be assigned and counted
  against the minimums above. The people who ticked an interest show up as suggestions when staffing
  that role.

## Suggested data model (schema via `docs/event-day.sql`)

- `event_day_standard_items`: `id`, `label`, `offset_minutes int null` (from event start; null = no time),
  `phase text` (setup / doors / show / after), `owner_role text null`, `link_to text null`
  (a route or doc id), `sort_order`.
- `event_day_items`: per event, like `event_print_items`: `event_id`, `standard_id` (state of a standard row)
  or custom `label`/`offset_minutes`/`owner`, `done bool`, `done_at`, `hidden bool`.
- A new event has no rows, so it starts unticked.

## Build order

1. Tables + a read-only timeline from the standard list (copy the "To print" card pattern).
2. Ticking, per-event custom rows and hiding, "due now / overdue" highlighting.
3. Role minimums warning using the staffing data.
4. Links from tasks to the QR downloads, the costume page and the VIP list.
5. Dashboard card: "Today: next three tasks" on the event day.
