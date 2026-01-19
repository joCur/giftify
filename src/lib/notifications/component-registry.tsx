/**
 * Notification System V2 - Component Registry
 *
 * Maps notification types to their specialized React components
 */

import type { ParsedNotification } from "./types";

// ============================================
// COMPONENT PROPS INTERFACE
// ============================================

export interface NotificationComponentProps {
  notification: ParsedNotification;
  onMarkAsRead: (id: string) => Promise<void>;
  onArchive?: (id: string) => Promise<void>;
}

// ============================================
// COMPONENT TYPE
// ============================================

export type NotificationComponent = React.ComponentType<NotificationComponentProps>;

// ============================================
// COMPONENT IMPORTS (Lazy loaded for performance)
// ============================================

// We'll create these components next
import { FriendRequestNotification } from "@/components/notifications/types/friend-request-notification";
import { SplitClaimNotification } from "@/components/notifications/types/split-claim-notification";
import { OwnershipFlagNotification } from "@/components/notifications/types/ownership-flag-notification";
import { WishlistActivityNotification } from "@/components/notifications/types/wishlist-activity-notification";
import { BirthdayReminderNotification } from "@/components/notifications/types/birthday-reminder-notification";
import { GiftNotification } from "@/components/notifications/types/gift-notification";
import { CollaborationNotification } from "@/components/notifications/types/collaboration-notification";

// ============================================
// COMPONENT REGISTRY
// ============================================

export const notificationComponentRegistry: Record<string, NotificationComponent> = {
  // Social
  friend_request_received: FriendRequestNotification,
  friend_request_accepted: FriendRequestNotification,

  // Reminders
  birthday_reminder: BirthdayReminderNotification,

  // Wishlist Activity
  wishlist_created: WishlistActivityNotification,
  item_added: WishlistActivityNotification,
  wishlist_archived: WishlistActivityNotification,

  // Gift Claims
  split_initiated: SplitClaimNotification,
  split_joined: SplitClaimNotification,
  split_left: SplitClaimNotification,
  split_confirmed: SplitClaimNotification,
  split_cancelled: SplitClaimNotification,
  gift_received: GiftNotification,
  gift_marked_given: GiftNotification,

  // Ownership Flags
  item_flagged_already_owned: OwnershipFlagNotification,
  flag_confirmed: OwnershipFlagNotification,
  flag_denied: OwnershipFlagNotification,

  // Collaboration
  collaborator_invited: CollaborationNotification,
  collaborator_left: CollaborationNotification,
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get component for notification type
 * Falls back to WishlistActivityNotification if no specific component
 */
export function getNotificationComponent(type: string): NotificationComponent {
  return notificationComponentRegistry[type] || WishlistActivityNotification;
}
