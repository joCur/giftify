// Types for claim history feature

export type ClaimStatus = "active" | "cancelled" | "fulfilled";

// Event types for audit trail
export type ClaimEventType =
  | "claimed"
  | "cancelled"
  | "uncancelled"
  | "joined_split"
  | "left_split"
  | "split_cancelled"
  | "fulfilled";

// Base claim history item with common fields
export interface ClaimHistoryItemBase {
  id: string;
  status: ClaimStatus;
  created_at: string;
  cancelled_at: string | null;
  fulfilled_at: string | null;
  item: {
    id: string;
    title: string;
    description: string | null;
    image_url: string | null;
    custom_image_url: string | null;
    price: string | null;
    currency: string | null;
    url: string | null;
    wishlist_id: string;
  };
  wishlist: {
    id: string;
    name: string;
  };
  friend: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

// Solo claim history item
export interface SoloClaimHistoryItem extends ClaimHistoryItemBase {
  type: "solo";
  claimed_by: string;
}

// Split claim history item
export interface SplitClaimHistoryItem extends ClaimHistoryItemBase {
  type: "split";
  split_status: "pending" | "confirmed";
  initiated_by: string;
  is_initiator: boolean;
  target_participants: number;
  current_participants: number;
  participants: {
    id: string;
    display_name: string | null;
  }[];
}

// Unified type for any claim
export type ClaimHistoryItem = SoloClaimHistoryItem | SplitClaimHistoryItem;

// Grouped by time period for UI display
export interface ClaimHistoryPeriod {
  year: number;
  month: number;
  label: string; // e.g., "December 2024"
  claims: ClaimHistoryItem[];
}

// Filter options for history query
export interface ClaimHistoryFilters {
  status?: ClaimStatus[];
  type?: ("solo" | "split")[];
}

// Full claim history response
export interface ClaimHistoryResponse {
  periods: ClaimHistoryPeriod[];
  totalActive: number;
  totalCancelled: number;
  totalFulfilled: number;
}

// Claim history event (audit log)
export interface ClaimHistoryEvent {
  id: string;
  item_claim_id: string | null;
  split_claim_id: string | null;
  event_type: ClaimEventType;
  user_id: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}
