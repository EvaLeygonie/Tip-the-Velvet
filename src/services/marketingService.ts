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

// Artist-level "has this been posted" deliberately isn't tracked here — it's already
// event_performers.is_revealed/reveal_date (the reveal *is* the social post, per how that
// flow was designed). This only covers the handful of fixed, event-level posts every show
// needs, plus (later) custom/unrelated ones — see marketing_post_type's 'custom' value.
export const getMarketingPostStatuses = async (
  eventId: string
): Promise<Record<FixedMarketingPostType, boolean>> => {
  const { data, error } = await supabase
    .from('marketing_posts')
    .select('post_type, is_posted')
    .eq('event_id', eventId)
    .neq('post_type', 'custom')

  if (error) throw error

  const map: Record<FixedMarketingPostType, boolean> = {
    save_the_date: false,
    facebook_event: false,
    casting_call_open: false,
    casting_call_closed: false,
    ticket_countdown: false,
    ticket_release: false,
    pinterest_board: false,
    volunteers_needed: false,
    artists_soon: false,
    artists_all_together: false,
    sponsors_sales_table: false,
    contest: false,
    photo_corner: false,
    venue_rules: false,
    evening_schedule: false,
    one_week_left: false,
    share_like_invite: false,
    evening_schedule_reminder: false,
    lets_go: false,
    thank_you: false,
    evaluation: false,
  }
  for (const row of data || []) {
    map[row.post_type as FixedMarketingPostType] = row.is_posted
  }
  return map
}

// Manual read-then-write rather than .upsert()'s onConflict shorthand — the uniqueness
// guarantee here is a *partial* index (WHERE post_type != 'custom', so future custom posts
// can repeat), and PostgREST's generated ON CONFLICT clause can only target a full
// constraint, not a partial one (fails with 42P10 "no unique or exclusion constraint
// matching the ON CONFLICT specification"). One row per fixed post type per event, created
// on first toggle rather than pre-seeded at event creation.
export const setMarketingPostStatus = async (
  eventId: string,
  postType: FixedMarketingPostType,
  isPosted: boolean
): Promise<void> => {
  const posted_at = isPosted ? new Date().toISOString() : null

  const { data: existing, error: selectError } = await supabase
    .from('marketing_posts')
    .select('id')
    .eq('event_id', eventId)
    .eq('post_type', postType)
    .maybeSingle()
  if (selectError) throw selectError

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
