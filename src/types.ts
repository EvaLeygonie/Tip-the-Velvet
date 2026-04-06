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
  date: string | null
  location: string | null
  description_sv: string | null
  description_eng: string | null
  status: EventStatus
  photographer: string | null
  reveal_date: string | null
  dresscode_link: string | null
  ticket_url: string | null
  updated_at: string
  has_casting_call: boolean
  tickets_price: number | null
  tickets_sold: number | null
  image_id: string | null
  fb_album_url: string | null
  photobooth_url: string | null
}

export interface EventImage extends BaseEntity {
  event_id: string
  event_slug: string
  image_id: string
  alt_text: string | null
  is_visible: boolean
}

export type CreateEventInput = Omit<Event, keyof BaseEntity | 'updated_at'>

export type CreateEventImageInput = Omit<EventImage, keyof BaseEntity>

export interface OldEvent extends BaseEntity {
  title: string
  date: string
  slug: string
  description_sv: string | null
  description_eng: string | null
  photographer: string | null
  fb_album_url: string | null
  image_id: string
  tickets_sold: number | null
  ticket_price: number | null
}

export interface OldEventImage extends BaseEntity {
  old_event_id: string
  event_slug: string
  image_id: string
  is_visible: boolean
}

export type CreateOldEventImageInput = Omit<OldEventImage, keyof BaseEntity>

export type CreateOldEventInput = Omit<OldEvent, keyof BaseEntity>

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
