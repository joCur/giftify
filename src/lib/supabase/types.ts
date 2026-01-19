export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      claim_history_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          item_claim_id: string | null
          metadata: Json | null
          split_claim_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          item_claim_id?: string | null
          metadata?: Json | null
          split_claim_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          item_claim_id?: string | null
          metadata?: Json | null
          split_claim_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "claim_history_events_item_claim_id_fkey"
            columns: ["item_claim_id"]
            isOneToOne: false
            referencedRelation: "item_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_history_events_split_claim_id_fkey"
            columns: ["split_claim_id"]
            isOneToOne: false
            referencedRelation: "split_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_history_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: Database["public"]["Enums"]["friendship_status"]
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: Database["public"]["Enums"]["friendship_status"]
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: Database["public"]["Enums"]["friendship_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string
          expires_at: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          expires_at: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invite_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_codes_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      item_claims: {
        Row: {
          cancelled_at: string | null
          claimed_by: string
          created_at: string
          fulfilled_at: string | null
          id: string
          item_id: string
          status: Database["public"]["Enums"]["claim_status"]
        }
        Insert: {
          cancelled_at?: string | null
          claimed_by: string
          created_at?: string
          fulfilled_at?: string | null
          id?: string
          item_id: string
          status?: Database["public"]["Enums"]["claim_status"]
        }
        Update: {
          cancelled_at?: string | null
          claimed_by?: string
          created_at?: string
          fulfilled_at?: string | null
          id?: string
          item_id?: string
          status?: Database["public"]["Enums"]["claim_status"]
        }
        Relationships: [
          {
            foreignKeyName: "item_claims_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_claims_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "wishlist_items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_ownership_flags: {
        Row: {
          created_at: string
          flagged_by: string
          id: string
          item_id: string
          resolved_at: string | null
          status: Database["public"]["Enums"]["ownership_flag_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          flagged_by: string
          id?: string
          item_id: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ownership_flag_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          flagged_by?: string
          id?: string
          item_id?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ownership_flag_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_ownership_flags_flagged_by_fkey"
            columns: ["flagged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_ownership_flags_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "wishlist_items"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_categories: {
        Row: {
          created_at: string
          default_channels: Json
          default_enabled: boolean
          description: string | null
          icon: string | null
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          default_channels?: Json
          default_enabled?: boolean
          description?: string | null
          icon?: string | null
          id: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          default_channels?: Json
          default_enabled?: boolean
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          birthday_reminder_days: number
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          birthday_reminder_days?: number
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          birthday_reminder_days?: number
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences_v2: {
        Row: {
          category_id: string
          channels: Json
          created_at: string
          enabled: boolean
          id: string
          settings: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id: string
          channels?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          settings?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string
          channels?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          settings?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_v2_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "notification_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_v2_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_type_categories: {
        Row: {
          category_id: string
          type: Database["public"]["Enums"]["notification_type_v2"]
        }
        Insert: {
          category_id: string
          type: Database["public"]["Enums"]["notification_type_v2"]
        }
        Update: {
          category_id?: string
          type?: Database["public"]["Enums"]["notification_type_v2"]
        }
        Relationships: [
          {
            foreignKeyName: "notification_type_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "notification_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          friendship_id: string | null
          id: string
          is_read: boolean
          item_id: string | null
          message: string
          ownership_flag_id: string | null
          split_claim_id: string | null
          status: Database["public"]["Enums"]["notification_status"]
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
          wishlist_id: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          friendship_id?: string | null
          id?: string
          is_read?: boolean
          item_id?: string | null
          message: string
          ownership_flag_id?: string | null
          split_claim_id?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
          wishlist_id?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          friendship_id?: string | null
          id?: string
          is_read?: boolean
          item_id?: string | null
          message?: string
          ownership_flag_id?: string | null
          split_claim_id?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
          wishlist_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_friendship_id_fkey"
            columns: ["friendship_id"]
            isOneToOne: false
            referencedRelation: "friendships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "wishlist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_ownership_flag_id_fkey"
            columns: ["ownership_flag_id"]
            isOneToOne: false
            referencedRelation: "item_ownership_flags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_split_claim_id_fkey"
            columns: ["split_claim_id"]
            isOneToOne: false
            referencedRelation: "split_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_wishlist_id_fkey"
            columns: ["wishlist_id"]
            isOneToOne: false
            referencedRelation: "wishlist_item_counts"
            referencedColumns: ["wishlist_id"]
          },
          {
            foreignKeyName: "notifications_wishlist_id_fkey"
            columns: ["wishlist_id"]
            isOneToOne: false
            referencedRelation: "wishlists"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications_v2: {
        Row: {
          action_completed_at: string | null
          action_url: string | null
          category_id: string
          created_at: string
          dedup_key: string | null
          expires_at: string | null
          group_key: string | null
          id: string
          metadata: Json
          priority: number | null
          read_at: string | null
          status: Database["public"]["Enums"]["notification_status_v2"]
          type: Database["public"]["Enums"]["notification_type_v2"]
          user_id: string
        }
        Insert: {
          action_completed_at?: string | null
          action_url?: string | null
          category_id: string
          created_at?: string
          dedup_key?: string | null
          expires_at?: string | null
          group_key?: string | null
          id?: string
          metadata: Json
          priority?: number | null
          read_at?: string | null
          status?: Database["public"]["Enums"]["notification_status_v2"]
          type: Database["public"]["Enums"]["notification_type_v2"]
          user_id: string
        }
        Update: {
          action_completed_at?: string | null
          action_url?: string | null
          category_id?: string
          created_at?: string
          dedup_key?: string | null
          expires_at?: string | null
          group_key?: string | null
          id?: string
          metadata?: Json
          priority?: number | null
          read_at?: string | null
          status?: Database["public"]["Enums"]["notification_status_v2"]
          type?: Database["public"]["Enums"]["notification_type_v2"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_v2_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "notification_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_v2_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birthday: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          birthday?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          birthday?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      split_claim_participants: {
        Row: {
          id: string
          joined_at: string
          split_claim_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          split_claim_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          split_claim_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "split_claim_participants_split_claim_id_fkey"
            columns: ["split_claim_id"]
            isOneToOne: false
            referencedRelation: "split_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "split_claim_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      split_claims: {
        Row: {
          cancelled_at: string | null
          claim_status: Database["public"]["Enums"]["claim_status"]
          confirmed_at: string | null
          created_at: string
          fulfilled_at: string | null
          id: string
          initiated_by: string
          item_id: string
          status: Database["public"]["Enums"]["split_claim_status"]
          target_participants: number
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          claim_status?: Database["public"]["Enums"]["claim_status"]
          confirmed_at?: string | null
          created_at?: string
          fulfilled_at?: string | null
          id?: string
          initiated_by: string
          item_id: string
          status?: Database["public"]["Enums"]["split_claim_status"]
          target_participants: number
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          claim_status?: Database["public"]["Enums"]["claim_status"]
          confirmed_at?: string | null
          created_at?: string
          fulfilled_at?: string | null
          id?: string
          initiated_by?: string
          item_id?: string
          status?: Database["public"]["Enums"]["split_claim_status"]
          target_participants?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "split_claims_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "split_claims_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "wishlist_items"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist_collaborators: {
        Row: {
          id: string
          invited_at: string
          invited_by: string
          user_id: string
          wishlist_id: string
        }
        Insert: {
          id?: string
          invited_at?: string
          invited_by: string
          user_id: string
          wishlist_id: string
        }
        Update: {
          id?: string
          invited_at?: string
          invited_by?: string
          user_id?: string
          wishlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_collaborators_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_collaborators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_collaborators_wishlist_id_fkey"
            columns: ["wishlist_id"]
            isOneToOne: false
            referencedRelation: "wishlist_item_counts"
            referencedColumns: ["wishlist_id"]
          },
          {
            foreignKeyName: "wishlist_collaborators_wishlist_id_fkey"
            columns: ["wishlist_id"]
            isOneToOne: false
            referencedRelation: "wishlists"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist_items: {
        Row: {
          created_at: string
          currency: string | null
          custom_image_url: string | null
          description: string | null
          id: string
          image_url: string | null
          is_purchased: boolean
          is_received: boolean
          notes: string | null
          price: string | null
          title: string
          updated_at: string
          url: string | null
          wishlist_id: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          custom_image_url?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_purchased?: boolean
          is_received?: boolean
          notes?: string | null
          price?: string | null
          title: string
          updated_at?: string
          url?: string | null
          wishlist_id: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          custom_image_url?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_purchased?: boolean
          is_received?: boolean
          notes?: string | null
          price?: string | null
          title?: string
          updated_at?: string
          url?: string | null
          wishlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_wishlist_id_fkey"
            columns: ["wishlist_id"]
            isOneToOne: false
            referencedRelation: "wishlist_item_counts"
            referencedColumns: ["wishlist_id"]
          },
          {
            foreignKeyName: "wishlist_items_wishlist_id_fkey"
            columns: ["wishlist_id"]
            isOneToOne: false
            referencedRelation: "wishlists"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist_selected_friends: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          wishlist_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          wishlist_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          wishlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_selected_friends_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_selected_friends_wishlist_id_fkey"
            columns: ["wishlist_id"]
            isOneToOne: false
            referencedRelation: "wishlist_item_counts"
            referencedColumns: ["wishlist_id"]
          },
          {
            foreignKeyName: "wishlist_selected_friends_wishlist_id_fkey"
            columns: ["wishlist_id"]
            isOneToOne: false
            referencedRelation: "wishlists"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlists: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_archived: boolean
          is_joint: boolean
          name: string
          privacy: Database["public"]["Enums"]["wishlist_privacy"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          is_joint?: boolean
          name: string
          privacy?: Database["public"]["Enums"]["wishlist_privacy"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          is_joint?: boolean
          name?: string
          privacy?: Database["public"]["Enums"]["wishlist_privacy"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      wishlist_item_counts: {
        Row: {
          available_items: number | null
          owner_id: string | null
          total_items: number | null
          wishlist_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_user_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      are_friends: {
        Args: { user1_id: string; user2_id: string }
        Returns: boolean
      }
      can_edit_wishlist: {
        Args: { target_user_id: string; target_wishlist_id: string }
        Returns: boolean
      }
      can_view_split_claim_as_friend: {
        Args: { target_split_claim_id: string; target_user_id: string }
        Returns: boolean
      }
      can_view_wishlist: {
        Args: { viewer_id: string; wishlist_id: string }
        Returns: boolean
      }
      consume_invite_and_befriend: {
        Args: { invite_code: string; new_user_id: string }
        Returns: undefined
      }
      create_notification_v2: {
        Args: {
          p_action_url?: string
          p_dedup_key?: string
          p_group_key?: string
          p_metadata: Json
          p_priority?: number
          p_type: Database["public"]["Enums"]["notification_type_v2"]
          p_user_ids: string[]
        }
        Returns: number
      }
      fulfill_claims_for_item: {
        Args: { p_item_id: string; p_owner_id?: string }
        Returns: {
          claim_id: string
          claim_type: string
          claimer_ids: string[]
        }[]
      }
      get_friend_ids: { Args: { p_user_id: string }; Returns: string[] }
      get_split_participant_ids: {
        Args: { p_exclude_user_id?: string; p_split_claim_id: string }
        Returns: string[]
      }
      is_primary_owner: {
        Args: { target_user_id: string; target_wishlist_id: string }
        Returns: boolean
      }
      is_split_claim_initiator: {
        Args: { target_split_claim_id: string; target_user_id: string }
        Returns: boolean
      }
      is_split_claim_participant: {
        Args: { target_split_claim_id: string; target_user_id: string }
        Returns: boolean
      }
      is_split_claim_pending: {
        Args: { target_split_claim_id: string }
        Returns: boolean
      }
      is_wishlist_collaborator: {
        Args: { target_user_id: string; target_wishlist_id: string }
        Returns: boolean
      }
      validate_invite_code: {
        Args: { invite_code: string }
        Returns: {
          error_message: string
          inviter_id: string
          inviter_name: string
          valid: boolean
        }[]
      }
    }
    Enums: {
      claim_status: "active" | "cancelled" | "fulfilled"
      friendship_status: "pending" | "accepted" | "declined"
      notification_status: "inbox" | "archived"
      notification_status_v2: "inbox" | "archived" | "deleted"
      notification_type:
        | "friend_request_received"
        | "friend_request_accepted"
        | "birthday_reminder"
        | "item_added"
        | "wishlist_created"
        | "split_initiated"
        | "split_joined"
        | "split_left"
        | "split_confirmed"
        | "split_cancelled"
        | "item_flagged_already_owned"
        | "flag_confirmed"
        | "flag_denied"
        | "wishlist_archived"
        | "collaborator_invited"
        | "collaborator_left"
        | "gift_received"
        | "gift_marked_given"
      notification_type_v2:
        | "friend_request_received"
        | "friend_request_accepted"
        | "birthday_reminder"
        | "wishlist_created"
        | "wishlist_archived"
        | "item_added"
        | "split_initiated"
        | "split_joined"
        | "split_left"
        | "split_confirmed"
        | "split_cancelled"
        | "gift_received"
        | "gift_marked_given"
        | "item_flagged_already_owned"
        | "flag_confirmed"
        | "flag_denied"
        | "collaborator_invited"
        | "collaborator_left"
      ownership_flag_status: "pending" | "confirmed" | "denied"
      split_claim_status: "pending" | "confirmed"
      wishlist_privacy: "public" | "friends" | "private" | "selected_friends"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      claim_status: ["active", "cancelled", "fulfilled"],
      friendship_status: ["pending", "accepted", "declined"],
      notification_status: ["inbox", "archived"],
      notification_status_v2: ["inbox", "archived", "deleted"],
      notification_type: [
        "friend_request_received",
        "friend_request_accepted",
        "birthday_reminder",
        "item_added",
        "wishlist_created",
        "split_initiated",
        "split_joined",
        "split_left",
        "split_confirmed",
        "split_cancelled",
        "item_flagged_already_owned",
        "flag_confirmed",
        "flag_denied",
        "wishlist_archived",
        "collaborator_invited",
        "collaborator_left",
        "gift_received",
        "gift_marked_given",
      ],
      notification_type_v2: [
        "friend_request_received",
        "friend_request_accepted",
        "birthday_reminder",
        "wishlist_created",
        "wishlist_archived",
        "item_added",
        "split_initiated",
        "split_joined",
        "split_left",
        "split_confirmed",
        "split_cancelled",
        "gift_received",
        "gift_marked_given",
        "item_flagged_already_owned",
        "flag_confirmed",
        "flag_denied",
        "collaborator_invited",
        "collaborator_left",
      ],
      ownership_flag_status: ["pending", "confirmed", "denied"],
      split_claim_status: ["pending", "confirmed"],
      wishlist_privacy: ["public", "friends", "private", "selected_friends"],
    },
  },
} as const

