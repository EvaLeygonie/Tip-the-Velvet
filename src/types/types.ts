import type { Tables, TablesInsert, Enums, Database } from './database.types'

//=== VIEWS ===//

export type Views<T extends keyof Database['public']['Views']> =
  Database['public']['Views'][T]['Row']

//=== TABLES ===//

export type Event = Tables<'events'>
export type OldEvent = Tables<'old_events'>
export type EventImage = Tables<'event_images'>
export type Performer = Tables<'performers'>
export type PublicPerformer = Views<'public_performers'>
export type CastingApplication = Tables<'casting_applications'>
export type CastingApplicationAct = Tables<'casting_application_acts'>
export type StaffVolunteers = Tables<'staff_volunteers'>
export type Sponsors = Tables<'sponsors'>

//=== INSERTS ===//
export type CreateEventInput = TablesInsert<'events'>
export type CreateEventImageInput = TablesInsert<'event_images'>
export type CreatePerformerInput = TablesInsert<'performers'>
export type CreateStaffVolunteerInput = TablesInsert<'staff_volunteers'>
export type CreateSponsorInput = TablesInsert<'sponsors'>

// One act within a casting application submission — matches submit_casting_application's
// p_acts array shape.
export interface CastingApplicationActInput {
  act_title: string
  act_description: string
  video_url?: string | null
}

// Shape submitCastingApplication now takes, matching submit_casting_application's two
// jsonb params — replaces the old flat single-row insert now that one application can
// hold several acts (multi-act-casting-plan.md, Phase 4).
export interface CreateCastingApplicationInput {
  application: {
    event_id: string
    performer_name: string
    email: string
    city?: string | null
    country?: string | null
    promo_image_id?: string | null
    promo_text?: string | null
    photographer?: string | null
    language?: Language
    instagram_link?: string | null
    other_link?: string | null
    agreed_to_terms?: boolean
    requested_fee?: number | null
    needs_travel_costs?: boolean
    needs_accommodation?: boolean
    accommodation_notes?: string | null
    slug?: string | null
  }
  acts: CastingApplicationActInput[]
}

//=== ENUMS ===//
export type Language = Enums<'language'>
export type EventStatus = Enums<'event_status'>
export type CastingReviewStatus = Enums<'casting_review_status'>
export type StaffVolunteerType = Enums<'staff_volunteer_type'>
export type SponsorType = Enums<'sponsor_type'>
