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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      act_images: {
        Row: {
          act_id: string
          alt_text: string | null
          created_at: string
          id: string
          image_id: string
        }
        Insert: {
          act_id: string
          alt_text?: string | null
          created_at?: string
          id?: string
          image_id: string
        }
        Update: {
          act_id?: string
          alt_text?: string | null
          created_at?: string
          id?: string
          image_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "act_images_act_id_fkey"
            columns: ["act_id"]
            isOneToOne: false
            referencedRelation: "performer_acts"
            referencedColumns: ["id"]
          },
        ]
      }
      casting_applications: {
        Row: {
          act_description: string | null
          act_title: string
          admin_notes: string | null
          agreed_to_terms: boolean
          city: string | null
          country: string | null
          created_at: string
          display_order: number | null
          email: string
          event_id: string
          facebook_link: string | null
          id: string
          instagram_link: string | null
          language: Database["public"]["Enums"]["language"]
          other_link: string | null
          performer_name: string
          promo_image_id: string | null
          promo_text: string | null
          review_status: Database["public"]["Enums"]["casting_review_status"]
          slug: string | null
          video_url: string | null
        }
        Insert: {
          act_description?: string | null
          act_title: string
          admin_notes?: string | null
          agreed_to_terms?: boolean
          city?: string | null
          country?: string | null
          created_at?: string
          display_order?: number | null
          email: string
          event_id: string
          facebook_link?: string | null
          id?: string
          instagram_link?: string | null
          language?: Database["public"]["Enums"]["language"]
          other_link?: string | null
          performer_name: string
          promo_image_id?: string | null
          promo_text?: string | null
          review_status?: Database["public"]["Enums"]["casting_review_status"]
          slug?: string | null
          video_url?: string | null
        }
        Update: {
          act_description?: string | null
          act_title?: string
          admin_notes?: string | null
          agreed_to_terms?: boolean
          city?: string | null
          country?: string | null
          created_at?: string
          display_order?: number | null
          email?: string
          event_id?: string
          facebook_link?: string | null
          id?: string
          instagram_link?: string | null
          language?: Database["public"]["Enums"]["language"]
          other_link?: string | null
          performer_name?: string
          promo_image_id?: string | null
          promo_text?: string | null
          review_status?: Database["public"]["Enums"]["casting_review_status"]
          slug?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "casting_applications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
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
          created_at: string
          display_order: number
          event_id: string
          is_revealed: boolean
          performer_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          event_id: string
          is_revealed?: boolean
          performer_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          event_id?: string
          is_revealed?: boolean
          performer_id?: string
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
        ]
      }
      event_sponsors: {
        Row: {
          created_at: string
          event_id: string
          role: Database["public"]["Enums"]["sponsor_type"] | null
          sponsor_id: string
        }
        Insert: {
          created_at?: string
          event_id?: string
          role?: Database["public"]["Enums"]["sponsor_type"] | null
          sponsor_id?: string
        }
        Update: {
          created_at?: string
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
      event_staff_volunteers: {
        Row: {
          created_at: string
          event_id: string
          role: Database["public"]["Enums"]["staff_volunteer_type"]
          role_details: string | null
          staff_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          role?: Database["public"]["Enums"]["staff_volunteer_type"]
          role_details?: string | null
          staff_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
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
            referencedRelation: "staff_volunteers"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          available_tickets: number | null
          casting_call_deadline: string | null
          created_at: string
          description_eng: string | null
          description_sv: string | null
          event_end: string | null
          event_start: string | null
          fb_album_url: string | null
          glow_color: string | null
          has_casting_call: boolean
          id: string
          image_id: string | null
          location: string | null
          photobooth_url: string | null
          photographer: string | null
          pinterest_link: string | null
          reveal_date: string | null
          slug: string
          status: Database["public"]["Enums"]["event_status"]
          subtitle: string | null
          ticket_url: string | null
          tickets_price: number | null
          tickets_sold: number | null
          title: string
          updated_at: string
        }
        Insert: {
          available_tickets?: number | null
          casting_call_deadline?: string | null
          created_at?: string
          description_eng?: string | null
          description_sv?: string | null
          event_end?: string | null
          event_start?: string | null
          fb_album_url?: string | null
          glow_color?: string | null
          has_casting_call?: boolean
          id?: string
          image_id?: string | null
          location?: string | null
          photobooth_url?: string | null
          photographer?: string | null
          pinterest_link?: string | null
          reveal_date?: string | null
          slug: string
          status?: Database["public"]["Enums"]["event_status"]
          subtitle?: string | null
          ticket_url?: string | null
          tickets_price?: number | null
          tickets_sold?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          available_tickets?: number | null
          casting_call_deadline?: string | null
          created_at?: string
          description_eng?: string | null
          description_sv?: string | null
          event_end?: string | null
          event_start?: string | null
          fb_album_url?: string | null
          glow_color?: string | null
          has_casting_call?: boolean
          id?: string
          image_id?: string | null
          location?: string | null
          photobooth_url?: string | null
          photographer?: string | null
          pinterest_link?: string | null
          reveal_date?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["event_status"]
          subtitle?: string | null
          ticket_url?: string | null
          tickets_price?: number | null
          tickets_sold?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
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
          created_at: string
          description_eng: string | null
          description_sv: string | null
          event_id: string | null
          id: string
          performer_id: string
          video_url: string | null
        }
        Insert: {
          act_name: string
          created_at?: string
          description_eng?: string | null
          description_sv?: string | null
          event_id?: string | null
          id?: string
          performer_id: string
          video_url?: string | null
        }
        Update: {
          act_name?: string
          created_at?: string
          description_eng?: string | null
          description_sv?: string | null
          event_id?: string | null
          id?: string
          performer_id?: string
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
        ]
      }
      performer_images: {
        Row: {
          alt_text: string | null
          created_at: string
          display_order: number
          id: string
          image_id: string
          perfomer_slug: string | null
          performer_id: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_id: string
          perfomer_slug?: string | null
          performer_id: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_id?: string
          perfomer_slug?: string | null
          performer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "performer_images_performer_id_fkey"
            columns: ["performer_id"]
            isOneToOne: false
            referencedRelation: "performers"
            referencedColumns: ["id"]
          },
        ]
      }
      performers: {
        Row: {
          bio_eng: string | null
          bio_sv: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          facebook_link: string | null
          id: string
          image_id: string | null
          instagram_link: string | null
          language: Database["public"]["Enums"]["language"]
          name: string
          other_link: string | null
          phone: string | null
          slug: string
        }
        Insert: {
          bio_eng?: string | null
          bio_sv?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          facebook_link?: string | null
          id?: string
          image_id?: string | null
          instagram_link?: string | null
          language?: Database["public"]["Enums"]["language"]
          name: string
          other_link?: string | null
          phone?: string | null
          slug: string
        }
        Update: {
          bio_eng?: string | null
          bio_sv?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          facebook_link?: string | null
          id?: string
          image_id?: string | null
          instagram_link?: string | null
          language?: Database["public"]["Enums"]["language"]
          name?: string
          other_link?: string | null
          phone?: string | null
          slug?: string
        }
        Relationships: []
      }
      sponsors: {
        Row: {
          created_at: string
          email: string | null
          id: string
          images_id: string[] | null
          logo_id: string | null
          name: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          images_id?: string[] | null
          logo_id?: string | null
          name: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          images_id?: string[] | null
          logo_id?: string | null
          name?: string
        }
        Relationships: []
      }
      staff_volunteers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          role: Database["public"]["Enums"]["staff_volunteer_type"]
          role_details: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          role?: Database["public"]["Enums"]["staff_volunteer_type"]
          role_details?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["staff_volunteer_type"]
          role_details?: string | null
        }
        Relationships: []
      }
      venues: {
        Row: {
          contact_person: string | null
          created_at: string
          email: string | null
          id: number
          location: string | null
          name: string
          phone: string | null
          price: number | null
        }
        Insert: {
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: number
          location?: string | null
          name: string
          phone?: string | null
          price?: number | null
        }
        Update: {
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: number
          location?: string | null
          name?: string
          phone?: string | null
          price?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      event_status_handler: { Args: never; Returns: undefined }
    }
    Enums: {
      casting_review_status: "pending" | "yes" | "maybe" | "no"
      event_status: "draft" | "published" | "cancelled" | "archived"
      language: "sv" | "eng"
      sponsor_type:
        | "prize"
        | "lottery"
        | "sales"
        | "promo"
        | "partner"
        | "other"
      staff_volunteer_type:
        | "photographer"
        | "technician"
        | "doorman"
        | "staff"
        | "volunteer"
        | "musician"
        | "entertainment"
        | "other"
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
      casting_review_status: ["pending", "yes", "maybe", "no"],
      event_status: ["draft", "published", "cancelled", "archived"],
      language: ["sv", "eng"],
      sponsor_type: ["prize", "lottery", "sales", "promo", "partner", "other"],
      staff_volunteer_type: [
        "photographer",
        "technician",
        "doorman",
        "staff",
        "volunteer",
        "musician",
        "entertainment",
        "other",
      ],
    },
  },
} as const
