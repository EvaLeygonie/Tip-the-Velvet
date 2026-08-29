import { supabase } from '@/lib/supabase'

// Matches marketing_post_type's DB values (minus 'custom') — the board's real posting
// calendar, see src/lib/marketingSchedule.ts for labels/suggested dates/template mapping.
export type FixedMarketingPostType =
  | 'save_the_date'
  | 'facebook_event'
  | 'casting_call_open'
  | 'casting_call_closed'
  | 'ticket_countdown'
  | 'ticket_release'
  | 'pinterest_board'
  | 'volunteers_needed'
  | 'artists_soon'
  | 'artists_all_together'
  | 'sponsors_sales_table'
  | 'contest'
  | 'photo_corner'
  | 'venue_rules'
  | 'evening_schedule'
  | 'one_week_left'
  | 'share_like_invite'
  | 'evening_schedule_reminder'
  | 'lets_go'
  | 'thank_you'
  | 'evaluation'

export interface FixedMarketingPost {
  isPosted: boolean
  // The edited/generated text last saved for this post, for this event — null until the
  // board opens the row and saves it. Falls back to the live template output (computed
  // from current event data) whenever this is null, so there's nothing to seed on event
  // creation.
  content: string | null
  // A manual override for the row's date — null until the board picks one, at which point
  // it wins over the computed suggested date (POST_SCHEDULE's offset from event_start).
  postDate: string | null
}

const EMPTY_FIXED_POST: FixedMarketingPost = { isPosted: false, content: null, postDate: null }

// Artist-level "has this been posted" deliberately isn't tracked here — it's already
// event_performers.is_revealed/reveal_date (the reveal *is* the social post, per how that
// flow was designed). This only covers the handful of fixed, event-level posts every show
// needs, plus (later) custom/unrelated ones — see marketing_post_type's 'custom' value.
export const getMarketingPosts = async (
  eventId: string
): Promise<Record<FixedMarketingPostType, FixedMarketingPost>> => {
  const { data, error } = await supabase
    .from('marketing_posts')
    .select('post_type, is_posted, content, post_date')
    .eq('event_id', eventId)
    .neq('post_type', 'custom')

  if (error) throw error

  const map: Record<FixedMarketingPostType, FixedMarketingPost> = {
    save_the_date: { ...EMPTY_FIXED_POST },
    facebook_event: { ...EMPTY_FIXED_POST },
    casting_call_open: { ...EMPTY_FIXED_POST },
    casting_call_closed: { ...EMPTY_FIXED_POST },
    ticket_countdown: { ...EMPTY_FIXED_POST },
    ticket_release: { ...EMPTY_FIXED_POST },
    pinterest_board: { ...EMPTY_FIXED_POST },
    volunteers_needed: { ...EMPTY_FIXED_POST },
    artists_soon: { ...EMPTY_FIXED_POST },
    artists_all_together: { ...EMPTY_FIXED_POST },
    sponsors_sales_table: { ...EMPTY_FIXED_POST },
    contest: { ...EMPTY_FIXED_POST },
    photo_corner: { ...EMPTY_FIXED_POST },
    venue_rules: { ...EMPTY_FIXED_POST },
    evening_schedule: { ...EMPTY_FIXED_POST },
    one_week_left: { ...EMPTY_FIXED_POST },
    share_like_invite: { ...EMPTY_FIXED_POST },
    evening_schedule_reminder: { ...EMPTY_FIXED_POST },
    lets_go: { ...EMPTY_FIXED_POST },
    thank_you: { ...EMPTY_FIXED_POST },
    evaluation: { ...EMPTY_FIXED_POST },
  }
  for (const row of data || []) {
    map[row.post_type as FixedMarketingPostType] = {
      isPosted: row.is_posted,
      content: row.content,
      postDate: row.post_date,
    }
  }
  return map
}

// Manual read-then-write rather than .upsert()'s onConflict shorthand — the uniqueness
// guarantee here is a *partial* index (WHERE post_type != 'custom', so future custom posts
// can repeat), and PostgREST's generated ON CONFLICT clause can only target a full
// constraint, not a partial one (fails with 42P10 "no unique or exclusion constraint
// matching the ON CONFLICT specification"). One row per fixed post type per event, created
// on first toggle/save rather than pre-seeded at event creation.
const findFixedPostRow = async (
  eventId: string,
  postType: FixedMarketingPostType
): Promise<{ id: string } | null> => {
  const { data, error } = await supabase
    .from('marketing_posts')
    .select('id')
    .eq('event_id', eventId)
    .eq('post_type', postType)
    .maybeSingle()
  if (error) throw error
  return data
}

export const setMarketingPostStatus = async (
  eventId: string,
  postType: FixedMarketingPostType,
  isPosted: boolean
): Promise<void> => {
  const posted_at = isPosted ? new Date().toISOString() : null
  const existing = await findFixedPostRow(eventId, postType)

  if (existing) {
    const { error } = await supabase
      .from('marketing_posts')
      .update({ is_posted: isPosted, posted_at })
      .eq('id', existing.id)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('marketing_posts')
      .insert({ event_id: eventId, post_type: postType, is_posted: isPosted, posted_at })
    if (error) throw error
  }
}

// Saves the exact text the board edited/used for this post, for the record — independent
// of is_posted so drafting the text and checking it off can happen in either order.
export const saveMarketingPostContent = async (
  eventId: string,
  postType: FixedMarketingPostType,
  content: string
): Promise<void> => {
  const existing = await findFixedPostRow(eventId, postType)

  if (existing) {
    const { error } = await supabase.from('marketing_posts').update({ content }).eq('id', existing.id)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('marketing_posts')
      .insert({ event_id: eventId, post_type: postType, content, is_posted: false })
    if (error) throw error
  }
}

// Overrides the row's computed suggested date. `postDate: null` clears the override —
// the row falls back to POST_SCHEDULE's computed date again.
export const setMarketingPostDate = async (
  eventId: string,
  postType: FixedMarketingPostType,
  postDate: string | null
): Promise<void> => {
  const existing = await findFixedPostRow(eventId, postType)

  if (existing) {
    const { error } = await supabase
      .from('marketing_posts')
      .update({ post_date: postDate })
      .eq('id', existing.id)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('marketing_posts')
      .insert({ event_id: eventId, post_type: postType, post_date: postDate, is_posted: false })
    if (error) throw error
  }
}

//=== CUSTOM POSTS ===///
// One-off, per-event posts outside the fixed 21-item schedule — post_type is always
// 'custom' here, so unlike the fixed types above these are keyed on their own `id`, not
// `(event_id, post_type)` (the partial unique index deliberately excludes 'custom' so many
// can coexist per event).

export interface CustomMarketingPost {
  id: string
  title: string
  postDate: string | null
  content: string
  isPosted: boolean
}

export const getCustomPosts = async (eventId: string): Promise<CustomMarketingPost[]> => {
  const { data, error } = await supabase
    .from('marketing_posts')
    .select('id, title, post_date, content, is_posted')
    .eq('event_id', eventId)
    .eq('post_type', 'custom')
    .order('post_date', { ascending: true, nullsFirst: false })

  if (error) throw error

  return (data || []).map((row) => ({
    id: row.id,
    title: row.title ?? '',
    postDate: row.post_date,
    content: row.content ?? '',
    isPosted: row.is_posted,
  }))
}

export const createCustomPost = async (
  eventId: string,
  title: string,
  postDate: string | null,
  content: string
): Promise<CustomMarketingPost> => {
  const { data, error } = await supabase
    .from('marketing_posts')
    .insert({ event_id: eventId, post_type: 'custom', title, post_date: postDate, content })
    .select('id, title, post_date, content, is_posted')
    .single()

  if (error) throw error

  return {
    id: data.id,
    title: data.title ?? '',
    postDate: data.post_date,
    content: data.content ?? '',
    isPosted: data.is_posted,
  }
}

export const updateCustomPost = async (
  id: string,
  patch: Partial<{ title: string; postDate: string | null; content: string; isPosted: boolean }>
): Promise<void> => {
  const { error } = await supabase
    .from('marketing_posts')
    .update({
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.postDate !== undefined ? { post_date: patch.postDate } : {}),
      ...(patch.content !== undefined ? { content: patch.content } : {}),
      ...(patch.isPosted !== undefined
        ? { is_posted: patch.isPosted, posted_at: patch.isPosted ? new Date().toISOString() : null }
        : {}),
    })
    .eq('id', id)

  if (error) throw error
}

export const deleteCustomPost = async (id: string): Promise<void> => {
  const { error } = await supabase.from('marketing_posts').delete().eq('id', id)
  if (error) throw error
}
