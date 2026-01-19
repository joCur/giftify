/**
 * Notification System V2 - Builder Pattern
 *
 * Fluent API for creating notifications:
 * - Type-safe metadata validation
 * - Automatic action URL generation
 * - Deduplication and grouping support
 * - Batch sending to multiple users
 */

import { createClient } from "@/lib/supabase/server";
import type { NotificationType, NotificationData } from "./types";
import {
  getNotificationConfig,
  validateMetadata,
  generateActionUrl,
  generateGroupKey,
} from "./registry";

// ============================================
// NOTIFICATION BUILDER
// ============================================

export class NotificationBuilder<T extends NotificationType = NotificationType> {
  private type: T;
  private metadata: Extract<NotificationData, { type: T }>["metadata"];
  private userIds: string[] = [];
  private dedupKey?: string;
  private groupKey?: string;
  private priority?: number;
  private actionUrl?: string;

  constructor(type: T, metadata: Extract<NotificationData, { type: T }>["metadata"]) {
    // Metadata is already type-checked by TypeScript, just validate with Zod at runtime
    validateMetadata(type, metadata);
    // Type assertion needed due to TypeScript limitation with discriminated unions
    this.metadata = metadata as any;
    this.type = type;
  }

  /**
   * Set target user IDs
   */
  to(userIds: string | string[]): this {
    this.userIds = Array.isArray(userIds) ? userIds : [userIds];
    return this;
  }

  /**
   * Set deduplication key (prevents duplicate notifications)
   */
  withDedupKey(key: string): this {
    this.dedupKey = key;
    return this;
  }

  /**
   * Set group key (for grouping related notifications)
   */
  withGroupKey(key: string): this {
    this.groupKey = key;
    return this;
  }

  /**
   * Auto-generate group key from metadata
   */
  withAutoGroupKey(): this {
    const key = generateGroupKey(this.type, this.metadata);
    if (key) {
      this.groupKey = key;
    }
    return this;
  }

  /**
   * Set priority (higher = more important)
   */
  withPriority(priority: number): this {
    this.priority = priority;
    return this;
  }

  /**
   * Set custom action URL (overrides default from registry)
   */
  withActionUrl(url: string): this {
    this.actionUrl = url;
    return this;
  }

  /**
   * Send notification(s)
   */
  async send(): Promise<{ success: boolean; count: number; error?: string }> {
    if (this.userIds.length === 0) {
      return { success: false, count: 0, error: "No user IDs provided" };
    }

    try {
      const supabase = await createClient();
      const config = getNotificationConfig(this.type);

      // Generate action URL from metadata if not manually set
      const actionUrl = this.actionUrl || generateActionUrl(this.type, this.metadata as any);

      // Use priority from config if not manually set
      const priority = this.priority !== undefined ? this.priority : config.priority;

      // Call database function
      const { data, error } = await supabase.rpc("create_notification_v2", {
        p_type: this.type,
        p_user_ids: this.userIds,
        p_metadata: this.metadata as any,
        p_action_url: actionUrl,
        p_dedup_key: this.dedupKey || undefined,
        p_group_key: this.groupKey || undefined,
        p_priority: priority,
      });

      if (error) {
        console.error("Notification send error:", error);
        return { success: false, count: 0, error: error.message };
      }

      // RPC function returns the number of notifications created
      const count = typeof data === 'number' ? data : 0;
      return { success: true, count };
    } catch (error) {
      console.error("Notification builder error:", error);
      return {
        success: false,
        count: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

// ============================================
// FACTORY FUNCTIONS
// ============================================

/**
 * Create a new notification builder
 *
 * @example
 * ```ts
 * await createNotification("friend_request_received", {
 *   friendship_id: "...",
 *   requester_id: "...",
 *   requester_name: "Alice"
 * })
 *   .to(userId)
 *   .withDedupKey(`friend_request_${friendshipId}`)
 *   .send();
 * ```
 */
export function createNotification<T extends NotificationType>(
  type: T,
  metadata: Extract<NotificationData, { type: T }>["metadata"]
): NotificationBuilder<T> {
  return new NotificationBuilder(type, metadata as any);
}

// ============================================
// HELPER FUNCTIONS FOR COMMON PATTERNS
// ============================================

/**
 * Send notification to all friends of a user
 *
 * @example
 * ```ts
 * await notifyFriends(userId, "wishlist_created", {
 *   wishlist_id: "...",
 *   wishlist_name: "My Wishlist",
 *   owner_id: userId,
 *   owner_name: "Alice",
 *   privacy: "friends"
 * });
 * ```
 */
export async function notifyFriends(
  userId: string,
  type: NotificationType,
  metadata: NotificationData["metadata"]
): Promise<{ success: boolean; count: number; error?: string }> {
  const supabase = await createClient();

  // Get friend IDs using helper function
  const { data: friendIds, error } = await supabase.rpc("get_friend_ids", {
    p_user_id: userId,
  });

  if (error || !friendIds || friendIds.length === 0) {
    return { success: true, count: 0, error: error?.message };
  }

  return createNotification(type as any, metadata as any)
    .to(friendIds)
    .send();
}

/**
 * Send notification to split claim participants
 *
 * @example
 * ```ts
 * await notifySplitParticipants(
 *   splitClaimId,
 *   "split_joined",
 *   metadata,
 *   excludeUserId // Don't notify the person who just joined
 * );
 * ```
 */
export async function notifySplitParticipants(
  splitClaimId: string,
  type: NotificationType,
  metadata: NotificationData["metadata"],
  excludeUserId?: string
): Promise<{ success: boolean; count: number; error?: string }> {
  const supabase = await createClient();

  // Get participant IDs using helper function
  const { data: participantIds, error } = await supabase.rpc("get_split_participant_ids", {
    p_split_claim_id: splitClaimId,
    p_exclude_user_id: excludeUserId || undefined,
  });

  if (error || !participantIds || participantIds.length === 0) {
    return { success: true, count: 0, error: error?.message };
  }

  return createNotification(type as any, metadata as any)
    .to(participantIds)
    .withAutoGroupKey()
    .send();
}

/**
 * Send notification to friends who can view a wishlist
 * (respects wishlist privacy settings)
 */
export async function notifyWishlistViewers(
  wishlistId: string,
  ownerId: string,
  type: NotificationType,
  metadata: NotificationData["metadata"]
): Promise<{ success: boolean; count: number; error?: string }> {
  const supabase = await createClient();

  // Get wishlist privacy
  const { data: wishlist, error: wishlistError } = await supabase
    .from("wishlists")
    .select("privacy")
    .eq("id", wishlistId)
    .single();

  if (wishlistError || !wishlist) {
    return { success: false, count: 0, error: wishlistError?.message };
  }

  // For public/friends wishlists, notify all friends
  if (wishlist.privacy === "public" || wishlist.privacy === "friends") {
    return notifyFriends(ownerId, type, metadata);
  }

  // For selected_friends, get the selected friends
  if (wishlist.privacy === "selected_friends") {
    const { data: selectedFriends, error: friendsError } = await supabase
      .from("wishlist_selected_friends")
      .select("friend_id")
      .eq("wishlist_id", wishlistId);

    if (friendsError || !selectedFriends || selectedFriends.length === 0) {
      return { success: true, count: 0, error: friendsError?.message };
    }

    const friendIds = selectedFriends.map((sf) => sf.friend_id);
    return createNotification(type as any, metadata as any)
      .to(friendIds)
      .send();
  }

  // Private wishlists don't send notifications
  return { success: true, count: 0 };
}

/**
 * Send notification to a single user with deduplication
 */
export async function notifyUser(
  userId: string,
  type: NotificationType,
  metadata: NotificationData["metadata"],
  dedupKey?: string
): Promise<{ success: boolean; count: number; error?: string }> {
  const builder = createNotification(type as any, metadata as any).to(userId);

  if (dedupKey) {
    builder.withDedupKey(dedupKey);
  }

  return builder.send();
}
