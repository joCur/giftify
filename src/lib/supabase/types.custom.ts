// Custom type aliases for convenience
// Keep these in a separate file so they don't get overwritten by type generation

import type { Database } from "./types";

// Re-export Database type
export type { Database };

export type WishlistPrivacy = Database["public"]["Enums"]["wishlist_privacy"];
export type FriendshipStatus = Database["public"]["Enums"]["friendship_status"];
export type NotificationType = Database["public"]["Enums"]["notification_type"];
export type NotificationStatus = Database["public"]["Enums"]["notification_status"];
export type SplitClaimStatus = Database["public"]["Enums"]["split_claim_status"];

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Wishlist = Database["public"]["Tables"]["wishlists"]["Row"];
export type WishlistItem = Database["public"]["Tables"]["wishlist_items"]["Row"];
export type Friendship = Database["public"]["Tables"]["friendships"]["Row"];
export type ItemClaim = Database["public"]["Tables"]["item_claims"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type InviteCode = Database["public"]["Tables"]["invite_codes"]["Row"];
export type WishlistCollaborator = Database["public"]["Tables"]["wishlist_collaborators"]["Row"];

// Extended profile type with email from auth.users
export type ProfileWithEmail = Profile & { email?: string };

// Notification with actor profile and related entities joined
export type NotificationWithActor = Notification & {
  actor: Pick<Profile, "id" | "display_name" | "avatar_url"> | null;
  wishlist: Pick<Wishlist, "id" | "name" | "user_id"> | null;
  item: Pick<WishlistItem, "id" | "title"> | null;
};

// Friend with selection state for wishlist visibility
export type SelectableFriend = {
  friendshipId: string;
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  birthday: string | null;
  isSelected: boolean;
};

// Collaborator with profile data joined
export type CollaboratorWithProfile = {
  id: string;
  user_id: string;
  invited_at: string;
  user: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

// Wishlist with owner and collaborators joined
export type WishlistWithCollaborators = Wishlist & {
  owner: Pick<Profile, "id" | "display_name" | "avatar_url"> | null;
  items: WishlistItem[] | null;
  collaborators: CollaboratorWithProfile[] | null;
};

// Split claim with participants and profile data joined
export type SplitClaimWithParticipants = {
  id: string;
  item_id: string;
  initiated_by: string;
  target_participants: number;
  status: SplitClaimStatus;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  initiator: {
    id: string;
    display_name: string | null;
  } | null;
  participants: Array<{
    id: string;
    user_id: string;
    joined_at: string;
    user: {
      id: string;
      display_name: string | null;
    } | null;
  }>;
};
