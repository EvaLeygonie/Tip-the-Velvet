//=== ENUMS/UNIONS ===///

export type Language = 'sv' | 'eng'

export type EventStatus = 'draft' | 'published' | 'archived' | 'cancelled'

export type staff_volunteers_type =
  | 'photographer'
  | 'technician'
  | 'doorman'
  | 'staff'
  | 'volunteer'
  | 'musician'
  | 'entertainment'
  | 'other'

export type sponsor_type = 'prize' | 'lottery' | 'sales' | 'promo' | 'partner' | 'other'

export interface SocialLinks {
  instagram?: string
  facebook?: string
  website?: string
}

interface BaseEntity {
  id: string
  created_at: string
}

//=== EVENTS ===///

export interface Event extends BaseEntity {
  title: string
  subtitle: string | null
  slug: string
  event_start: string | null
  event_end: string | null
  location: string | null
  status: EventStatus
  reveal_date: string | null
  description_sv: string | null
  description_eng: string | null
  image_id: string | null
  updated_at: string
  has_casting_call: boolean
  casting_call_deadline: string | null
  dresscode_link: string | null
  ticket_url: string | null
  tickets_price: number | null
  tickets_sold: number | null
  available_tickets: number | null
  photographer: string | null
  fb_album_url: string | null
  photobooth_url: string | null
  glow_color?: string | undefined
}

export type CreateEventInput = Omit<Event, keyof BaseEntity | 'updated_at'>

export interface OldEvent extends BaseEntity {
  title: string
  date: string
  slug: string
  description_sv: string | null
  description_eng: string | null
  photographer: string | null
  fb_album_url: string | null
  pinterest_link: string | null
  image_id: string
  tickets_sold: number | null
  ticket_price: number | null
}

export interface EventImage extends BaseEntity {
  event_id: string
  event_slug: string
  image_id: string
  is_visible: boolean
  display_order: number
}

export type CreateEventImageInput = Omit<EventImage, keyof BaseEntity>

//=== PERFORMERS ===///

export interface Performer extends BaseEntity {
  name: string
  slug: string
  bio_eng: string | null
  bio_sv: string | null
  social_links: SocialLinks | null
  email: string | null
  phone: string | null
  image_id: string | null
  language: Language
}

export interface PerformerImage extends BaseEntity {
  performer_id: string
  performer_slug: string
  image_id: string
  display_order: number
}

export type CreatePerformerInput = Omit<Performer, keyof BaseEntity>

export type CreatePerformerImageInput = Omit<PerformerImage, keyof BaseEntity>
