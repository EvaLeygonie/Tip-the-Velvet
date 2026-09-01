import type { VipEntryCategory, StaffVolunteerType } from '@/types/types'

// The 4 standing organizers — a fixed, rarely-changing set of real people, not worth a
// table for (confirmed against the org's own real VIP list sheets, which list the same 4
// people/emails every time). Shared between the VIP & Mat tab and the progress overview's
// VIP count.
export const STANDING_ORGANIZERS: { name: string; email: string }[] = [
  { name: 'Andrea Jensen', email: 'andrealuciajensen@gmail.com' },
  { name: 'Krister Johansson', email: 'lillqrill@gmail.com' },
  { name: 'Eva Leygonie', email: 'eva.leygonie@hotmail.fr' },
  { name: 'Pontus Lindhé', email: 'pontus.lioh@gmail.com' },
]

export const VIP_CATEGORY_ORDER: VipEntryCategory[] = ['ticket_winner', 'contest_winner', 'other']

// Always exactly 4 prize sponsors per event — one per the competition's 4 winning
// categories.
export const PRIZE_SLOT_COUNT = 4

// The 3 roles that historically need exactly one person, per the org's real event
// checklist and admin-portal-roadmap.md's 2026-08-19 decision — no stored requirement
// system, just a computed presence check.
export const FIXED_STAFF_ROLES: StaffVolunteerType[] = ['photographer', 'technician', 'doorman']
