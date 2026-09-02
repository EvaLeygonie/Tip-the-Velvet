import type {
  StaffVolunteerType,
  SponsorType,
  VipEntryCategory,
  DietaryCategory,
  VolunteerShift,
} from '@/types/types'

type Translate = (sv: string, en: string) => string

export const staffRoleLabel = (t: Translate, role: StaffVolunteerType): string => {
  switch (role) {
    case 'photographer':
      return t('Fotograf', 'Photographer')
    case 'technician':
      return t('Tekniker', 'Technician')
    case 'dj':
      return t('DJ', 'DJ')
    case 'stage_kitten':
      return t('Stage kitten', 'Stage kitten')
    case 'entertainment':
      return t('Underhållning', 'Entertainment')
    case 'volunteer':
      return t('Volontär', 'Volunteer')
    case 'doorman':
      // Kept as 'doorman' at the DB level deliberately — see admin-portal-roadmap.md's
      // staffing redesign — the value is left free in case a paid security-guard role is
      // needed again later, but the current role is unpaid/optional door duty.
      return t('Entrévärd', 'Entrance host')
    case 'other':
      return t('Övrigt', 'Other')
  }
}

export const sponsorTypeLabel = (t: Translate, type: SponsorType): string => {
  switch (type) {
    case 'prize':
      return t('Pris', 'Prize')
    case 'creation':
      return t('Skapande', 'Creation')
    case 'sales':
      return t('Försäljning', 'Sales')
    case 'promo':
      return t('Marknadsföring', 'Promo')
    case 'partner':
      return t('Partner', 'Partner')
    case 'other':
      return t('Övrigt', 'Other')
  }
}

export const vipCategoryLabel = (t: Translate, category: VipEntryCategory): string => {
  switch (category) {
    case 'ticket_winner':
      return t('Biljettvinnare', 'Ticket winner')
    case 'contest_winner':
      return t('Tävlingsvinnare', 'Contest winner')
    case 'other':
      return t('Övrigt', 'Other')
  }
}

export const dietaryCategoryLabel = (t: Translate, category: DietaryCategory): string => {
  switch (category) {
    case 'all_eater':
      return t('Allätare', 'Eats everything')
    case 'vegetarian':
      return t('Vegetarian', 'Vegetarian')
    case 'vegan':
      return t('Vegan', 'Vegan')
  }
}

// sv/en pairs per the board's own real shift order for running a show — replaces the old
// free-text SHIFT_PRESETS prose once shift became a real field instead of a role_details
// prefill suggestion.
export const volunteerShiftLabel = (t: Translate, shift: VolunteerShift): string => {
  switch (shift) {
    case 'driving':
      return t('Transport', 'Driving')
    case 'setup':
      return t('Setup', 'Setup')
    case 'guestlist':
      return t('Gästlista', 'Guestlist')
    case 'takedown':
      return t('Städ', 'Takedown')
  }
}
