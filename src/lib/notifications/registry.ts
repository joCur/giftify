/**
 * Notification System V2 - Type Registry
 *
 * Central registry defining configuration for all notification types:
 * - Display generators (title, message, action URL)
 * - Visual properties (icon, color)
 * - Behavior (priority, auto-archive, grouping)
 */

import {
  UserPlus,
  Users,
  Cake,
  Gift,
  Package,
  Split,
  UserMinus,
  CircleCheck,
  CircleX,
  Flag,
  AlertCircle,
  Archive,
  type LucideIcon,
} from "lucide-react";
import type { NotificationType, NotificationData, NotificationCategory } from "./types";
import { getMetadataSchema } from "./types";
import type { z } from "zod";

// ============================================
// NOTIFICATION TYPE CONFIG
// ============================================

export interface NotificationTypeConfig<T = any> {
  type: NotificationType;
  categoryId: NotificationCategory;
  schema: z.ZodSchema<T>;
  icon: LucideIcon;
  color: string;
  priority: number;

  // Display generators
  getTitle: (metadata: T) => string;
  getMessage: (metadata: T) => string;
  getActionUrl: (metadata: T) => string;

  // Optional behavior
  autoArchiveAfterDays?: number;
  groupKey?: (metadata: T) => string | null;
}

// ============================================
// TYPE REGISTRY
// ============================================

export const notificationTypeRegistry: Record<NotificationType, NotificationTypeConfig> = {
  // ==================== SOCIAL ====================

  friend_request_received: {
    type: "friend_request_received",
    categoryId: "social",
    schema: getMetadataSchema("friend_request_received"),
    icon: UserPlus,
    color: "text-primary",
    priority: 5,
    getTitle: () => "New Friend Request",
    getMessage: (meta) => `${meta.requester_name} sent you a friend request`,
    getActionUrl: () => "/friends",
  },

  friend_request_accepted: {
    type: "friend_request_accepted",
    categoryId: "social",
    schema: getMetadataSchema("friend_request_accepted"),
    icon: Users,
    color: "text-green-500",
    priority: 4,
    getTitle: () => "Friend Request Accepted",
    getMessage: (meta) => `${meta.accepter_name} accepted your friend request`,
    getActionUrl: (meta) => `/friends/${meta.accepter_id}`,
    autoArchiveAfterDays: 7,
  },

  birthday_reminder: {
    type: "birthday_reminder",
    categoryId: "reminders",
    schema: getMetadataSchema("birthday_reminder"),
    icon: Cake,
    color: "text-pink-500",
    priority: 5,
    getTitle: () => "Birthday Reminder",
    getMessage: (meta) => {
      if (meta.days_until === 0) {
        return `Today is ${meta.friend_name}'s birthday! 🎉`;
      } else if (meta.days_until === 1) {
        return `${meta.friend_name}'s birthday is tomorrow`;
      } else {
        return `${meta.friend_name}'s birthday is in ${meta.days_until} days`;
      }
    },
    getActionUrl: (meta) => `/friends/${meta.friend_id}`,
    autoArchiveAfterDays: 1,
  },

  // ==================== WISHLIST ACTIVITY ====================

  wishlist_created: {
    type: "wishlist_created",
    categoryId: "wishlist_activity",
    schema: getMetadataSchema("wishlist_created"),
    icon: Gift,
    color: "text-purple-500",
    priority: 2,
    getTitle: () => "New Wishlist",
    getMessage: (meta) => `${meta.owner_name} created a new wishlist: ${meta.wishlist_name}`,
    getActionUrl: (meta) => `/friends/${meta.owner_id}/wishlists/${meta.wishlist_id}`,
    autoArchiveAfterDays: 14,
  },

  item_added: {
    type: "item_added",
    categoryId: "wishlist_activity",
    schema: getMetadataSchema("item_added"),
    icon: Package,
    color: "text-blue-500",
    priority: 2,
    getTitle: () => "New Item Added",
    getMessage: (meta) =>
      `${meta.owner_name} added "${meta.item_title}" to ${meta.wishlist_name}`,
    getActionUrl: (meta) =>
      `/friends/${meta.owner_id}/wishlists/${meta.wishlist_id}#item-${meta.item_id}`,
    autoArchiveAfterDays: 14,
    groupKey: (meta) => `item_added_${meta.wishlist_id}`,
  },

  wishlist_archived: {
    type: "wishlist_archived",
    categoryId: "wishlist_activity",
    schema: getMetadataSchema("wishlist_archived"),
    icon: Archive,
    color: "text-gray-500",
    priority: 1,
    getTitle: () => "Wishlist Archived",
    getMessage: (meta) => `${meta.owner_name} archived their wishlist: ${meta.wishlist_name}`,
    getActionUrl: (meta) => `/friends/${meta.owner_id}`,
    autoArchiveAfterDays: 3,
  },

  // ==================== GIFT CLAIMS ====================

  split_initiated: {
    type: "split_initiated",
    categoryId: "gift_claims",
    schema: getMetadataSchema("split_initiated"),
    icon: Split,
    color: "text-amber-500",
    priority: 4,
    getTitle: () => "Split Gift Started",
    getMessage: (meta) => {
      const costInfo = meta.cost_per_person
        ? ` (${meta.item_currency || "$"}${meta.cost_per_person} per person)`
        : "";
      return `${meta.initiator_name} started a split for "${meta.item_title}"${costInfo}`;
    },
    getActionUrl: (meta) =>
      `/friends/${meta.wishlist_owner_id}/wishlists/${meta.wishlist_id}#item-${meta.item_id}`,
    groupKey: (meta) => `split_${meta.split_claim_id}`,
  },

  split_joined: {
    type: "split_joined",
    categoryId: "gift_claims",
    schema: getMetadataSchema("split_joined"),
    icon: UserPlus,
    color: "text-amber-500",
    priority: 3,
    getTitle: () => "Someone Joined Split",
    getMessage: (meta) =>
      `${meta.joiner_name} joined the split for "${meta.item_title}" (${meta.current_participants}/${meta.target_participants})`,
    getActionUrl: (meta) =>
      `/friends/${meta.wishlist_owner_id}/wishlists/${meta.wishlist_id}#item-${meta.item_id}`,
    groupKey: (meta) => `split_${meta.split_claim_id}`,
  },

  split_left: {
    type: "split_left",
    categoryId: "gift_claims",
    schema: getMetadataSchema("split_left"),
    icon: UserMinus,
    color: "text-orange-500",
    priority: 3,
    getTitle: () => "Someone Left Split",
    getMessage: (meta) =>
      `${meta.leaver_name} left the split for "${meta.item_title}" (${meta.remaining_participants}/${meta.target_participants} remaining)`,
    getActionUrl: (meta) =>
      `/friends/${meta.wishlist_owner_id}/wishlists/${meta.wishlist_id}#item-${meta.item_id}`,
    groupKey: (meta) => `split_${meta.split_claim_id}`,
  },

  split_confirmed: {
    type: "split_confirmed",
    categoryId: "gift_claims",
    schema: getMetadataSchema("split_confirmed"),
    icon: CircleCheck,
    color: "text-green-500",
    priority: 5,
    getTitle: () => "Split Confirmed!",
    getMessage: (meta) =>
      `The split for "${meta.item_title}" is now confirmed with ${meta.participants.length} participants`,
    getActionUrl: (meta) =>
      `/friends/${meta.wishlist_owner_id}/wishlists/${meta.wishlist_id}#item-${meta.item_id}`,
  },

  split_cancelled: {
    type: "split_cancelled",
    categoryId: "gift_claims",
    schema: getMetadataSchema("split_cancelled"),
    icon: CircleX,
    color: "text-red-500",
    priority: 4,
    getTitle: () => "Split Cancelled",
    getMessage: (meta) => `${meta.canceller_name} cancelled the split for "${meta.item_title}"`,
    getActionUrl: (meta) =>
      `/friends/${meta.wishlist_owner_id}/wishlists/${meta.wishlist_id}#item-${meta.item_id}`,
    autoArchiveAfterDays: 3,
  },

  gift_received: {
    type: "gift_received",
    categoryId: "gift_claims",
    schema: getMetadataSchema("gift_received"),
    icon: Gift,
    color: "text-green-500",
    priority: 5,
    getTitle: () => "Gift Received!",
    getMessage: (meta) =>
      `${meta.recipient_name} marked "${meta.item_title}" as received. Thank you for the gift!`,
    getActionUrl: (meta) =>
      `/friends/${meta.recipient_id}/wishlists/${meta.wishlist_id}#item-${meta.item_id}`,
    autoArchiveAfterDays: 7,
  },

  gift_marked_given: {
    type: "gift_marked_given",
    categoryId: "gift_claims",
    schema: getMetadataSchema("gift_marked_given"),
    icon: Package,
    color: "text-blue-500",
    priority: 3,
    getTitle: () => "Gift Marked as Given",
    getMessage: (meta) =>
      `${meta.giver_name} marked "${meta.item_title}" as given to ${meta.recipient_name}`,
    getActionUrl: (meta) =>
      `/friends/${meta.recipient_id}/wishlists/${meta.wishlist_id}#item-${meta.item_id}`,
  },

  // ==================== OWNERSHIP FLAGS ====================

  item_flagged_already_owned: {
    type: "item_flagged_already_owned",
    categoryId: "ownership_flags",
    schema: getMetadataSchema("item_flagged_already_owned"),
    icon: Flag,
    color: "text-amber-500",
    priority: 4,
    getTitle: () => "Item Flagged",
    getMessage: (meta) =>
      `${meta.flagger_name} thinks you may already own "${meta.item_title}"`,
    getActionUrl: (meta) => `/wishlists/${meta.wishlist_id}#item-${meta.item_id}`,
  },

  flag_confirmed: {
    type: "flag_confirmed",
    categoryId: "ownership_flags",
    schema: getMetadataSchema("flag_confirmed"),
    icon: CircleCheck,
    color: "text-green-500",
    priority: 3,
    getTitle: () => "Flag Confirmed",
    getMessage: (meta) => `${meta.owner_name} confirmed they already own "${meta.item_title}"`,
    getActionUrl: (meta) =>
      `/friends/${meta.owner_id}/wishlists/${meta.wishlist_id}#item-${meta.item_id}`,
    autoArchiveAfterDays: 3,
  },

  flag_denied: {
    type: "flag_denied",
    categoryId: "ownership_flags",
    schema: getMetadataSchema("flag_denied"),
    icon: AlertCircle,
    color: "text-blue-500",
    priority: 2,
    getTitle: () => "Flag Denied",
    getMessage: (meta) => `${meta.owner_name} confirmed they don't own "${meta.item_title}"`,
    getActionUrl: (meta) =>
      `/friends/${meta.owner_id}/wishlists/${meta.wishlist_id}#item-${meta.item_id}`,
    autoArchiveAfterDays: 3,
  },

  // ==================== COLLABORATION ====================

  collaborator_invited: {
    type: "collaborator_invited",
    categoryId: "collaboration",
    schema: getMetadataSchema("collaborator_invited"),
    icon: UserPlus,
    color: "text-purple-500",
    priority: 4,
    getTitle: () => "Invited to Collaborate",
    getMessage: (meta) =>
      `${meta.inviter_name} invited you to collaborate on "${meta.wishlist_name}"`,
    getActionUrl: (meta) => `/wishlists/${meta.wishlist_id}`,
  },

  collaborator_left: {
    type: "collaborator_left",
    categoryId: "collaboration",
    schema: getMetadataSchema("collaborator_left"),
    icon: UserMinus,
    color: "text-orange-500",
    priority: 2,
    getTitle: () => "Collaborator Left",
    getMessage: (meta) => `${meta.leaver_name} left the collaboration on "${meta.wishlist_name}"`,
    getActionUrl: (meta) => `/wishlists/${meta.wishlist_id}`,
    autoArchiveAfterDays: 7,
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get configuration for a notification type
 */
export function getNotificationConfig(type: NotificationType): NotificationTypeConfig {
  const config = notificationTypeRegistry[type];
  if (!config) {
    throw new Error(`Unknown notification type: ${type}`);
  }
  return config;
}

/**
 * Validate metadata for a notification type
 */
export function validateMetadata<T extends NotificationType>(
  type: T,
  metadata: unknown
): Extract<NotificationData, { type: T }>["metadata"] {
  const config = getNotificationConfig(type);
  // Type assertion needed due to TypeScript limitation with discriminated unions
  return config.schema.parse(metadata) as any;
}

/**
 * Generate display title for a notification
 */
export function generateTitle(type: NotificationType, metadata: any): string {
  const config = getNotificationConfig(type);
  return config.getTitle(metadata);
}

/**
 * Generate display message for a notification
 */
export function generateMessage(type: NotificationType, metadata: any): string {
  const config = getNotificationConfig(type);
  return config.getMessage(metadata);
}

/**
 * Generate action URL for a notification
 */
export function generateActionUrl(type: NotificationType, metadata: any): string {
  const config = getNotificationConfig(type);
  return config.getActionUrl(metadata);
}

/**
 * Generate group key for a notification (if applicable)
 */
export function generateGroupKey(type: NotificationType, metadata: any): string | null {
  const config = getNotificationConfig(type);
  return config.groupKey ? config.groupKey(metadata) : null;
}

/**
 * Get all notification types for a category
 */
export function getTypesByCategory(category: NotificationCategory): NotificationType[] {
  return Object.values(notificationTypeRegistry)
    .filter((config) => config.categoryId === category)
    .map((config) => config.type);
}
