export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type WishlistPrivacy = "friends" | "selected_friends" | "private";
export type FriendshipStatus = "pending" | "accepted" | "declined";
export type NotificationType =
  | "friend_request_received"
  | "friend_request_accepted"
  | "birthday_reminder"
  | "item_added"
  | "wishlist_created";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          birthday: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          birthday?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          birthday?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      wishlists: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          privacy: WishlistPrivacy;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          privacy?: WishlistPrivacy;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          privacy?: WishlistPrivacy;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wishlists_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      wishlist_items: {
        Row: {
          id: string;
          wishlist_id: string;
          url: string;
          title: string;
          description: string | null;
          image_url: string | null;
          price: string | null;
          currency: string | null;
          is_purchased: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          wishlist_id: string;
          url: string;
          title: string;
          description?: string | null;
          image_url?: string | null;
          price?: string | null;
          currency?: string | null;
          is_purchased?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          wishlist_id?: string;
          url?: string;
          title?: string;
          description?: string | null;
          image_url?: string | null;
          price?: string | null;
          currency?: string | null;
          is_purchased?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wishlist_items_wishlist_id_fkey";
            columns: ["wishlist_id"];
            isOneToOne: false;
            referencedRelation: "wishlists";
            referencedColumns: ["id"];
          }
        ];
      };
      friendships: {
        Row: {
          id: string;
          requester_id: string;
          addressee_id: string;
          status: FriendshipStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          requester_id: string;
          addressee_id: string;
          status?: FriendshipStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          requester_id?: string;
          addressee_id?: string;
          status?: FriendshipStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "friendships_requester_id_fkey";
            columns: ["requester_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "friendships_addressee_id_fkey";
            columns: ["addressee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      item_claims: {
        Row: {
          id: string;
          item_id: string;
          claimed_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          claimed_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          item_id?: string;
          claimed_by?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "item_claims_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "wishlist_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "item_claims_claimed_by_fkey";
            columns: ["claimed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType;
          title: string;
          message: string;
          actor_id: string | null;
          wishlist_id: string | null;
          item_id: string | null;
          friendship_id: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: NotificationType;
          title: string;
          message: string;
          actor_id?: string | null;
          wishlist_id?: string | null;
          item_id?: string | null;
          friendship_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: NotificationType;
          title?: string;
          message?: string;
          actor_id?: string | null;
          wishlist_id?: string | null;
          item_id?: string | null;
          friendship_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_wishlist_id_fkey";
            columns: ["wishlist_id"];
            isOneToOne: false;
            referencedRelation: "wishlists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "wishlist_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_friendship_id_fkey";
            columns: ["friendship_id"];
            isOneToOne: false;
            referencedRelation: "friendships";
            referencedColumns: ["id"];
          }
        ];
      };
      notification_preferences: {
        Row: {
          user_id: string;
          birthday_reminder_days: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          birthday_reminder_days?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          birthday_reminder_days?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      wishlist_selected_friends: {
        Row: {
          id: string;
          wishlist_id: string;
          friend_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          wishlist_id: string;
          friend_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          wishlist_id?: string;
          friend_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wishlist_selected_friends_wishlist_id_fkey";
            columns: ["wishlist_id"];
            isOneToOne: false;
            referencedRelation: "wishlists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wishlist_selected_friends_friend_id_fkey";
            columns: ["friend_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      wishlist_privacy: WishlistPrivacy;
      friendship_status: FriendshipStatus;
      notification_type: NotificationType;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// Helper types for easier usage
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Wishlist = Database["public"]["Tables"]["wishlists"]["Row"];
export type WishlistItem = Database["public"]["Tables"]["wishlist_items"]["Row"];
export type Friendship = Database["public"]["Tables"]["friendships"]["Row"];
export type ItemClaim = Database["public"]["Tables"]["item_claims"]["Row"];

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
  wishlist: Pick<Wishlist, "id" | "name"> | null;
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
