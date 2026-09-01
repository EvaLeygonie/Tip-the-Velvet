export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      casting_application_acts: {
        Row: {
          act_description: string
          act_title: string
          application_id: string
          created_at: string
          id: string
          is_selected: boolean
          performer_act_id: string | null
          video_url: string | null
        }
        Insert: {
          act_description: string
          act_title: string
          application_id: string
          created_at?: string
          id?: string
          is_selected?: boolean
          performer_act_id?: string | null
          video_url?: string | null
        }
        Update: {
          act_description?: string
          act_title?: string
          application_id?: string
          created_at?: string
          id?: string
          is_selected?: boolean
          performer_act_id?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "casting_application_acts_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "casting_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "casting_application_acts_performer_act_id_fkey"
            columns: ["performer_act_id"]
            isOneToOne: false
            referencedRelation: "performer_acts"
            referencedColumns: ["id"]
          },
        ]
      }
      casting_applications: {
        Row: {
          access_token: string | null
          accommodation_notes: string | null
          admin_notes: string | null
          agreed_to_terms: boolean
          booking_status:
            | Database["public"]["Enums"]["booking_status_type"]
            | null
          city: string | null
          country: string | null
          created_at: string
          email: string
          event_id: string
          id: string
          initial_reply_sent: boolean | null
          instagram_link: string | null
          language: Database["public"]["Enums"]["language"]
          lineup_role: Database["public"]["Enums"]["event_performer_role"]
          needs_accommodation: boolean | null
          needs_travel_costs: boolean | null
          other_link: string | null
          performer_id: string | null
          performer_name: string
          photographer: string | null
          promo_image_id: string | null
          promo_text: string | null
          proposed_fee: number | null
          requested_fee: number | null
          review_status: Database["public"]["Enums"]["casting_review_status"]
          slug: string | null
          travel_cost_amount: number | null
        }
        Insert: {
          access_token?: string | null
          accommodation_notes?: string | null
          admin_notes?: string | null
          agreed_to_terms?: boolean
          booking_status?:
            | Database["public"]["Enums"]["booking_status_type"]
            | null
          city?: string | null
          country?: string | null
          created_at?: string
          email: string
          event_id: string
          id?: string
          initial_reply_sent?: boolean | null
          instagram_link?: string | null
          language?: Database["public"]["Enums"]["language"]
          lineup_role?: Database["public"]["Enums"]["event_performer_role"]
          needs_accommodation?: boolean | null
          needs_travel_costs?: boolean | null
          other_link?: string | null
          performer_id?: string | null
          performer_name: string
          photographer?: string | null
          promo_image_id?: string | null
          promo_text?: string | null
          proposed_fee?: number | null
          requested_fee?: number | null
          review_status?: Database["public"]["Enums"]["casting_review_status"]
          slug?: string | null
          travel_cost_amount?: number | null
        }
        Update: {
          access_token?: string | null
          accommodation_notes?: string | null
          admin_notes?: string | null
          agreed_to_terms?: boolean
          booking_status?:
            | Database["public"]["Enums"]["booking_status_type"]
            | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string
          event_id?: string
          id?: string
          initial_reply_sent?: boolean | null
          instagram_link?: string | null
          language?: Database["public"]["Enums"]["language"]
          lineup_role?: Database["public"]["Enums"]["event_performer_role"]
          needs_accommodation?: boolean | null
          needs_travel_costs?: boolean | null
          other_link?: string | null
          performer_id?: string | null
          performer_name?: string
          photographer?: string | null
          promo_image_id?: string | null
          promo_text?: string | null
          proposed_fee?: number | null
          requested_fee?: number | null
          review_status?: Database["public"]["Enums"]["casting_review_status"]
          slug?: string | null
          travel_cost_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "casting_applications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "casting_applications_performer_id_fkey"
            columns: ["performer_id"]
            isOneToOne: false
            referencedRelation: "performers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "casting_applications_performer_id_fkey"
            columns: ["performer_id"]
            isOneToOne: false
            referencedRelation: "public_performers"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          created_at: string
          id: string
          instagram_link: string | null
          location: string | null
          name: string
          notes: string | null
          organizers: string | null
          region: string | null
          website: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          instagram_link?: string | null
          location?: string | null
          name: string
          notes?: string | null
          organizers?: string | null
          region?: string | null
          website?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          instagram_link?: string | null
          location?: string | null
          name?: string
          notes?: string | null
          organizers?: string | null
          region?: string | null
          website?: string | null
        }
        Relationships: []
      }
      event_images: {
        Row: {
          created_at: string
          display_order: number | null
          event_id: string
          event_slug: string | null
          id: string
          image_id: string
          is_visible: boolean
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          event_id: string
          event_slug?: string | null
          id?: string
          image_id: string
          is_visible?: boolean
        }
        Update: {
          created_at?: string
          display_order?: number | null
          event_id?: string
          event_slug?: string | null
          id?: string
          image_id?: string
          is_visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "event_images_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_performers: {
        Row: {
          accommodation: string | null
          arrival_time: string | null
          created_at: string
          dietary_category: Database["public"]["Enums"]["dietary_category"] | null
          dietary_requirements: string | null
          display_order: number
          event_id: string
          final_fee: number | null
          is_revealed: boolean
          lineup_role: Database["public"]["Enums"]["event_performer_role"]
          notes: string | null
          performer_id: string
          plus_one_email: string | null
          plus_one_name: string | null
          reveal_date: string | null
          social_posted: boolean
          travel_covered: number | null
          travel_receipts: Json | null
        }
        Insert: {
          accommodation?: string | null
          arrival_time?: string | null
          created_at?: string
          dietary_category?: Database["public"]["Enums"]["dietary_category"] | null
          dietary_requirements?: string | null
          display_order?: number
          event_id: string
          final_fee?: number | null
          is_revealed?: boolean
          lineup_role?: Database["public"]["Enums"]["event_performer_role"]
          notes?: string | null
          performer_id: string
          plus_one_email?: string | null
          plus_one_name?: string | null
          reveal_date?: string | null
          social_posted?: boolean
          travel_covered?: number | null
          travel_receipts?: Json | null
        }
        Update: {
          accommodation?: string | null
          arrival_time?: string | null
          created_at?: string
          dietary_category?: Database["public"]["Enums"]["dietary_category"] | null
          dietary_requirements?: string | null
          display_order?: number
          event_id?: string
          final_fee?: number | null
          is_revealed?: boolean
          lineup_role?: Database["public"]["Enums"]["event_performer_role"]
          notes?: string | null
          performer_id?: string
          plus_one_email?: string | null
          plus_one_name?: string | null
          reveal_date?: string | null
          social_posted?: boolean
          travel_covered?: number | null
          travel_receipts?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "event_performers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_performers_performer_id_fkey"
            columns: ["performer_id"]
            isOneToOne: false
            referencedRelation: "performers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_performers_performer_id_fkey"
            columns: ["performer_id"]
            isOneToOne: false
            referencedRelation: "public_performers"
            referencedColumns: ["id"]
          },
        ]
      }
      event_sponsors: {
        Row: {
          created_at: string
          details: string | null
          event_id: string
          role: Database["public"]["Enums"]["sponsor_type"] | null
          sponsor_id: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          event_id?: string
          role?: Database["public"]["Enums"]["sponsor_type"] | null
          sponsor_id?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          event_id?: string
          role?: Database["public"]["Enums"]["sponsor_type"] | null
          sponsor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_sponsors_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_sponsors_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsors"
            referencedColumns: ["id"]
          },
        ]
      }
      event_staff_invitations: {
        Row: {
          created_at: string
          event_id: string
          id: string
          invited_at: string | null
          responded_at: string | null
          response_deadline: string | null
          staff_id: string
          status: Database["public"]["Enums"]["event_staff_invitation_status"]
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          invited_at?: string | null
          responded_at?: string | null
          response_deadline?: string | null
          staff_id: string
          status?: Database["public"]["Enums"]["event_staff_invitation_status"]
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          invited_at?: string | null
          responded_at?: string | null
          response_deadline?: string | null
          staff_id?: string
          status?: Database["public"]["Enums"]["event_staff_invitation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "event_staff_invitations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_staff_invitations_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "public_photographers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_staff_invitations_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_volunteers"
            referencedColumns: ["id"]
          },
        ]
      }
      event_staff_volunteers: {
        Row: {
          created_at: string
          dietary_category: Database["public"]["Enums"]["dietary_category"] | null
          dietary_notes: string | null
          event_id: string
          id: string
          needs_food: boolean
          role: Database["public"]["Enums"]["staff_volunteer_type"]
          role_details: string | null
          staff_id: string
        }
        Insert: {
          created_at?: string
          dietary_category?: Database["public"]["Enums"]["dietary_category"] | null
          dietary_notes?: string | null
          event_id: string
          id?: string
          needs_food?: boolean
          role?: Database["public"]["Enums"]["staff_volunteer_type"]
          role_details?: string | null
          staff_id: string
        }
        Update: {
          created_at?: string
          dietary_category?: Database["public"]["Enums"]["dietary_category"] | null
          dietary_notes?: string | null
          event_id?: string
          id?: string
          needs_food?: boolean
          role?: Database["public"]["Enums"]["staff_volunteer_type"]
          role_details?: string | null
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_staff_volunteers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_staff_volunteers_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "public_photographers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_staff_volunteers_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_volunteers"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          afterparty_playlist: string | null
          available_tickets: number | null
          casting_call_deadline: string | null
          casting_call_start: string | null
          casting_info_eng: string | null
          casting_info_sv: string | null
          created_at: string
          description_eng: string | null
          description_sv: string | null
          event_end: string | null
          event_start: string | null
          facebook_event: string | null
          fb_album_url: string | null
          glow_color: string | null
          has_casting_call: boolean
          hashtags: string | null
          id: string
          image_id: string | null
          location: string | null
          photobooth_url: string | null
          photographer: string | null
          photographer_id: string | null
          pinterest_link: string | null
          reveal_date: string | null
          slug: string
          staff_recruitment_open: boolean
          status: Database["public"]["Enums"]["event_status"]
          subtitle: string | null
          ticket_release_date: string | null
          ticket_url: string | null
          tickets_price: number | null
          tickets_sold: number | null
          title: string
          updated_at: string
          venue_id: string | null
        }
        Insert: {
          afterparty_playlist?: string | null
          available_tickets?: number | null
          casting_call_deadline?: string | null
          casting_call_start?: string | null
          casting_info_eng?: string | null
          casting_info_sv?: string | null
          created_at?: string
          description_eng?: string | null
          description_sv?: string | null
          event_end?: string | null
          event_start?: string | null
          facebook_event?: string | null
          fb_album_url?: string | null
          glow_color?: string | null
          has_casting_call?: boolean
          hashtags?: string | null
          id?: string
          image_id?: string | null
          location?: string | null
          photobooth_url?: string | null
          photographer?: string | null
          photographer_id?: string | null
          pinterest_link?: string | null
          reveal_date?: string | null
          slug: string
          staff_recruitment_open?: boolean
          status?: Database["public"]["Enums"]["event_status"]
          subtitle?: string | null
          ticket_release_date?: string | null
          ticket_url?: string | null
          tickets_price?: number | null
          tickets_sold?: number | null
          title: string
          updated_at?: string
          venue_id?: string | null
        }
        Update: {
          afterparty_playlist?: string | null
          available_tickets?: number | null
          casting_call_deadline?: string | null
          casting_call_start?: string | null
          casting_info_eng?: string | null
          casting_info_sv?: string | null
          created_at?: string
          description_eng?: string | null
          description_sv?: string | null
          event_end?: string | null
          event_start?: string | null
          facebook_event?: string | null
          fb_album_url?: string | null
          glow_color?: string | null
          has_casting_call?: boolean
          hashtags?: string | null
          id?: string
          image_id?: string | null
          location?: string | null
          photobooth_url?: string | null
          photographer?: string | null
          photographer_id?: string | null
          pinterest_link?: string | null
          reveal_date?: string | null
          slug?: string
          staff_recruitment_open?: boolean
          status?: Database["public"]["Enums"]["event_status"]
          subtitle?: string | null
          ticket_release_date?: string | null
          ticket_url?: string | null
          tickets_price?: number | null
          tickets_sold?: number | null
          title?: string
          updated_at?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "public_photographers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "staff_volunteers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "public_venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_posts: {
        Row: {
          content: string | null
          created_at: string
          event_id: string | null
          id: string
          is_posted: boolean
          post_date: string | null
          post_type: Database["public"]["Enums"]["marketing_post_type"]
          posted_at: string | null
          title: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          is_posted?: boolean
          post_date?: string | null
          post_type: Database["public"]["Enums"]["marketing_post_type"]
          posted_at?: string | null
          title?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          is_posted?: boolean
          post_date?: string | null
          post_type?: Database["public"]["Enums"]["marketing_post_type"]
          posted_at?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_posts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      old_event_images: {
        Row: {
          created_at: string
          display_order: number | null
          event_id: string | null
          event_slug: string | null
          id: string
          image_id: string | null
          is_visible: boolean
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          event_id?: string | null
          event_slug?: string | null
          id?: string
          image_id?: string | null
          is_visible?: boolean
        }
        Update: {
          created_at?: string
          display_order?: number | null
          event_id?: string | null
          event_slug?: string | null
          id?: string
          image_id?: string | null
          is_visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "old_event_images_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "old_events"
            referencedColumns: ["id"]
          },
        ]
      }
      old_events: {
        Row: {
          created_at: string
          date: string
          description_eng: string | null
          description_sv: string | null
          fb_album_url: string | null
          id: string
          image_id: string | null
          location: string | null
          photographer: string | null
          pinterest_link: string | null
          slug: string
          ticket_price: number | null
          tickets_sold: number | null
          title: string
        }
        Insert: {
          created_at?: string
          date: string
          description_eng?: string | null
          description_sv?: string | null
          fb_album_url?: string | null
          id?: string
          image_id?: string | null
          location?: string | null
          photographer?: string | null
          pinterest_link?: string | null
          slug: string
          ticket_price?: number | null
          tickets_sold?: number | null
          title: string
        }
        Update: {
          created_at?: string
          date?: string
          description_eng?: string | null
          description_sv?: string | null
          fb_album_url?: string | null
          id?: string
          image_id?: string | null
          location?: string | null
          photographer?: string | null
          pinterest_link?: string | null
          slug?: string
          ticket_price?: number | null
          tickets_sold?: number | null
          title?: string
        }
        Relationships: []
      }
      performer_acts: {
        Row: {
          act_name: string
          act_notes: string | null
          audio_files: Json | null
          created_at: string
          description_eng: string | null
          description_sv: string | null
          display_order: number
          event_id: string | null
          id: string
          performer_id: string
          pick_up_cleaning: string | null
          stage_preparations: string | null
          video_url: string | null
        }
        Insert: {
          act_name: string
          act_notes?: string | null
          audio_files?: Json | null
          created_at?: string
          description_eng?: string | null
          description_sv?: string | null
          display_order?: number
          event_id?: string | null
          id?: string
          performer_id: string
          pick_up_cleaning?: string | null
          stage_preparations?: string | null
          video_url?: string | null
        }
        Update: {
          act_name?: string
          act_notes?: string | null
          audio_files?: Json | null
          created_at?: string
          description_eng?: string | null
          description_sv?: string | null
          display_order?: number
          event_id?: string | null
          id?: string
          performer_id?: string
          pick_up_cleaning?: string | null
          stage_preparations?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performer_acts_performer_id_fkey"
            columns: ["performer_id"]
            isOneToOne: false
            referencedRelation: "performers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performer_acts_performer_id_fkey"
            columns: ["performer_id"]
            isOneToOne: false
            referencedRelation: "public_performers"
            referencedColumns: ["id"]
          },
        ]
      }
      performers: {
        Row: {
          agreed_to_terms: boolean | null
          bio_eng: string | null
          bio_sv: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          instagram_link: string | null
          is_approved: boolean | null
          language: Database["public"]["Enums"]["language"]
          other_link: string | null
          performer_name: string
          phone: string | null
          photographer: string | null
          promo_image_id: string | null
          slug: string
          third_link: string | null
        }
        Insert: {
          agreed_to_terms?: boolean | null
          bio_eng?: string | null
          bio_sv?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          instagram_link?: string | null
          is_approved?: boolean | null
          language?: Database["public"]["Enums"]["language"]
          other_link?: string | null
          performer_name: string
          phone?: string | null
          photographer?: string | null
          promo_image_id?: string | null
          slug: string
          third_link?: string | null
        }
        Update: {
          agreed_to_terms?: boolean | null
          bio_eng?: string | null
          bio_sv?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          instagram_link?: string | null
          is_approved?: boolean | null
          language?: Database["public"]["Enums"]["language"]
          other_link?: string | null
          performer_name?: string
          phone?: string | null
          photographer?: string | null
          promo_image_id?: string | null
          slug?: string
          third_link?: string | null
        }
        Relationships: []
      }
      sponsors: {
        Row: {
          agreed_to_terms: boolean | null
          club_id: string | null
          created_at: string
          email: string | null
          id: string
          instagram_link: string | null
          logo_id: string | null
          name: string
          other_link: string | null
          phone: string | null
          sponsor_details: string | null
          sponsor_type: Database["public"]["Enums"]["sponsor_type"] | null
        }
        Insert: {
          agreed_to_terms?: boolean | null
          club_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          instagram_link?: string | null
          logo_id?: string | null
          name: string
          other_link?: string | null
          phone?: string | null
          sponsor_details?: string | null
          sponsor_type?: Database["public"]["Enums"]["sponsor_type"] | null
        }
        Update: {
          agreed_to_terms?: boolean | null
          club_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          instagram_link?: string | null
          logo_id?: string | null
          name?: string
          other_link?: string | null
          phone?: string | null
          sponsor_details?: string | null
          sponsor_type?: Database["public"]["Enums"]["sponsor_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "sponsors_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_volunteers: {
        Row: {
          agreed_to_terms: boolean | null
          created_at: string
          email: string | null
          fee: number | null
          id: string
          link: string | null
          name: string
          phone: string | null
          role: Database["public"]["Enums"]["staff_volunteer_type"]
          role_details: string | null
          worked_with: boolean | null
        }
        Insert: {
          agreed_to_terms?: boolean | null
          created_at?: string
          email?: string | null
          fee?: number | null
          id?: string
          link?: string | null
          name: string
          phone?: string | null
          role?: Database["public"]["Enums"]["staff_volunteer_type"]
          role_details?: string | null
          worked_with?: boolean | null
        }
        Update: {
          agreed_to_terms?: boolean | null
          created_at?: string
          email?: string | null
          fee?: number | null
          id?: string
          link?: string | null
          name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["staff_volunteer_type"]
          role_details?: string | null
          worked_with?: boolean | null
        }
        Relationships: []
      }
      venues: {
        Row: {
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          location: string
          map_link: string
          name: string
          phone: string | null
          price: number | null
        }
        Insert: {
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          location: string
          map_link: string
          name: string
          phone?: string | null
          price?: number | null
        }
        Update: {
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          location?: string
          map_link?: string
          name?: string
          phone?: string | null
          price?: number | null
        }
        Relationships: []
      }
      vip_manual_entries: {
        Row: {
          category: Database["public"]["Enums"]["vip_entry_category"]
          created_at: string
          email: string | null
          event_id: string
          id: string
          name: string
          note: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["vip_entry_category"]
          created_at?: string
          email?: string | null
          event_id: string
          id?: string
          name: string
          note?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["vip_entry_category"]
          created_at?: string
          email?: string | null
          event_id?: string
          id?: string
          name?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vip_manual_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_performers: {
        Row: {
          bio_eng: string | null
          bio_sv: string | null
          city: string | null
          country: string | null
          id: string | null
          instagram_link: string | null
          is_approved: boolean | null
          other_link: string | null
          performer_name: string | null
          photographer: string | null
          promo_image_id: string | null
          slug: string | null
          third_link: string | null
        }
        Insert: {
          bio_eng?: string | null
          bio_sv?: string | null
          city?: string | null
          country?: string | null
          id?: string | null
          instagram_link?: string | null
          is_approved?: boolean | null
          other_link?: string | null
          performer_name?: string | null
          photographer?: string | null
          promo_image_id?: string | null
          slug?: string | null
          third_link?: string | null
        }
        Update: {
          bio_eng?: string | null
          bio_sv?: string | null
          city?: string | null
          country?: string | null
          id?: string | null
          instagram_link?: string | null
          is_approved?: boolean | null
          other_link?: string | null
          performer_name?: string | null
          photographer?: string | null
          promo_image_id?: string | null
          slug?: string | null
          third_link?: string | null
        }
        Relationships: []
      }
      public_photographers: {
        Row: {
          id: string | null
          link: string | null
          name: string | null
          role: Database["public"]["Enums"]["staff_volunteer_type"] | null
        }
        Insert: {
          id?: string | null
          link?: string | null
          name?: string | null
          role?: Database["public"]["Enums"]["staff_volunteer_type"] | null
        }
        Update: {
          id?: string | null
          link?: string | null
          name?: string | null
          role?: Database["public"]["Enums"]["staff_volunteer_type"] | null
        }
        Relationships: []
      }
      public_venues: {
        Row: {
          id: string | null
          location: string | null
          map_link: string | null
          name: string | null
        }
        Insert: {
          id?: string | null
          location?: string | null
          map_link?: string | null
          name?: string | null
        }
        Update: {
          id?: string | null
          location?: string | null
          map_link?: string | null
          name?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      cancel_confirmed_booking: {
        Args: {
          p_application_id: string
          p_new_review_status: Database["public"]["Enums"]["casting_review_status"]
        }
        Returns: Json
      }
      confirm_and_migrate_artist: {
        Args: {
          p_access_token: string
          p_application_id: string
          p_final_fee: number
          p_travel_covered: number
        }
        Returns: Json
      }
      event_status_handler: { Args: never; Returns: undefined }
      get_casting_application_by_token: {
        Args: { p_id: string; p_token: string }
        Returns: Json
      }
      get_performer_by_slug_for_edit: {
        Args: { p_slug: string }
        Returns: Json
      }
      slugify: { Args: { value: string }; Returns: string }
      submit_casting_application: {
        Args: { p_acts: Json; p_application: Json }
        Returns: string
      }
      unaccent: { Args: { "": string }; Returns: string }
      update_event_performer_via_token: {
        Args: {
          p_access_token: string
          p_dietary_requirements?: string
          p_event_id: string
          p_notes?: string
          p_performer_id: string
          p_plus_one_email?: string
          p_plus_one_name?: string
          p_travel_covered?: number
          p_travel_receipts?: Json
        }
        Returns: undefined
      }
      update_performer_act_via_token: {
        Args: {
          p_access_token: string
          p_act_id: string
          p_act_name?: string
          p_act_notes?: string
          p_audio_files?: Json
          p_description_eng?: string
          p_description_sv?: string
          p_pick_up_cleaning?: string
          p_stage_preparations?: string
        }
        Returns: undefined
      }
      update_performer_bio_via_token: {
        Args: {
          p_access_token: string
          p_bio_eng?: string
          p_bio_sv?: string
          p_performer_id: string
        }
        Returns: undefined
      }
      update_performer_by_slug: {
        Args: {
          p_bio_eng?: string
          p_bio_sv?: string
          p_city?: string
          p_country?: string
          p_instagram_link?: string
          p_other_link?: string
          p_photographer?: string
          p_promo_image_id?: string
          p_slug: string
          p_third_link?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      booking_status_type:
        | "not_contacted"
        | "negotiating"
        | "pending_confirmation"
        | "confirmed"
        | "declined"
        | "cancelled"
      casting_review_status: "pending" | "yes" | "maybe" | "no"
      dietary_category: "all_eater" | "vegetarian" | "vegan"
      event_performer_role: "performer" | "host" | "headliner"
      event_staff_invitation_status:
        | "interested"
        | "invited"
        | "confirmed"
        | "declined"
        | "not_needed"
      event_status: "draft" | "published" | "cancelled" | "archived"
      language: "sv" | "eng"
      marketing_post_type:
        | "save_the_date"
        | "casting_call_open"
        | "ticket_release"
        | "custom"
        | "facebook_event"
        | "casting_call_closed"
        | "ticket_countdown"
        | "pinterest_board"
        | "volunteers_needed"
        | "artists_soon"
        | "artists_all_together"
        | "sponsors_sales_table"
        | "contest"
        | "photo_corner"
        | "venue_rules"
        | "evening_schedule"
        | "one_week_left"
        | "share_like_invite"
        | "evening_schedule_reminder"
        | "lets_go"
        | "thank_you"
        | "evaluation"
      sponsor_type:
        | "prize"
        | "creation"
        | "sales"
        | "promo"
        | "partner"
        | "other"
      staff_volunteer_type:
        | "photographer"
        | "technician"
        | "dj"
        | "stage_kitten"
        | "entertainment"
        | "volunteer"
        | "doorman"
        | "other"
      vip_entry_category: "ticket_winner" | "contest_winner" | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      booking_status_type: [
        "not_contacted",
        "negotiating",
        "pending_confirmation",
        "confirmed",
        "declined",
        "cancelled",
      ],
      casting_review_status: ["pending", "yes", "maybe", "no"],
      dietary_category: ["all_eater", "vegetarian", "vegan"],
      event_performer_role: ["performer", "host", "headliner"],
      event_staff_invitation_status: [
        "interested",
        "invited",
        "confirmed",
        "declined",
        "not_needed",
      ],
      event_status: ["draft", "published", "cancelled", "archived"],
      language: ["sv", "eng"],
      marketing_post_type: [
        "save_the_date",
        "casting_call_open",
        "ticket_release",
        "custom",
        "facebook_event",
        "casting_call_closed",
        "ticket_countdown",
        "pinterest_board",
        "volunteers_needed",
        "artists_soon",
        "artists_all_together",
        "sponsors_sales_table",
        "contest",
        "photo_corner",
        "venue_rules",
        "evening_schedule",
        "one_week_left",
        "share_like_invite",
        "evening_schedule_reminder",
        "lets_go",
        "thank_you",
        "evaluation",
      ],
      sponsor_type: ["prize", "creation", "sales", "promo", "partner", "other"],
      staff_volunteer_type: [
        "photographer",
        "technician",
        "dj",
        "stage_kitten",
        "entertainment",
        "volunteer",
        "doorman",
        "other",
      ],
      vip_entry_category: ["ticket_winner", "contest_winner", "other"],
    },
  },
} as const
