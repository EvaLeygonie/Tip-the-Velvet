// The "rate each part of the evening" rows on the feedback form. Which of these a given event
// shows is chosen on /admin/feedback (events.feedback_aspects); null there means DEFAULT_ASPECTS.
// Taken from the Google "Enkät" forms the board used before.
export interface FeedbackAspect {
  key: string
  sv: string
  eng: string
}

export const FEEDBACK_ASPECTS: FeedbackAspect[] = [
  { key: 'theme', sv: 'Tema', eng: 'Theme' },
  { key: 'show', sv: 'Showen', eng: 'The show' },
  { key: 'costume_competition', sv: 'Dräkttävling', eng: 'Costume competition' },
  { key: 'photo_booth', sv: 'Fotohörna', eng: 'Photo booth' },
  { key: 'info_before', sv: 'Information innan festen', eng: 'Information before the party' },
  { key: 'info_during', sv: 'Information under festen', eng: 'Information during the party' },
  { key: 'tickets', sv: 'Biljettalternativ', eng: 'Ticket options' },
  { key: 'shopping', sv: 'Sponsorer', eng: 'Sponsors' },
  { key: 'entrance', sv: 'Underhållning', eng: 'Entertainment' },
  { key: 'venue', sv: 'Lokalen', eng: 'The venue' },
  { key: 'music', sv: 'Musik / dansgolv', eng: 'Music / dancefloor' },
]

// Ticked by default for an event whose list the board hasn't changed (the rest are one tick away on
// /admin/feedback). Template categories the board has added are ticked by default too.
export const DEFAULT_ASPECTS = [
  'theme',
  'show',
  'costume_competition',
  'photo_booth',
  'info_before',
]

// A category the board has added on /admin/feedback: for one event only, or as a template offered
// on every event (see docs/event-feedback-custom-aspects.sql).
export interface CustomAspect {
  key: string
  label_sv: string
  label_eng: string
  event_id: string | null
  in_template: boolean
}

// Looks a key up among the built-in categories first, then the custom ones.
export const resolveAspect = (
  key: string,
  customs: Pick<CustomAspect, 'key' | 'label_sv' | 'label_eng'>[] = []
): FeedbackAspect | undefined => {
  const builtIn = FEEDBACK_ASPECTS.find((a) => a.key === key)
  if (builtIn) return builtIn
  const custom = customs.find((a) => a.key === key)
  return custom ? { key, sv: custom.label_sv, eng: custom.label_eng } : undefined
}

export const HOW_FOUND_OPTIONS: { key: string; sv: string; eng: string }[] = [
  { key: 'friends', sv: 'Vänner / familj', eng: 'Friends / family' },
  { key: 'facebook', sv: 'Facebook', eng: 'Facebook' },
  { key: 'instagram', sv: 'Instagram', eng: 'Instagram' },
  { key: 'artists', sv: 'Genom artisterna', eng: 'From the artists' },
  { key: 'newsletter', sv: 'Nyhetsbrevet', eng: 'The newsletter' },
  { key: 'poster', sv: 'Affisch / flyer', eng: 'Poster / flyer' },
  { key: 'returning', sv: 'Jag har varit förut', eng: "I've been before" },
  { key: 'other', sv: 'Annat', eng: 'Other' },
]

// Minimum number of guests before the public average is shown (also enforced in the database).
export const MIN_RATINGS_PUBLIC = 5
