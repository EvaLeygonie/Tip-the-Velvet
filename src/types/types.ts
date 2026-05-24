import type { Tables, TablesInsert, Enums } from './database.types'

//=== TABLES ===//

export type Event = Tables<'events'>
export type OldEvent = Tables<'old_events'>
export type EventImage = Tables<'event_images'>
export type Performer = Tables<'performers'>
export type PerformerImage = Tables<'performer_images'>
export type CastingApplication = Tables<'casting_applications'>

//=== INSERTS ===//
export type CreateEventInput = TablesInsert<'events'>
export type CreateEventImageInput = TablesInsert<'event_images'>
export type CreatePerformerInput = TablesInsert<'performers'>
export type CreatePerformerImageInput = TablesInsert<'performer_images'>
export type CreateCastingApplicationInput = TablesInsert<'casting_applications'>

//=== ENUMS ===//
export type Language = Enums<'language'>
export type EventStatus = Enums<'event_status'>
export type staff_volunteers_type = Enums<'staff_volunteer_type'>
export type sponsor_type = Enums<'sponsor_type'>
export type CastingReviewStatus = Enums<'casting_review_status'>
