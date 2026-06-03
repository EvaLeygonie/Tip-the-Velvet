import type { Tables, TablesInsert, Enums } from './database.types'

//=== TABLES ===//

export type Event = Tables<'events'>
export type OldEvent = Tables<'old_events'>
export type EventImage = Tables<'event_images'>
export type Performer = Tables<'performers'>
export type PerformerImage = Tables<'performer_images'>
export type CastingApplication = Tables<'casting_applications'>
export type StaffVolunteers = Tables<'staff_volunteers'>
export type Sponsors = TablesInsert<'sponsors'>

//=== INSERTS ===//
export type CreateEventInput = TablesInsert<'events'>
export type CreateEventImageInput = TablesInsert<'event_images'>
export type CreatePerformerInput = TablesInsert<'performers'>
export type CreatePerformerImageInput = TablesInsert<'performer_images'>
export type CreateCastingApplicationInput = TablesInsert<'casting_applications'>
export type CreateStaffVolunteerInput = TablesInsert<'staff_volunteers'>
export type CreateSponsorInput = TablesInsert<'sponsors'>

//=== ENUMS ===//
export type Language = Enums<'language'>
export type EventStatus = Enums<'event_status'>
export type CastingReviewStatus = Enums<'casting_review_status'>
export type StaffVolunteerType = Enums<'staff_volunteer_type'>
export type SponsorType = Enums<'sponsor_type'>
