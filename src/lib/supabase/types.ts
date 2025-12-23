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
      item_claims: {
        Row: {
          claimed_by: string
          created_at: string
          id: string
          item_id: string
        }
        Insert: {
          claimed_by: string
          created_at?: string
          id?: string
          item_id: string
        }
        Update: {
          claimed_by?: string
          created_at?: string
          id?: string
          item_id?: string
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
            isOneToOne: true
            referencedRelation: "wishlist_items"
            referencedColumns: ["id"]
          },
        ]
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
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          friendship_id: string | null
          id: string
          is_read: boolean
          item_id: string | null
          message: string
          split_claim_id: string | null
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
          split_claim_id?: string | null
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
          split_claim_id?: string | null
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
            referencedRelation: "wishlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_split_claim_id_fkey"
            columns: ["split_claim_id"]
            isOneToOne: false
            referencedRelation: "split_claims"
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
          confirmed_at: string | null
          created_at: string
          id: string
          initiated_by: string
          item_id: string
          status: Database["public"]["Enums"]["split_claim_status"]
          target_participants: number
          updated_at: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          id?: string
          initiated_by: string
          item_id: string
          status?: Database["public"]["Enums"]["split_claim_status"]
          target_participants: number
          updated_at?: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
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
            isOneToOne: true
            referencedRelation: "wishlist_items"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist_items: {
        Row: {
          created_at: string
          currency: string | null
          description: string | null
          id: string
          image_url: string | null
          is_purchased: boolean
          notes: string | null
          price: string | null
          title: string
          updated_at: string
          url: string
          wishlist_id: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_purchased?: boolean
          notes?: string | null
          price?: string | null
          title: string
          updated_at?: string
          url: string
          wishlist_id: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_purchased?: boolean
          notes?: string | null
          price?: string | null
          title?: string
          updated_at?: string
          url?: string
          wishlist_id?: string
        }
        Relationships: [
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
          name: string
          privacy: Database["public"]["Enums"]["wishlist_privacy"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          privacy?: Database["public"]["Enums"]["wishlist_privacy"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
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
      [_ in never]: never
    }
    Functions: {
      are_friends: {
        Args: { user1_id: string; user2_id: string }
        Returns: boolean
      }
      can_view_wishlist: {
        Args: { viewer_id: string; wishlist_id: string }
        Returns: boolean
      }
      notify_friends: {
        Args: {
          p_item_id?: string
          p_message: string
          p_title: string
          p_type: Database["public"]["Enums"]["notification_type"]
          p_user_id: string
          p_wishlist_id?: string
        }
        Returns: undefined
      }
      send_birthday_reminders: { Args: never; Returns: undefined }
    }
    Enums: {
      friendship_status: "pending" | "accepted" | "declined"
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
      friendship_status: ["pending", "accepted", "declined"],
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
      ],
      split_claim_status: ["pending", "confirmed"],
      wishlist_privacy: ["public", "friends", "private", "selected_friends"],
    },
  },
} as const

// Helper types for easier usage
export type WishlistPrivacy = Database["public"]["Enums"]["wishlist_privacy"];
export type FriendshipStatus = Database["public"]["Enums"]["friendship_status"];
export type NotificationType = Database["public"]["Enums"]["notification_type"];
export type SplitClaimStatus = Database["public"]["Enums"]["split_claim_status"];

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Wishlist = Database["public"]["Tables"]["wishlists"]["Row"];
export type WishlistItem = Database["public"]["Tables"]["wishlist_items"]["Row"];
export type Friendship = Database["public"]["Tables"]["friendships"]["Row"];
export type ItemClaim = Database["public"]["Tables"]["item_claims"]["Row"];
export type SplitClaim = Database["public"]["Tables"]["split_claims"]["Row"];
export type SplitClaimParticipant = Database["public"]["Tables"]["split_claim_participants"]["Row"];

// Extended types with relations
export type WishlistWithItems = Wishlist & {
  items: WishlistItem[];
};

export type WishlistWithOwner = Wishlist & {
  owner: Profile;
};

export type FriendshipWithProfiles = Friendship & {
  requester: Profile;
  addressee: Profile;
};

export type WishlistItemWithClaim = WishlistItem & {
  claim?: ItemClaim | null;
};

// Notification types
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type NotificationPreferences =
  Database["public"]["Tables"]["notification_preferences"]["Row"];

// Notification with related data (actor profile for display)
export type NotificationWithActor = Notification & {
  actor: Pick<Profile, "id" | "display_name" | "avatar_url"> | null;
  wishlist: Pick<Wishlist, "id" | "name" | "user_id"> | null;
  item: Pick<WishlistItem, "id" | "title"> | null;
};

// Wishlist selected friends table types
export interface WishlistSelectedFriend {
  id: string;
  wishlist_id: string;
  friend_id: string;
  created_at: string;
}

// Friend with selection state (for friend picker UI)
export interface SelectableFriend {
  friendshipId: string;
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  birthday: string | null;
  isSelected?: boolean;
}

// Split claim with participants and profile data
export interface SplitClaimWithParticipants {
  id: string;
  item_id: string;
  initiated_by: string;
  target_participants: number;
  status: SplitClaimStatus;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  initiator: Pick<Profile, "id" | "display_name"> | null;
  participants: Array<{
    id: string;
    user_id: string;
    joined_at: string;
    user: Pick<Profile, "id" | "display_name"> | null;
  }>;
}
