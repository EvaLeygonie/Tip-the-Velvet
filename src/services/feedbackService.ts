import { supabase } from '@/lib/supabase'
import { DEFAULT_ASPECTS, MIN_RATINGS_PUBLIC, type CustomAspect } from '@/lib/feedbackAspects'

export interface FeedbackEvent {
  id: string
  title: string
  slug: string
  event_start: string | null
  // 'auto' opens at 23:00 on the event day; 'open' / 'closed' force it either way
  feedback_mode: FeedbackMode
  feedback_aspects: string[] | null
  // Worked out by the database (event_feedback_is_open / _opens_at), never on the client
  is_open: boolean
  opens_at: string | null
  // Custom categories that apply to this event: its own plus the templates
  custom_aspects: CustomAspect[]
}

export type FeedbackMode = 'auto' | 'open' | 'closed'

export interface FeedbackRow {
  id: string
  event_id: string
  // null for answers imported from a form that had no overall rating question
  rating: number | null
  aspect_ratings: Record<string, number>
  // The public review: the only text that can appear on the website (with may_quote + approval)
  review: string | null
  liked: string | null
  improve: string | null
  extra_comment: string | null
  // Topic tags from old tick-box questions (keys from feedbackAspects.ts); empty for new answers
  liked_aspects: string[] | null
  improve_aspects: string[] | null
  // Been to Tip the Velvet before? (null = not answered)
  been_before: 'yes' | 'no' | 'maybe' | null
  how_found: string | null
  // Free comment next to how they found us (which poster, group ...)
  how_found_note: string | null
  would_recommend: 'yes' | 'maybe' | 'no' | null
  // Why (not): the guest's free comment next to that answer
  would_recommend_note: string | null
  may_quote: boolean
  language: string | null
  source: string
  is_hidden: boolean
  is_quote_approved: boolean
  // Starred: one of the first (up to three) reviews shown on the event page
  is_featured: boolean
  is_actioned: boolean
  created_at: string
}

export interface FeedbackSummary {
  count: number
  min: number
  average?: number
  distribution?: Record<string, number>
  quotes?: string[]
  is_open: boolean
}

export interface FeedbackInput {
  rating: number
  aspects: Record<string, number>
  review: string
  liked: string
  improve: string
  extraComment: string
  beenBefore: string
  howFound: string
  howFoundNote: string
  wouldRecommend: string
  mayQuote: boolean
  language: string
}

// Always the live site, never window.location: the link goes into posts and QR codes that are made
// from wherever the admin happens to be running (including localhost).
export const feedbackLink = (slug: string): string =>
  `https://www.tipthevelvet.nu/events/event/${slug}/feedback`

// The categories an event shows. An event whose list was never changed gets the defaults plus any
// template categories; otherwise exactly what the board ticked.
export const aspectsForEvent = (
  event: Pick<FeedbackEvent, 'feedback_aspects' | 'custom_aspects'>
): string[] =>
  event.feedback_aspects ?? [
    ...DEFAULT_ASPECTS,
    ...(event.custom_aspects ?? []).filter((a) => a.in_template).map((a) => a.key),
  ]

// Public: the event behind a feedback link, with whether feedback is open right now. Only
// published and archived events come back, so a link can't be used to peek at drafts.
export const getFeedbackEventBySlug = async (slug: string): Promise<FeedbackEvent | null> => {
  const { data, error } = await supabase.rpc('get_feedback_event', { p_slug: slug })
  if (error) throw error
  return (data as unknown as FeedbackEvent | null) ?? null
}

export const getFeedbackSummary = async (eventId: string): Promise<FeedbackSummary> => {
  const { data, error } = await supabase.rpc('get_event_feedback_summary', {
    p_event_id: eventId,
    p_min: MIN_RATINGS_PUBLIC,
  })
  if (error) throw error
  return data as unknown as FeedbackSummary
}

// The approved public reviews of an event, a page at a time (newest first).
export interface PublicReviews {
  total: number
  reviews: { review: string; created_at: string }[]
}

export const getFeedbackReviews = async (
  eventId: string,
  limit: number,
  offset: number
): Promise<PublicReviews> => {
  const { data, error } = await supabase.rpc('get_event_feedback_reviews', {
    p_event_id: eventId,
    p_limit: limit,
    p_offset: offset,
  })
  if (error) throw error
  return data as unknown as PublicReviews
}

// Public average and number of ratings per event id, only for events with enough ratings.
export const getFeedbackAverages = async (): Promise<
  Record<string, { average: number; count: number }>
> => {
  const { data, error } = await supabase.rpc('get_event_feedback_averages', {
    p_min: MIN_RATINGS_PUBLIC,
  })
  if (error) throw error
  return Object.fromEntries(
    (data ?? []).map((row) => [row.event_id, { average: Number(row.average), count: row.count }])
  )
}

// One browser = one rating per event: a random id kept in localStorage. Sending again replaces
// the earlier answers (the database upserts on event + token).
const tokenKey = (eventId: string) => `ttv_feedback_${eventId}`

export const getVoterToken = (eventId: string): string => {
  try {
    const existing = localStorage.getItem(tokenKey(eventId))
    if (existing) return existing
    const fresh = crypto.randomUUID()
    localStorage.setItem(tokenKey(eventId), fresh)
    return fresh
  } catch {
    // storage blocked: a throwaway id still lets this one visit submit
    return crypto.randomUUID()
  }
}

export const submitFeedback = async (eventId: string, input: FeedbackInput): Promise<void> => {
  const { error } = await supabase.rpc('submit_event_feedback', {
    p_event_id: eventId,
    p_token: getVoterToken(eventId),
    p_rating: input.rating,
    p_aspects: input.aspects,
    p_review: input.review,
    p_liked: input.liked,
    p_improve: input.improve,
    p_extra_comment: input.extraComment,
    p_been_before: input.beenBefore || undefined,
    p_how_found: input.howFound,
    p_how_found_note: input.howFoundNote,
    p_would_recommend: input.wouldRecommend || undefined,
    p_may_quote: input.mayQuote,
    p_language: input.language,
  })
  if (error) throw error
}

// --- Admin ---

export const getFeedbackSettings = async (eventId: string): Promise<FeedbackEvent> => {
  const [event, open, opensAt, customs] = await Promise.all([
    supabase
      .from('events')
      .select('id, title, slug, event_start, feedback_mode, feedback_aspects')
      .eq('id', eventId)
      .single(),
    supabase.rpc('event_feedback_is_open', { p_event_id: eventId }),
    supabase.rpc('event_feedback_opens_at', { p_event_id: eventId }),
    listCustomAspects(eventId),
  ])
  if (event.error) throw event.error
  if (open.error) throw open.error
  if (opensAt.error) throw opensAt.error
  return {
    ...event.data,
    feedback_mode: event.data.feedback_mode as FeedbackMode,
    is_open: open.data === true,
    opens_at: opensAt.data,
    custom_aspects: customs,
  }
}

// --- Custom categories ---

// The active custom categories that apply to an event: its own plus the templates.
export const listCustomAspects = async (eventId: string): Promise<CustomAspect[]> => {
  const { data, error } = await supabase
    .from('feedback_custom_aspects')
    .select('key, label_sv, label_eng, event_id, in_template')
    .eq('is_archived', false)
    .or(`event_id.eq.${eventId},in_template.eq.true`)
    .order('created_at')
  if (error) throw error
  return data ?? []
}

// Every custom category ever made, removed ones included, so old ratings keep their labels.
export const listAllCustomAspects = async (): Promise<CustomAspect[]> => {
  const { data, error } = await supabase
    .from('feedback_custom_aspects')
    .select('key, label_sv, label_eng, event_id, in_template')
  if (error) throw error
  return data ?? []
}

// scope 'event' = only for that event, 'template' = offered on every event
export const createCustomAspect = async (input: {
  labelSv: string
  labelEng: string
  scope: 'event' | 'template'
  eventId: string
}): Promise<CustomAspect> => {
  const row = {
    key: `custom-${crypto.randomUUID().slice(0, 8)}`,
    label_sv: input.labelSv.trim(),
    label_eng: input.labelEng.trim() || input.labelSv.trim(),
    event_id: input.scope === 'event' ? input.eventId : null,
    in_template: input.scope === 'template',
  }
  const { error } = await supabase.from('feedback_custom_aspects').insert(row)
  if (error) throw error
  return row
}

// "Removing" a custom category archives it: it disappears from forms and lists, but the labels of
// ratings already given stay readable.
export const archiveCustomAspect = async (key: string): Promise<void> => {
  const { error } = await supabase
    .from('feedback_custom_aspects')
    .update({ is_archived: true })
    .eq('key', key)
  if (error) throw error
}

// Takes a category off every event that has not happened yet (this one included). Events whose list
// was never changed get their effective list written out first, minus the category.
export const removeAspectFromUpcomingEvents = async (
  key: string,
  templateKeys: string[]
): Promise<void> => {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const { data, error } = await supabase
    .from('events')
    .select('id, feedback_aspects')
    .gte('event_start', startOfToday.toISOString())
  if (error) throw error
  await Promise.all(
    (data ?? []).map(async (event) => {
      const list = event.feedback_aspects ?? [...DEFAULT_ASPECTS, ...templateKeys]
      if (!list.includes(key)) return
      await updateFeedbackSettings(event.id, { feedback_aspects: list.filter((k) => k !== key) })
    })
  )
}

export const updateFeedbackSettings = async (
  eventId: string,
  patch: { feedback_mode?: FeedbackMode; feedback_aspects?: string[] | null }
): Promise<void> => {
  const { error } = await supabase.from('events').update(patch).eq('id', eventId)
  if (error) throw error
}

export const listFeedback = async (eventId: string): Promise<FeedbackRow[]> => {
  const { data, error } = await supabase
    .from('event_feedback')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as FeedbackRow[]
}

export const updateFeedback = async (
  id: string,
  patch: Partial<
    Pick<
      FeedbackRow,
      'is_hidden' | 'is_quote_approved' | 'is_actioned' | 'is_featured' | 'review' | 'may_quote'
    >
  >
): Promise<void> => {
  const { error } = await supabase.from('event_feedback').update(patch).eq('id', id)
  if (error) throw error
}

export const deleteFeedback = async (id: string): Promise<void> => {
  const { error } = await supabase.from('event_feedback').delete().eq('id', id)
  if (error) throw error
}

// Average rating per event, for the "across events" comparison on the admin page.
export interface EventRatingRow {
  event_id: string
  rating: number
}

export const listAllRatings = async (): Promise<EventRatingRow[]> => {
  const { data, error } = await supabase
    .from('event_feedback')
    .select('event_id, rating')
    .eq('is_hidden', false)
    .not('rating', 'is', null)
  if (error) throw error
  return (data ?? []) as EventRatingRow[]
}

// The newest answers from the site's own feedback page (not the imported ones), for the Dashboard's
// "New ratings & reviews". Imports are left out on purpose: they were all added on one day.
export interface RecentFeedback {
  id: string
  event_id: string
  rating: number | null
  review: string | null
  created_at: string
  events: { title: string } | null
}

export const getRecentFeedback = async (days = 7, limit = 8): Promise<RecentFeedback[]> => {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('event_feedback')
    .select('id, event_id, rating, review, created_at, events(title)')
    .eq('source', 'site')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as unknown as RecentFeedback[]
}
