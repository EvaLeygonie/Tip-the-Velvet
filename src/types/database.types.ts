export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.1'
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
            foreignKeyName: 'casting_application_acts_application_id_fkey'
            columns: ['application_id']
            isOneToOne: false
            referencedRelation: 'casting_applications'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'casting_application_acts_performer_act_id_fkey'
            columns: ['performer_act_id']
            isOneToOne: false
            referencedRelation: 'performer_acts'
            referencedColumns: ['id']
          },
        ]
      }
      casting_applications: {
        Row: {
          access_token: string | null
          accommodation_notes: string | null
          admin_notes: string | null
          agreed_to_terms: boolean
          booking_status: Database['public']['Enums']['booking_status_type'] | null
          city: string | null
          country: string | null
          created_at: string
          email: string
          event_id: string
          id: string
          initial_reply_sent: boolean | null
          instagram_link: string | null
          language: Database['public']['Enums']['language']
          lineup_role: Database['public']['Enums']['event_performer_role']
          needs_accommodation: boolean | null
          needs_travel_costs: boolean | null
          original_travel_estimate: number | null
          other_link: string | null
          performer_id: string | null
          performer_name: string
          phone: string | null
          photographer: string | null
          promo_image_id: string | null
          promo_text: string | null
          proposed_fee: number | null
          requested_fee: number | null
          review_status: Database['public']['Enums']['casting_review_status']
          slug: string | null
          travel_cost_amount: number | null
        }
        Insert: {
          access_token?: string | null
          accommodation_notes?: string | null
          admin_notes?: string | null
          agreed_to_terms?: boolean
          booking_status?: Database['public']['Enums']['booking_status_type'] | null
          city?: string | null
          country?: string | null
          created_at?: string
          email: string
          event_id: string
          id?: string
          initial_reply_sent?: boolean | null
          instagram_link?: string | null
          language?: Database['public']['Enums']['language']
          lineup_role?: Database['public']['Enums']['event_performer_role']
          needs_accommodation?: boolean | null
          needs_travel_costs?: boolean | null
          original_travel_estimate?: number | null
          other_link?: string | null
          performer_id?: string | null
          performer_name: string
          phone?: string | null
          photographer?: string | null
          promo_image_id?: string | null
          promo_text?: string | null
          proposed_fee?: number | null
          requested_fee?: number | null
          review_status?: Database['public']['Enums']['casting_review_status']
          slug?: string | null
          travel_cost_amount?: number | null
        }
        Update: {
          access_token?: string | null
          accommodation_notes?: string | null
          admin_notes?: string | null
          agreed_to_terms?: boolean
          booking_status?: Database['public']['Enums']['booking_status_type'] | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string
          event_id?: string
          id?: string
          initial_reply_sent?: boolean | null
          instagram_link?: string | null
          language?: Database['public']['Enums']['language']
          lineup_role?: Database['public']['Enums']['event_performer_role']
          needs_accommodation?: boolean | null
          needs_travel_costs?: boolean | null
          original_travel_estimate?: number | null
          other_link?: string | null
          performer_id?: string | null
          performer_name?: string
          phone?: string | null
          photographer?: string | null
          promo_image_id?: string | null
          promo_text?: string | null
          proposed_fee?: number | null
          requested_fee?: number | null
          review_status?: Database['public']['Enums']['casting_review_status']
          slug?: string | null
          travel_cost_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'casting_applications_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'casting_applications_performer_id_fkey'
            columns: ['performer_id']
            isOneToOne: false
            referencedRelation: 'performers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'casting_applications_performer_id_fkey'
            columns: ['performer_id']
            isOneToOne: false
            referencedRelation: 'public_performers'
            referencedColumns: ['id']
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
      door_shift_slots: {
        Row: {
          created_at: string
          event_id: string
          id: string
          slot_end: string
          slot_start: string
          volunteer_name: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          slot_end: string
          slot_start: string
          volunteer_name?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          slot_end?: string
          slot_start?: string
          volunteer_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'door_shift_slots_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
        ]
      }
      event_feedback: {
        Row: {
          aspect_ratings: Json
          been_before: string | null
          created_at: string
          event_id: string
          extra_comment: string | null
          how_found: string | null
          how_found_note: string | null
          id: string
          improve: string | null
          improve_aspects: string[] | null
          is_actioned: boolean
          is_featured: boolean
          is_hidden: boolean
          is_quote_approved: boolean
          language: string | null
          liked: string | null
          liked_aspects: string[] | null
          may_quote: boolean
          rating: number | null
          review: string | null
          source: string
          updated_at: string
          voter_token: string
          would_recommend: string | null
          would_recommend_note: string | null
        }
        Insert: {
          aspect_ratings?: Json
          been_before?: string | null
          created_at?: string
          event_id: string
          extra_comment?: string | null
          how_found?: string | null
          how_found_note?: string | null
          id?: string
          improve?: string | null
          improve_aspects?: string[] | null
          is_actioned?: boolean
          is_featured?: boolean
          is_hidden?: boolean
          is_quote_approved?: boolean
          language?: string | null
          liked?: string | null
          liked_aspects?: string[] | null
          may_quote?: boolean
          rating?: number | null
          review?: string | null
          source?: string
          updated_at?: string
          voter_token: string
          would_recommend?: string | null
          would_recommend_note?: string | null
        }
        Update: {
          aspect_ratings?: Json
          been_before?: string | null
          created_at?: string
          event_id?: string
          extra_comment?: string | null
          how_found?: string | null
          how_found_note?: string | null
          id?: string
          improve?: string | null
          improve_aspects?: string[] | null
          is_actioned?: boolean
          is_featured?: boolean
          is_hidden?: boolean
          is_quote_approved?: boolean
          language?: string | null
          liked?: string | null
          liked_aspects?: string[] | null
          may_quote?: boolean
          rating?: number | null
          review?: string | null
          source?: string
          updated_at?: string
          voter_token?: string
          would_recommend?: string | null
          would_recommend_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'event_feedback_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
        ]
      }
      event_images: {
        Row: {
          category: string | null
          created_at: string
          display_order: number | null
          event_id: string
          event_slug: string | null
          id: string
          image_id: string
          is_visible: boolean
        }
        Insert: {
          category?: string | null
          created_at?: string
          display_order?: number | null
          event_id: string
          event_slug?: string | null
          id?: string
          image_id: string
          is_visible?: boolean
        }
        Update: {
          category?: string | null
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
            foreignKeyName: 'event_images_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
        ]
      }
      event_info_items: {
        Row: {
          audiences: string[]
          body_eng: string | null
          body_sv: string | null
          created_at: string
          doc_key: string | null
          event_id: string
          id: string
          kind: string
          sort_order: number
          template_key: string | null
          time_text: string | null
          title_eng: string | null
          title_sv: string | null
        }
        Insert: {
          audiences?: string[]
          body_eng?: string | null
          body_sv?: string | null
          created_at?: string
          doc_key?: string | null
          event_id: string
          id?: string
          kind: string
          sort_order?: number
          template_key?: string | null
          time_text?: string | null
          title_eng?: string | null
          title_sv?: string | null
        }
        Update: {
          audiences?: string[]
          body_eng?: string | null
          body_sv?: string | null
          created_at?: string
          doc_key?: string | null
          event_id?: string
          id?: string
          kind?: string
          sort_order?: number
          template_key?: string | null
          time_text?: string | null
          title_eng?: string | null
          title_sv?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'event_info_items_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
        ]
      }
      event_info_links: {
        Row: {
          audience: string
          created_at: string
          event_id: string
          id: string
          token: string
        }
        Insert: {
          audience: string
          created_at?: string
          event_id: string
          id?: string
          token?: string
        }
        Update: {
          audience?: string
          created_at?: string
          event_id?: string
          id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: 'event_info_links_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
        ]
      }
      event_performers: {
        Row: {
          accommodation: string | null
          accommodation_details: string | null
          arrival_time: string | null
          artist_note: string | null
          created_at: string
          dietary_category: Database['public']['Enums']['dietary_category'] | null
          dietary_requirements: string | null
          display_order: number
          event_id: string
          final_fee: number | null
          is_revealed: boolean
          lineup_role: Database['public']['Enums']['event_performer_role']
          needs_food: boolean
          notes: string | null
          performer_id: string
          plus_one_email: string | null
          plus_one_name: string | null
          plus_one_needs_accommodation: boolean
          reveal_date: string | null
          social_posted: boolean
          travel_covered: number | null
          travel_receipts: Json | null
          travels_by_car: boolean
        }
        Insert: {
          accommodation?: string | null
          accommodation_details?: string | null
          arrival_time?: string | null
          artist_note?: string | null
          created_at?: string
          dietary_category?: Database['public']['Enums']['dietary_category'] | null
          dietary_requirements?: string | null
          display_order?: number
          event_id: string
          final_fee?: number | null
          is_revealed?: boolean
          lineup_role?: Database['public']['Enums']['event_performer_role']
          needs_food?: boolean
          notes?: string | null
          performer_id: string
          plus_one_email?: string | null
          plus_one_name?: string | null
          plus_one_needs_accommodation?: boolean
          reveal_date?: string | null
          social_posted?: boolean
          travel_covered?: number | null
          travel_receipts?: Json | null
          travels_by_car?: boolean
        }
        Update: {
          accommodation?: string | null
          accommodation_details?: string | null
          arrival_time?: string | null
          artist_note?: string | null
          created_at?: string
          dietary_category?: Database['public']['Enums']['dietary_category'] | null
          dietary_requirements?: string | null
          display_order?: number
          event_id?: string
          final_fee?: number | null
          is_revealed?: boolean
          lineup_role?: Database['public']['Enums']['event_performer_role']
          needs_food?: boolean
          notes?: string | null
          performer_id?: string
          plus_one_email?: string | null
          plus_one_name?: string | null
          plus_one_needs_accommodation?: boolean
          reveal_date?: string | null
          social_posted?: boolean
          travel_covered?: number | null
          travel_receipts?: Json | null
          travels_by_car?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'event_performers_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_performers_performer_id_fkey'
            columns: ['performer_id']
            isOneToOne: false
            referencedRelation: 'performers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_performers_performer_id_fkey'
            columns: ['performer_id']
            isOneToOne: false
            referencedRelation: 'public_performers'
            referencedColumns: ['id']
          },
        ]
      }
      event_print_items: {
        Row: {
          copies: number | null
          created_at: string
          done: boolean
          event_id: string | null
          hidden: boolean
          id: string
          label: string | null
          page_size: string | null
          professional: boolean | null
          sort_order: number
          standard_id: string | null
        }
        Insert: {
          copies?: number | null
          created_at?: string
          done?: boolean
          event_id?: string | null
          hidden?: boolean
          id?: string
          label?: string | null
          page_size?: string | null
          professional?: boolean | null
          sort_order?: number
          standard_id?: string | null
        }
        Update: {
          copies?: number | null
          created_at?: string
          done?: boolean
          event_id?: string | null
          hidden?: boolean
          id?: string
          label?: string | null
          page_size?: string | null
          professional?: boolean | null
          sort_order?: number
          standard_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'event_print_items_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_print_items_standard_id_fkey'
            columns: ['standard_id']
            isOneToOne: false
            referencedRelation: 'print_standard_items'
            referencedColumns: ['id']
          },
        ]
      }
      event_sponsors: {
        Row: {
          created_at: string
          details: string | null
          event_id: string
          has_exhibition: boolean
          has_gotten_price: boolean
          has_merch_table: boolean
          merch_table_notes: string | null
          role: Database['public']['Enums']['sponsor_type'] | null
          sponsor_id: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          event_id?: string
          has_exhibition?: boolean
          has_gotten_price?: boolean
          has_merch_table?: boolean
          merch_table_notes?: string | null
          role?: Database['public']['Enums']['sponsor_type'] | null
          sponsor_id?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          event_id?: string
          has_exhibition?: boolean
          has_gotten_price?: boolean
          has_merch_table?: boolean
          merch_table_notes?: string | null
          role?: Database['public']['Enums']['sponsor_type'] | null
          sponsor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'event_sponsors_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_sponsors_sponsor_id_fkey'
            columns: ['sponsor_id']
            isOneToOne: false
            referencedRelation: 'sponsors'
            referencedColumns: ['id']
          },
        ]
      }
      event_staff_food: {
        Row: {
          dietary_category: Database['public']['Enums']['dietary_category'] | null
          dietary_notes: string | null
          event_id: string
          needs_food: boolean
          staff_id: string
        }
        Insert: {
          dietary_category?: Database['public']['Enums']['dietary_category'] | null
          dietary_notes?: string | null
          event_id: string
          needs_food?: boolean
          staff_id: string
        }
        Update: {
          dietary_category?: Database['public']['Enums']['dietary_category'] | null
          dietary_notes?: string | null
          event_id?: string
          needs_food?: boolean
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'event_staff_food_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_staff_food_staff_id_fkey'
            columns: ['staff_id']
            isOneToOne: false
            referencedRelation: 'public_photographers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_staff_food_staff_id_fkey'
            columns: ['staff_id']
            isOneToOne: false
            referencedRelation: 'staff_volunteers'
            referencedColumns: ['id']
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
          status: Database['public']['Enums']['event_staff_invitation_status']
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          invited_at?: string | null
          responded_at?: string | null
          response_deadline?: string | null
          staff_id: string
          status?: Database['public']['Enums']['event_staff_invitation_status']
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          invited_at?: string | null
          responded_at?: string | null
          response_deadline?: string | null
          staff_id?: string
          status?: Database['public']['Enums']['event_staff_invitation_status']
        }
        Relationships: [
          {
            foreignKeyName: 'event_staff_invitations_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_staff_invitations_staff_id_fkey'
            columns: ['staff_id']
            isOneToOne: false
            referencedRelation: 'public_photographers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_staff_invitations_staff_id_fkey'
            columns: ['staff_id']
            isOneToOne: false
            referencedRelation: 'staff_volunteers'
            referencedColumns: ['id']
          },
        ]
      }
      event_staff_volunteers: {
        Row: {
          bio_eng: string | null
          bio_sv: string | null
          created_at: string
          dietary_category: Database['public']['Enums']['dietary_category'] | null
          dietary_notes: string | null
          display_name: string | null
          event_id: string
          fee: number | null
          id: string
          image_id: string | null
          in_charge: boolean
          instagram_link: string | null
          is_revealed: boolean
          needs_food: boolean
          other_link: string | null
          photo_credit: string | null
          reveal_date: string | null
          role: Database['public']['Enums']['staff_volunteer_type']
          role_details: string | null
          shift: Database['public']['Enums']['volunteer_shift'] | null
          social_posted: boolean
          staff_id: string
          title_eng: string | null
          title_sv: string | null
        }
        Insert: {
          bio_eng?: string | null
          bio_sv?: string | null
          created_at?: string
          dietary_category?: Database['public']['Enums']['dietary_category'] | null
          dietary_notes?: string | null
          display_name?: string | null
          event_id: string
          fee?: number | null
          id?: string
          image_id?: string | null
          in_charge?: boolean
          instagram_link?: string | null
          is_revealed?: boolean
          needs_food?: boolean
          other_link?: string | null
          photo_credit?: string | null
          reveal_date?: string | null
          role?: Database['public']['Enums']['staff_volunteer_type']
          role_details?: string | null
          shift?: Database['public']['Enums']['volunteer_shift'] | null
          social_posted?: boolean
          staff_id: string
          title_eng?: string | null
          title_sv?: string | null
        }
        Update: {
          bio_eng?: string | null
          bio_sv?: string | null
          created_at?: string
          dietary_category?: Database['public']['Enums']['dietary_category'] | null
          dietary_notes?: string | null
          display_name?: string | null
          event_id?: string
          fee?: number | null
          id?: string
          image_id?: string | null
          in_charge?: boolean
          instagram_link?: string | null
          is_revealed?: boolean
          needs_food?: boolean
          other_link?: string | null
          photo_credit?: string | null
          reveal_date?: string | null
          role?: Database['public']['Enums']['staff_volunteer_type']
          role_details?: string | null
          shift?: Database['public']['Enums']['volunteer_shift'] | null
          social_posted?: boolean
          staff_id?: string
          title_eng?: string | null
          title_sv?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'event_staff_volunteers_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_staff_volunteers_staff_id_fkey'
            columns: ['staff_id']
            isOneToOne: false
            referencedRelation: 'public_photographers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_staff_volunteers_staff_id_fkey'
            columns: ['staff_id']
            isOneToOne: false
            referencedRelation: 'staff_volunteers'
            referencedColumns: ['id']
          },
        ]
      }
      events: {
        Row: {
          afterparty_playlist: string | null
          available_tickets: number | null
          before_playlist: string | null
          casting_call_deadline: string | null
          casting_call_start: string | null
          casting_info_eng: string | null
          casting_info_sv: string | null
          checkin_url: string | null
          created_at: string
          description_eng: string | null
          description_sv: string | null
          door_signup_open: boolean
          event_end: string | null
          event_start: string | null
          facebook_event: string | null
          fb_album_url: string | null
          feedback_aspects: string[] | null
          feedback_mode: string
          glow_color: string | null
          has_casting_call: boolean
          hashtags: string | null
          id: string
          image_id: string | null
          intermission_playlist: string | null
          is_english: boolean
          location: string | null
          photobooth_url: string | null
          photographer: string | null
          photographer_id: string | null
          pinterest_link: string | null
          print_archived: boolean
          reveal_date: string | null
          show_set1_locked: boolean
          show_set2_locked: boolean
          slug: string
          staff_recruitment_open: boolean
          status: Database['public']['Enums']['event_status']
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
          before_playlist?: string | null
          casting_call_deadline?: string | null
          casting_call_start?: string | null
          casting_info_eng?: string | null
          casting_info_sv?: string | null
          checkin_url?: string | null
          created_at?: string
          description_eng?: string | null
          description_sv?: string | null
          door_signup_open?: boolean
          event_end?: string | null
          event_start?: string | null
          facebook_event?: string | null
          fb_album_url?: string | null
          feedback_aspects?: string[] | null
          feedback_mode?: string
          glow_color?: string | null
          has_casting_call?: boolean
          hashtags?: string | null
          id?: string
          image_id?: string | null
          intermission_playlist?: string | null
          is_english?: boolean
          location?: string | null
          photobooth_url?: string | null
          photographer?: string | null
          photographer_id?: string | null
          pinterest_link?: string | null
          print_archived?: boolean
          reveal_date?: string | null
          show_set1_locked?: boolean
          show_set2_locked?: boolean
          slug: string
          staff_recruitment_open?: boolean
          status?: Database['public']['Enums']['event_status']
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
          before_playlist?: string | null
          casting_call_deadline?: string | null
          casting_call_start?: string | null
          casting_info_eng?: string | null
          casting_info_sv?: string | null
          checkin_url?: string | null
          created_at?: string
          description_eng?: string | null
          description_sv?: string | null
          door_signup_open?: boolean
          event_end?: string | null
          event_start?: string | null
          facebook_event?: string | null
          fb_album_url?: string | null
          feedback_aspects?: string[] | null
          feedback_mode?: string
          glow_color?: string | null
          has_casting_call?: boolean
          hashtags?: string | null
          id?: string
          image_id?: string | null
          intermission_playlist?: string | null
          is_english?: boolean
          location?: string | null
          photobooth_url?: string | null
          photographer?: string | null
          photographer_id?: string | null
          pinterest_link?: string | null
          print_archived?: boolean
          reveal_date?: string | null
          show_set1_locked?: boolean
          show_set2_locked?: boolean
          slug?: string
          staff_recruitment_open?: boolean
          status?: Database['public']['Enums']['event_status']
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
            foreignKeyName: 'events_photographer_id_fkey'
            columns: ['photographer_id']
            isOneToOne: false
            referencedRelation: 'public_photographers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'events_photographer_id_fkey'
            columns: ['photographer_id']
            isOneToOne: false
            referencedRelation: 'staff_volunteers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'events_venue_id_fkey'
            columns: ['venue_id']
            isOneToOne: false
            referencedRelation: 'public_venues'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'events_venue_id_fkey'
            columns: ['venue_id']
            isOneToOne: false
            referencedRelation: 'venues'
            referencedColumns: ['id']
          },
        ]
      }
      feedback_custom_aspects: {
        Row: {
          created_at: string
          event_id: string | null
          in_template: boolean
          is_archived: boolean
          key: string
          label_eng: string
          label_sv: string
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          in_template?: boolean
          is_archived?: boolean
          key: string
          label_eng: string
          label_sv: string
        }
        Update: {
          created_at?: string
          event_id?: string | null
          in_template?: boolean
          is_archived?: boolean
          key?: string
          label_eng?: string
          label_sv?: string
        }
        Relationships: [
          {
            foreignKeyName: 'feedback_custom_aspects_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
        ]
      }
      info_reminders: {
        Row: {
          event_id: string
          id: string
          item: string
          performer_id: string | null
          reminded_at: string
          staff_id: string | null
        }
        Insert: {
          event_id: string
          id?: string
          item: string
          performer_id?: string | null
          reminded_at?: string
          staff_id?: string | null
        }
        Update: {
          event_id?: string
          id?: string
          item?: string
          performer_id?: string | null
          reminded_at?: string
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'info_reminders_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'info_reminders_performer_id_fkey'
            columns: ['performer_id']
            isOneToOne: false
            referencedRelation: 'performers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'info_reminders_performer_id_fkey'
            columns: ['performer_id']
            isOneToOne: false
            referencedRelation: 'public_performers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'info_reminders_staff_id_fkey'
            columns: ['staff_id']
            isOneToOne: false
            referencedRelation: 'public_photographers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'info_reminders_staff_id_fkey'
            columns: ['staff_id']
            isOneToOne: false
            referencedRelation: 'staff_volunteers'
            referencedColumns: ['id']
          },
        ]
      }
      info_template_items: {
        Row: {
          audiences: string[]
          body_eng: string | null
          body_sv: string | null
          key: string
          kind: string
          sort_order: number
          time_text: string | null
          title_eng: string | null
          title_sv: string | null
          updated_at: string
        }
        Insert: {
          audiences?: string[]
          body_eng?: string | null
          body_sv?: string | null
          key: string
          kind: string
          sort_order?: number
          time_text?: string | null
          title_eng?: string | null
          title_sv?: string | null
          updated_at?: string
        }
        Update: {
          audiences?: string[]
          body_eng?: string | null
          body_sv?: string | null
          key?: string
          kind?: string
          sort_order?: number
          time_text?: string | null
          title_eng?: string | null
          title_sv?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      marketing_posts: {
        Row: {
          content: string | null
          created_at: string
          event_id: string | null
          id: string
          is_posted: boolean
          post_date: string | null
          post_type: Database['public']['Enums']['marketing_post_type']
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
          post_type: Database['public']['Enums']['marketing_post_type']
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
          post_type?: Database['public']['Enums']['marketing_post_type']
          posted_at?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'marketing_posts_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
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
            foreignKeyName: 'old_event_images_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'old_events'
            referencedColumns: ['id']
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
          constant_key: string | null
          created_at: string
          description_eng: string | null
          description_sv: string | null
          display_order: number
          event_id: string | null
          id: string
          is_constant: boolean
          performer_id: string | null
          pick_up_cleaning: string | null
          set_number: number
          stage_preparations: string | null
          video_url: string | null
        }
        Insert: {
          act_name: string
          act_notes?: string | null
          audio_files?: Json | null
          constant_key?: string | null
          created_at?: string
          description_eng?: string | null
          description_sv?: string | null
          display_order?: number
          event_id?: string | null
          id?: string
          is_constant?: boolean
          performer_id?: string | null
          pick_up_cleaning?: string | null
          set_number?: number
          stage_preparations?: string | null
          video_url?: string | null
        }
        Update: {
          act_name?: string
          act_notes?: string | null
          audio_files?: Json | null
          constant_key?: string | null
          created_at?: string
          description_eng?: string | null
          description_sv?: string | null
          display_order?: number
          event_id?: string | null
          id?: string
          is_constant?: boolean
          performer_id?: string | null
          pick_up_cleaning?: string | null
          set_number?: number
          stage_preparations?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'performer_acts_performer_id_fkey'
            columns: ['performer_id']
            isOneToOne: false
            referencedRelation: 'performers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'performer_acts_performer_id_fkey'
            columns: ['performer_id']
            isOneToOne: false
            referencedRelation: 'public_performers'
            referencedColumns: ['id']
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
          language: Database['public']['Enums']['language']
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
          language?: Database['public']['Enums']['language']
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
          language?: Database['public']['Enums']['language']
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
      print_standard_items: {
        Row: {
          copies: number
          created_at: string
          id: string
          label: string
          page_size: string | null
          professional: boolean
          sort_order: number
        }
        Insert: {
          copies?: number
          created_at?: string
          id?: string
          label: string
          page_size?: string | null
          professional?: boolean
          sort_order?: number
        }
        Update: {
          copies?: number
          created_at?: string
          id?: string
          label?: string
          page_size?: string | null
          professional?: boolean
          sort_order?: number
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: boolean
        }
        Insert: {
          key: string
          updated_at?: string
          value?: boolean
        }
        Update: {
          key?: string
          updated_at?: string
          value?: boolean
        }
        Relationships: []
      }
      sponsors: {
        Row: {
          agreed_to_terms: boolean | null
          club_id: string | null
          created_at: string
          email: string | null
          has_sponsored: boolean
          id: string
          instagram_link: string | null
          language: Database['public']['Enums']['language']
          logo_id: string | null
          name: string
          other_link: string | null
          phone: string | null
          sponsor_details: string | null
          sponsor_type: Database['public']['Enums']['sponsor_type'] | null
        }
        Insert: {
          agreed_to_terms?: boolean | null
          club_id?: string | null
          created_at?: string
          email?: string | null
          has_sponsored?: boolean
          id?: string
          instagram_link?: string | null
          language?: Database['public']['Enums']['language']
          logo_id?: string | null
          name: string
          other_link?: string | null
          phone?: string | null
          sponsor_details?: string | null
          sponsor_type?: Database['public']['Enums']['sponsor_type'] | null
        }
        Update: {
          agreed_to_terms?: boolean | null
          club_id?: string | null
          created_at?: string
          email?: string | null
          has_sponsored?: boolean
          id?: string
          instagram_link?: string | null
          language?: Database['public']['Enums']['language']
          logo_id?: string | null
          name?: string
          other_link?: string | null
          phone?: string | null
          sponsor_details?: string | null
          sponsor_type?: Database['public']['Enums']['sponsor_type'] | null
        }
        Relationships: [
          {
            foreignKeyName: 'sponsors_club_id_fkey'
            columns: ['club_id']
            isOneToOne: false
            referencedRelation: 'clubs'
            referencedColumns: ['id']
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
          language: Database['public']['Enums']['language']
          link: string | null
          name: string
          phone: string | null
          role: Database['public']['Enums']['staff_volunteer_type']
          role_details: string | null
          worked_with: boolean | null
        }
        Insert: {
          agreed_to_terms?: boolean | null
          created_at?: string
          email?: string | null
          fee?: number | null
          id?: string
          language?: Database['public']['Enums']['language']
          link?: string | null
          name: string
          phone?: string | null
          role?: Database['public']['Enums']['staff_volunteer_type']
          role_details?: string | null
          worked_with?: boolean | null
        }
        Update: {
          agreed_to_terms?: boolean | null
          created_at?: string
          email?: string | null
          fee?: number | null
          id?: string
          language?: Database['public']['Enums']['language']
          link?: string | null
          name?: string
          phone?: string | null
          role?: Database['public']['Enums']['staff_volunteer_type']
          role_details?: string | null
          worked_with?: boolean | null
        }
        Relationships: []
      }
      todos: {
        Row: {
          created_at: string
          details: string | null
          display_order: number
          due_date: string | null
          event_id: string | null
          id: string
          is_done: boolean
          is_recurring: boolean
          source: string | null
          title: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          display_order?: number
          due_date?: string | null
          event_id?: string | null
          id?: string
          is_done?: boolean
          is_recurring?: boolean
          source?: string | null
          title: string
        }
        Update: {
          created_at?: string
          details?: string | null
          display_order?: number
          due_date?: string | null
          event_id?: string | null
          id?: string
          is_done?: boolean
          is_recurring?: boolean
          source?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: 'todos_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
        ]
      }
      venues: {
        Row: {
          contact_person: string | null
          created_at: string
          door_code: string | null
          email: string | null
          has_hosted: boolean
          id: string
          language: Database['public']['Enums']['language']
          location: string
          map_link: string
          name: string
          nearest_stop: string | null
          phone: string | null
          practical_info_eng: string | null
          practical_info_sv: string | null
          price: number | null
        }
        Insert: {
          contact_person?: string | null
          created_at?: string
          door_code?: string | null
          email?: string | null
          has_hosted?: boolean
          id?: string
          language?: Database['public']['Enums']['language']
          location: string
          map_link: string
          name: string
          nearest_stop?: string | null
          phone?: string | null
          practical_info_eng?: string | null
          practical_info_sv?: string | null
          price?: number | null
        }
        Update: {
          contact_person?: string | null
          created_at?: string
          door_code?: string | null
          email?: string | null
          has_hosted?: boolean
          id?: string
          language?: Database['public']['Enums']['language']
          location?: string
          map_link?: string
          name?: string
          nearest_stop?: string | null
          phone?: string | null
          practical_info_eng?: string | null
          practical_info_sv?: string | null
          price?: number | null
        }
        Relationships: []
      }
      vip_checkins: {
        Row: {
          checked_at: string
          entry_key: string
          event_id: string
        }
        Insert: {
          checked_at?: string
          entry_key: string
          event_id: string
        }
        Update: {
          checked_at?: string
          entry_key?: string
          event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'vip_checkins_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
        ]
      }
      vip_manual_entries: {
        Row: {
          category: Database['public']['Enums']['vip_entry_category']
          created_at: string
          email: string | null
          event_id: string
          id: string
          name: string
          note: string | null
        }
        Insert: {
          category?: Database['public']['Enums']['vip_entry_category']
          created_at?: string
          email?: string | null
          event_id: string
          id?: string
          name: string
          note?: string | null
        }
        Update: {
          category?: Database['public']['Enums']['vip_entry_category']
          created_at?: string
          email?: string | null
          event_id?: string
          id?: string
          name?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'vip_manual_entries_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      public_event_entertainers: {
        Row: {
          bio_eng: string | null
          bio_sv: string | null
          created_at: string | null
          event_id: string | null
          id: string | null
          image_id: string | null
          instagram_link: string | null
          name: string | null
          other_link: string | null
          photo_credit: string | null
          staff_id: string | null
          title_eng: string | null
          title_sv: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'event_staff_volunteers_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_staff_volunteers_staff_id_fkey'
            columns: ['staff_id']
            isOneToOne: false
            referencedRelation: 'public_photographers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_staff_volunteers_staff_id_fkey'
            columns: ['staff_id']
            isOneToOne: false
            referencedRelation: 'staff_volunteers'
            referencedColumns: ['id']
          },
        ]
      }
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
          role: Database['public']['Enums']['staff_volunteer_type'] | null
        }
        Insert: {
          id?: string | null
          link?: string | null
          name?: string | null
          role?: Database['public']['Enums']['staff_volunteer_type'] | null
        }
        Update: {
          id?: string | null
          link?: string | null
          name?: string | null
          role?: Database['public']['Enums']['staff_volunteer_type'] | null
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
      add_door_spot: {
        Args: { p_slot_start: string; p_token: string }
        Returns: undefined
      }
      cancel_confirmed_booking: {
        Args: {
          p_application_id: string
          p_new_review_status: Database['public']['Enums']['casting_review_status']
        }
        Returns: Json
      }
      claim_door_slot: {
        Args: { p_name: string; p_slot_id: string; p_token: string }
        Returns: undefined
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
      event_feedback_is_open: { Args: { p_event_id: string }; Returns: boolean }
      event_feedback_opens_at: { Args: { p_event_id: string }; Returns: string }
      event_status_handler: { Args: never; Returns: undefined }
      get_casting_application_by_token: {
        Args: { p_id: string; p_token: string }
        Returns: Json
      }
      get_event_document_data: {
        Args: { p_doc: string; p_token: string }
        Returns: Json
      }
      get_event_feedback_averages: {
        Args: { p_min?: number }
        Returns: {
          average: number
          count: number
          event_id: string
        }[]
      }
      get_event_feedback_reviews: {
        Args: { p_event_id: string; p_limit?: number; p_offset?: number }
        Returns: Json
      }
      get_event_feedback_summary: {
        Args: { p_event_id: string; p_min?: number }
        Returns: Json
      }
      get_event_info: { Args: { p_token: string }; Returns: Json }
      get_feedback_event: { Args: { p_slug: string }; Returns: Json }
      get_vip_checkins: { Args: { p_token: string }; Returns: string[] }
      release_door_slot: {
        Args: { p_slot_id: string; p_token: string }
        Returns: undefined
      }
      set_vip_checkin: {
        Args: { p_checked: boolean; p_key: string; p_token: string }
        Returns: undefined
      }
      submit_casting_application: {
        Args: { p_acts: Json; p_application: Json }
        Returns: string
      }
      submit_event_feedback: {
        Args: {
          p_aspects?: Json
          p_been_before?: string
          p_event_id: string
          p_extra_comment?: string
          p_how_found?: string
          p_how_found_note?: string
          p_improve?: string
          p_language?: string
          p_liked?: string
          p_may_quote?: boolean
          p_rating: number
          p_review?: string
          p_token: string
          p_would_recommend?: string
          p_would_recommend_note?: string
        }
        Returns: undefined
      }
      unaccent: { Args: { '': string }; Returns: string }
      update_event_performer_via_token: {
        Args: {
          p_access_token: string
          p_artist_note?: string
          p_dietary_category?: Database['public']['Enums']['dietary_category']
          p_dietary_requirements?: string
          p_event_id: string
          p_notes?: string
          p_performer_id: string
          p_plus_one_email?: string
          p_plus_one_name?: string
          p_plus_one_needs_accommodation?: boolean
          p_travel_covered?: number
          p_travel_receipts?: Json
          p_travels_by_car?: boolean
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
    }
    Enums: {
      booking_status_type:
        | 'not_contacted'
        | 'negotiating'
        | 'pending_confirmation'
        | 'confirmed'
        | 'declined'
        | 'cancelled'
      casting_review_status: 'pending' | 'yes' | 'maybe' | 'no'
      dietary_category: 'all_eater' | 'vegetarian' | 'vegan'
      event_performer_role: 'performer' | 'host' | 'headliner'
      event_staff_invitation_status:
        | 'interested'
        | 'invited'
        | 'confirmed'
        | 'declined'
        | 'not_needed'
      event_status: 'draft' | 'published' | 'cancelled' | 'archived'
      language: 'sv' | 'eng'
      marketing_post_type:
        | 'save_the_date'
        | 'casting_call_open'
        | 'ticket_release'
        | 'custom'
        | 'facebook_event'
        | 'casting_call_closed'
        | 'ticket_countdown'
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
        | 'photos_shared'
      sponsor_type: 'prize' | 'creation' | 'sales' | 'promo' | 'partner' | 'other'
      staff_volunteer_type:
        | 'photographer'
        | 'technician'
        | 'dj'
        | 'stage_kitten'
        | 'entertainment'
        | 'volunteer'
        | 'doorman'
        | 'other'
        | 'board'
      vip_entry_category: 'ticket_winner' | 'contest_winner' | 'other'
      volunteer_shift: 'driving' | 'setup' | 'guestlist' | 'takedown'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      booking_status_type: [
        'not_contacted',
        'negotiating',
        'pending_confirmation',
        'confirmed',
        'declined',
        'cancelled',
      ],
      casting_review_status: ['pending', 'yes', 'maybe', 'no'],
      dietary_category: ['all_eater', 'vegetarian', 'vegan'],
      event_performer_role: ['performer', 'host', 'headliner'],
      event_staff_invitation_status: [
        'interested',
        'invited',
        'confirmed',
        'declined',
        'not_needed',
      ],
      event_status: ['draft', 'published', 'cancelled', 'archived'],
      language: ['sv', 'eng'],
      marketing_post_type: [
        'save_the_date',
        'casting_call_open',
        'ticket_release',
        'custom',
        'facebook_event',
        'casting_call_closed',
        'ticket_countdown',
        'pinterest_board',
        'volunteers_needed',
        'artists_soon',
        'artists_all_together',
        'sponsors_sales_table',
        'contest',
        'photo_corner',
        'venue_rules',
        'evening_schedule',
        'one_week_left',
        'share_like_invite',
        'evening_schedule_reminder',
        'lets_go',
        'thank_you',
        'evaluation',
        'photos_shared',
      ],
      sponsor_type: ['prize', 'creation', 'sales', 'promo', 'partner', 'other'],
      staff_volunteer_type: [
        'photographer',
        'technician',
        'dj',
        'stage_kitten',
        'entertainment',
        'volunteer',
        'doorman',
        'other',
        'board',
      ],
      vip_entry_category: ['ticket_winner', 'contest_winner', 'other'],
      volunteer_shift: ['driving', 'setup', 'guestlist', 'takedown'],
    },
  },
} as const
