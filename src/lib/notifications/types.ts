/**
 * Notification System V2 - Type Definitions
 *
 * Complete type-safe notification system with:
 * - Zod schemas for runtime validation
 * - TypeScript discriminated unions for compile-time safety
 * - Type guards and helpers
 */

import { z } from "zod";

// ============================================
// CUSTOM VALIDATORS
// ============================================

// Lenient UUID validation that accepts any UUID-formatted string (including test UUIDs)
// This allows UUIDs like 33333333-3333-3333-3333-333333333333 used in test/seed data
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const lenientUuid = () => z.string().regex(uuidRegex, "Invalid UUID format");

// ============================================
// ZOD SCHEMAS (Runtime Validation)
// ============================================

// Social notifications
export const friendRequestReceivedMetadataSchema = z.object({
  friendship_id: lenientUuid(),
  requester_id: lenientUuid(),
  requester_name: z.string(),
  requester_avatar_url: z.string().nullable().optional(),
});

export const friendRequestAcceptedMetadataSchema = z.object({
  friendship_id: lenientUuid(),
  accepter_id: lenientUuid(),
  accepter_name: z.string(),
  accepter_avatar_url: z.string().nullable().optional(),
});

export const birthdayReminderMetadataSchema = z.object({
  friend_id: lenientUuid(),
  friend_name: z.string(),
  friend_avatar_url: z.string().nullable().optional(),
  birthday_date: z.string(), // ISO date
  days_until: z.number().int().nonnegative(),
});

// Wishlist activity
export const wishlistCreatedMetadataSchema = z.object({
  wishlist_id: lenientUuid(),
  wishlist_name: z.string(),
  owner_id: lenientUuid(),
  owner_name: z.string(),
  owner_avatar_url: z.string().nullable().optional(),
  privacy: z.string(),
});

export const itemAddedMetadataSchema = z.object({
  wishlist_id: lenientUuid(),
  wishlist_name: z.string(),
  item_id: lenientUuid(),
  item_title: z.string(),
  item_image_url: z.string().nullable().optional(),
  item_price: z.number().nullable().optional(),
  item_currency: z.string().nullable().optional(),
  owner_id: lenientUuid(),
  owner_name: z.string(),
  owner_avatar_url: z.string().nullable().optional(),
});

export const wishlistArchivedMetadataSchema = z.object({
  wishlist_id: lenientUuid(),
  wishlist_name: z.string(),
  owner_id: lenientUuid(),
  owner_name: z.string(),
  owner_avatar_url: z.string().nullable().optional(),
});

// Gift claims
export const splitInitiatedMetadataSchema = z.object({
  split_claim_id: lenientUuid(),
  item_id: lenientUuid(),
  item_title: z.string(),
  item_image_url: z.string().nullable().optional(),
  item_price: z.number().nullable().optional(),
  item_currency: z.string().nullable().optional(),
  wishlist_id: lenientUuid(),
  wishlist_name: z.string(),
  wishlist_owner_id: lenientUuid(),
  wishlist_owner_name: z.string(),
  initiator_id: lenientUuid(),
  initiator_name: z.string(),
  initiator_avatar_url: z.string().nullable().optional(),
  target_participants: z.number().int().positive(),
  cost_per_person: z.number().nullable().optional(),
});

export const splitJoinedMetadataSchema = z.object({
  split_claim_id: lenientUuid(),
  item_id: lenientUuid(),
  item_title: z.string(),
  item_image_url: z.string().nullable().optional(),
  wishlist_id: lenientUuid(),
  wishlist_name: z.string(),
  wishlist_owner_id: lenientUuid(),
  joiner_id: lenientUuid(),
  joiner_name: z.string(),
  joiner_avatar_url: z.string().nullable().optional(),
  current_participants: z.number().int().positive(),
  target_participants: z.number().int().positive(),
});

export const splitLeftMetadataSchema = z.object({
  split_claim_id: lenientUuid(),
  item_id: lenientUuid(),
  item_title: z.string(),
  wishlist_id: lenientUuid(),
  wishlist_name: z.string(),
  wishlist_owner_id: lenientUuid(),
  leaver_id: lenientUuid(),
  leaver_name: z.string(),
  remaining_participants: z.number().int().nonnegative(),
  target_participants: z.number().int().positive(),
});

export const splitConfirmedMetadataSchema = z.object({
  split_claim_id: lenientUuid(),
  item_id: lenientUuid(),
  item_title: z.string(),
  item_image_url: z.string().nullable().optional(),
  wishlist_id: lenientUuid(),
  wishlist_name: z.string(),
  wishlist_owner_id: lenientUuid(),
  participants: z.array(
    z.object({
      user_id: lenientUuid(),
      display_name: z.string(),
      avatar_url: z.string().nullable().optional(),
    })
  ),
  target_participants: z.number().int().positive(),
  cost_per_person: z.number().nullable().optional(),
});

export const splitCancelledMetadataSchema = z.object({
  split_claim_id: lenientUuid().nullable().optional(),
  item_id: lenientUuid(),
  item_title: z.string(),
  wishlist_id: lenientUuid(),
  wishlist_name: z.string(),
  wishlist_owner_id: lenientUuid(),
  canceller_id: lenientUuid(),
  canceller_name: z.string(),
  reason: z.string().optional(),
});

export const giftReceivedMetadataSchema = z.object({
  item_id: lenientUuid(),
  item_title: z.string(),
  item_image_url: z.string().nullable().optional(),
  wishlist_id: lenientUuid(),
  wishlist_name: z.string(),
  recipient_id: lenientUuid(),
  recipient_name: z.string(),
  claim_type: z.enum(["solo", "split"]),
  claim_id: lenientUuid(),
  marked_at: z.string(),
});

export const giftMarkedGivenMetadataSchema = z.object({
  item_id: lenientUuid(),
  item_title: z.string(),
  item_image_url: z.string().nullable().optional(),
  wishlist_id: lenientUuid(),
  wishlist_name: z.string(),
  giver_id: lenientUuid(),
  giver_name: z.string(),
  recipient_id: lenientUuid(),
  recipient_name: z.string(),
  marked_at: z.string(),
});

// Ownership flags
export const itemFlaggedMetadataSchema = z.object({
  flag_id: lenientUuid(),
  item_id: lenientUuid(),
  item_title: z.string(),
  item_image_url: z.string().nullable().optional(),
  wishlist_id: lenientUuid(),
  wishlist_name: z.string(),
  wishlist_owner_id: lenientUuid(),
  flagger_id: lenientUuid(),
  flagger_name: z.string(),
  flagger_avatar_url: z.string().nullable().optional(),
  reason: z.string().optional(),
});

export const flagConfirmedMetadataSchema = z.object({
  flag_id: lenientUuid(),
  item_id: lenientUuid(),
  item_title: z.string(),
  wishlist_id: lenientUuid(),
  wishlist_name: z.string(),
  owner_id: lenientUuid(),
  owner_name: z.string(),
  flagger_id: lenientUuid(),
});

export const flagDeniedMetadataSchema = z.object({
  flag_id: lenientUuid(),
  item_id: lenientUuid(),
  item_title: z.string(),
  wishlist_id: lenientUuid(),
  wishlist_name: z.string(),
  owner_id: lenientUuid(),
  owner_name: z.string(),
  flagger_id: lenientUuid(),
  denial_reason: z.string().optional(),
});

// Collaboration
export const collaboratorInvitedMetadataSchema = z.object({
  wishlist_id: lenientUuid(),
  wishlist_name: z.string(),
  primary_owner_id: lenientUuid(),
  primary_owner_name: z.string(),
  inviter_id: lenientUuid(),
  inviter_name: z.string(),
  invited_user_id: lenientUuid(),
});

export const collaboratorLeftMetadataSchema = z.object({
  wishlist_id: lenientUuid(),
  wishlist_name: z.string(),
  primary_owner_id: lenientUuid(),
  leaver_id: lenientUuid(),
  leaver_name: z.string(),
});

// ============================================
// TYPESCRIPT TYPES (Inferred from Zod)
// ============================================

export type FriendRequestReceivedMetadata = z.infer<typeof friendRequestReceivedMetadataSchema>;
export type FriendRequestAcceptedMetadata = z.infer<typeof friendRequestAcceptedMetadataSchema>;
export type BirthdayReminderMetadata = z.infer<typeof birthdayReminderMetadataSchema>;
export type WishlistCreatedMetadata = z.infer<typeof wishlistCreatedMetadataSchema>;
export type ItemAddedMetadata = z.infer<typeof itemAddedMetadataSchema>;
export type WishlistArchivedMetadata = z.infer<typeof wishlistArchivedMetadataSchema>;
export type SplitInitiatedMetadata = z.infer<typeof splitInitiatedMetadataSchema>;
export type SplitJoinedMetadata = z.infer<typeof splitJoinedMetadataSchema>;
export type SplitLeftMetadata = z.infer<typeof splitLeftMetadataSchema>;
export type SplitConfirmedMetadata = z.infer<typeof splitConfirmedMetadataSchema>;
export type SplitCancelledMetadata = z.infer<typeof splitCancelledMetadataSchema>;
export type GiftReceivedMetadata = z.infer<typeof giftReceivedMetadataSchema>;
export type GiftMarkedGivenMetadata = z.infer<typeof giftMarkedGivenMetadataSchema>;
export type ItemFlaggedMetadata = z.infer<typeof itemFlaggedMetadataSchema>;
export type FlagConfirmedMetadata = z.infer<typeof flagConfirmedMetadataSchema>;
export type FlagDeniedMetadata = z.infer<typeof flagDeniedMetadataSchema>;
export type CollaboratorInvitedMetadata = z.infer<typeof collaboratorInvitedMetadataSchema>;
export type CollaboratorLeftMetadata = z.infer<typeof collaboratorLeftMetadataSchema>;

// ============================================
// NOTIFICATION TYPE (from database enum)
// ============================================

export type NotificationType =
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
  | "collaborator_left";

export type NotificationStatus = "inbox" | "archived" | "deleted";

export type NotificationCategory =
  | "social"
  | "wishlist_activity"
  | "gift_claims"
  | "ownership_flags"
  | "reminders"
  | "collaboration";

// ============================================
// DISCRIMINATED UNION
// ============================================

export type NotificationData =
  | { type: "friend_request_received"; metadata: FriendRequestReceivedMetadata }
  | { type: "friend_request_accepted"; metadata: FriendRequestAcceptedMetadata }
  | { type: "birthday_reminder"; metadata: BirthdayReminderMetadata }
  | { type: "wishlist_created"; metadata: WishlistCreatedMetadata }
  | { type: "item_added"; metadata: ItemAddedMetadata }
  | { type: "wishlist_archived"; metadata: WishlistArchivedMetadata }
  | { type: "split_initiated"; metadata: SplitInitiatedMetadata }
  | { type: "split_joined"; metadata: SplitJoinedMetadata }
  | { type: "split_left"; metadata: SplitLeftMetadata }
  | { type: "split_confirmed"; metadata: SplitConfirmedMetadata }
  | { type: "split_cancelled"; metadata: SplitCancelledMetadata }
  | { type: "gift_received"; metadata: GiftReceivedMetadata }
  | { type: "gift_marked_given"; metadata: GiftMarkedGivenMetadata }
  | { type: "item_flagged_already_owned"; metadata: ItemFlaggedMetadata }
  | { type: "flag_confirmed"; metadata: FlagConfirmedMetadata }
  | { type: "flag_denied"; metadata: FlagDeniedMetadata }
  | { type: "collaborator_invited"; metadata: CollaboratorInvitedMetadata }
  | { type: "collaborator_left"; metadata: CollaboratorLeftMetadata };

// ============================================
// PARSED NOTIFICATION (Database Row + Parsed Metadata)
// ============================================

export interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  category_id: NotificationCategory;
  metadata: unknown; // Raw JSONB from database
  action_url: string | null;
  action_completed_at: string | null;
  status: NotificationStatus;
  read_at: string | null;
  created_at: string;
  dedup_key: string | null;
  group_key: string | null;
  priority: number;
  expires_at: string | null;
}

export type ParsedNotification = Omit<NotificationRow, "type" | "metadata"> & NotificationData;

// ============================================
// TYPE GUARDS
// ============================================

export function isFriendRequestNotification(
  notification: ParsedNotification
): notification is ParsedNotification & {
  type: "friend_request_received" | "friend_request_accepted";
} {
  return (
    notification.type === "friend_request_received" || notification.type === "friend_request_accepted"
  );
}

export function isSplitClaimNotification(
  notification: ParsedNotification
): notification is ParsedNotification & {
  type:
    | "split_initiated"
    | "split_joined"
    | "split_left"
    | "split_confirmed"
    | "split_cancelled";
} {
  return (
    notification.type === "split_initiated" ||
    notification.type === "split_joined" ||
    notification.type === "split_left" ||
    notification.type === "split_confirmed" ||
    notification.type === "split_cancelled"
  );
}

export function isOwnershipFlagNotification(
  notification: ParsedNotification
): notification is ParsedNotification & {
  type: "item_flagged_already_owned" | "flag_confirmed" | "flag_denied";
} {
  return (
    notification.type === "item_flagged_already_owned" ||
    notification.type === "flag_confirmed" ||
    notification.type === "flag_denied"
  );
}

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Get the appropriate Zod schema for a notification type
 */
export function getMetadataSchema(type: NotificationType): z.ZodSchema {
  const schemaMap: Record<NotificationType, z.ZodSchema> = {
    friend_request_received: friendRequestReceivedMetadataSchema,
    friend_request_accepted: friendRequestAcceptedMetadataSchema,
    birthday_reminder: birthdayReminderMetadataSchema,
    wishlist_created: wishlistCreatedMetadataSchema,
    item_added: itemAddedMetadataSchema,
    wishlist_archived: wishlistArchivedMetadataSchema,
    split_initiated: splitInitiatedMetadataSchema,
    split_joined: splitJoinedMetadataSchema,
    split_left: splitLeftMetadataSchema,
    split_confirmed: splitConfirmedMetadataSchema,
    split_cancelled: splitCancelledMetadataSchema,
    gift_received: giftReceivedMetadataSchema,
    gift_marked_given: giftMarkedGivenMetadataSchema,
    item_flagged_already_owned: itemFlaggedMetadataSchema,
    flag_confirmed: flagConfirmedMetadataSchema,
    flag_denied: flagDeniedMetadataSchema,
    collaborator_invited: collaboratorInvitedMetadataSchema,
    collaborator_left: collaboratorLeftMetadataSchema,
  };

  return schemaMap[type];
}

/**
 * Validate and parse metadata for a notification type
 */
export function parseMetadata<T extends NotificationType>(
  type: T,
  metadata: unknown
): Extract<NotificationData, { type: T }>["metadata"] {
  const schema = getMetadataSchema(type);
  // Type assertion needed due to TypeScript limitation with discriminated unions
  return schema.parse(metadata) as any;
}

/**
 * Parse a raw notification row into a typed notification
 */
export function parseNotification(row: NotificationRow): ParsedNotification {
  const metadata = parseMetadata(row.type, row.metadata);
  return {
    ...row,
    metadata,
  } as ParsedNotification;
}

/**
 * Safe parse with error handling
 */
export function safeParseNotification(
  row: NotificationRow
): { success: true; data: ParsedNotification } | { success: false; error: z.ZodError } {
  try {
    const data = parseNotification(row);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error };
    }
    throw error;
  }
}

// ============================================
// CATEGORY MAPPING
// ============================================

export const NOTIFICATION_CATEGORY_MAP: Record<NotificationType, NotificationCategory> = {
  friend_request_received: "social",
  friend_request_accepted: "social",
  birthday_reminder: "reminders",
  wishlist_created: "wishlist_activity",
  wishlist_archived: "wishlist_activity",
  item_added: "wishlist_activity",
  split_initiated: "gift_claims",
  split_joined: "gift_claims",
  split_left: "gift_claims",
  split_confirmed: "gift_claims",
  split_cancelled: "gift_claims",
  gift_received: "gift_claims",
  gift_marked_given: "gift_claims",
  item_flagged_already_owned: "ownership_flags",
  flag_confirmed: "ownership_flags",
  flag_denied: "ownership_flags",
  collaborator_invited: "collaboration",
  collaborator_left: "collaboration",
};

export function getCategoryForType(type: NotificationType): NotificationCategory {
  return NOTIFICATION_CATEGORY_MAP[type];
}
