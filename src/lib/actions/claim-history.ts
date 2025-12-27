"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  ClaimHistoryItem,
  ClaimHistoryPeriod,
  ClaimHistoryResponse,
  ClaimHistoryFilters,
  SoloClaimHistoryItem,
  SplitClaimHistoryItem,
} from "@/lib/types/claims";

// Helper to format month label
function formatMonthLabel(year: number, month: number): string {
  const date = new Date(year, month - 1); // month is 1-indexed
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// Helper to group claims by year/month
function groupClaimsByPeriod(claims: ClaimHistoryItem[]): ClaimHistoryPeriod[] {
  const periodMap = new Map<string, ClaimHistoryPeriod>();

  claims.forEach((claim) => {
    // Use cancelled_at for cancelled, fulfilled_at for fulfilled, created_at for active
    let dateStr = claim.created_at;
    if (claim.status === "cancelled" && claim.cancelled_at) {
      dateStr = claim.cancelled_at;
    } else if (claim.status === "fulfilled" && claim.fulfilled_at) {
      dateStr = claim.fulfilled_at;
    }
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 1-indexed
    const key = `${year}-${month}`;

    if (!periodMap.has(key)) {
      periodMap.set(key, {
        year,
        month,
        label: formatMonthLabel(year, month),
        claims: [],
      });
    }

    periodMap.get(key)!.claims.push(claim);
  });

  // Sort periods by date (most recent first)
  const periods = Array.from(periodMap.values()).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });

  // Sort claims within each period by date (most recent first)
  periods.forEach((period) => {
    period.claims.sort((a, b) => {
      let dateA = a.created_at;
      if (a.status === "cancelled" && a.cancelled_at) {
        dateA = a.cancelled_at;
      } else if (a.status === "fulfilled" && a.fulfilled_at) {
        dateA = a.fulfilled_at;
      }
      let dateB = b.created_at;
      if (b.status === "cancelled" && b.cancelled_at) {
        dateB = b.cancelled_at;
      } else if (b.status === "fulfilled" && b.fulfilled_at) {
        dateB = b.fulfilled_at;
      }
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  });

  return periods;
}

/**
 * Get full claim history for the current user, grouped by year/month
 */
export async function getClaimHistoryGrouped(
  filters?: ClaimHistoryFilters
): Promise<ClaimHistoryResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { periods: [], totalActive: 0, totalCancelled: 0, totalFulfilled: 0 };
  }

  const allClaims: ClaimHistoryItem[] = [];
  let totalActive = 0;
  let totalCancelled = 0;
  let totalFulfilled = 0;

  // Fetch solo claims
  if (!filters?.type || filters.type.includes("solo")) {
    let soloQuery = supabase
      .from("item_claims")
      .select(
        `
        id,
        claimed_by,
        status,
        created_at,
        cancelled_at,
        fulfilled_at,
        item:wishlist_items!inner(
          id,
          title,
          description,
          image_url,
          custom_image_url,
          price,
          currency,
          url,
          wishlist_id
        )
      `
      )
      .eq("claimed_by", user.id)
      .order("created_at", { ascending: false });

    // Apply status filter
    if (filters?.status && filters.status.length > 0) {
      soloQuery = soloQuery.in("status", filters.status);
    }

    const { data: soloClaims } = await soloQuery;

    if (soloClaims && soloClaims.length > 0) {
      // Get wishlist details with owners
      const wishlistIds = [
        ...new Set(
          soloClaims.map(
            (c) => (c.item as { wishlist_id: string }).wishlist_id
          )
        ),
      ];

      const { data: wishlists } = await supabase
        .from("wishlists")
        .select(
          `
          id,
          name,
          user_id,
          owner:profiles!wishlists_user_id_fkey(id, display_name, avatar_url)
        `
        )
        .in("id", wishlistIds);

      const wishlistsMap = new Map(wishlists?.map((w) => [w.id, w]) || []);

      soloClaims.forEach((claim) => {
        const item = claim.item as {
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

        const wishlist = wishlistsMap.get(item.wishlist_id);
        if (!wishlist) return;

        const owner = wishlist.owner as {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
        };

        const status = claim.status as "active" | "cancelled" | "fulfilled";
        if (status === "active") totalActive++;
        else if (status === "cancelled") totalCancelled++;
        else if (status === "fulfilled") totalFulfilled++;

        const historyItem: SoloClaimHistoryItem = {
          type: "solo",
          id: claim.id,
          claimed_by: claim.claimed_by,
          status,
          created_at: claim.created_at,
          cancelled_at: claim.cancelled_at,
          fulfilled_at: claim.fulfilled_at,
          item: {
            id: item.id,
            title: item.title,
            description: item.description,
            image_url: item.image_url,
            custom_image_url: item.custom_image_url,
            price: item.price,
            currency: item.currency,
            url: item.url,
            wishlist_id: item.wishlist_id,
          },
          wishlist: {
            id: wishlist.id,
            name: wishlist.name,
          },
          friend: {
            id: owner.id,
            display_name: owner.display_name,
            avatar_url: owner.avatar_url,
          },
        };

        allClaims.push(historyItem);
      });
    }
  }

  // Fetch split claims where user is a participant
  if (!filters?.type || filters.type.includes("split")) {
    // First get all split claim IDs where user is a participant
    const { data: participations } = await supabase
      .from("split_claim_participants")
      .select("split_claim_id")
      .eq("user_id", user.id);

    if (participations && participations.length > 0) {
      const splitClaimIds = participations.map((p) => p.split_claim_id);

      let splitQuery = supabase
        .from("split_claims")
        .select(
          `
          id,
          item_id,
          initiated_by,
          target_participants,
          status,
          claim_status,
          created_at,
          cancelled_at,
          fulfilled_at,
          confirmed_at,
          item:wishlist_items!inner(
            id,
            title,
            description,
            image_url,
            custom_image_url,
            price,
            currency,
            url,
            wishlist_id
          ),
          participants:split_claim_participants(
            user:profiles!split_claim_participants_user_id_fkey(id, display_name)
          )
        `
        )
        .in("id", splitClaimIds)
        .order("created_at", { ascending: false });

      // Apply status filter
      if (filters?.status && filters.status.length > 0) {
        splitQuery = splitQuery.in("claim_status", filters.status);
      }

      const { data: splitClaims } = await splitQuery;

      if (splitClaims && splitClaims.length > 0) {
        // Get wishlist details with owners
        const wishlistIds = [
          ...new Set(
            splitClaims.map(
              (c) => (c.item as { wishlist_id: string }).wishlist_id
            )
          ),
        ];

        const { data: wishlists } = await supabase
          .from("wishlists")
          .select(
            `
            id,
            name,
            user_id,
            owner:profiles!wishlists_user_id_fkey(id, display_name, avatar_url)
          `
          )
          .in("id", wishlistIds);

        const wishlistsMap = new Map(wishlists?.map((w) => [w.id, w]) || []);

        splitClaims.forEach((claim) => {
          const item = claim.item as {
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

          const wishlist = wishlistsMap.get(item.wishlist_id);
          if (!wishlist) return;

          const owner = wishlist.owner as {
            id: string;
            display_name: string | null;
            avatar_url: string | null;
          };

          const participants = (
            claim.participants as Array<{
              user: { id: string; display_name: string | null };
            }>
          ).map((p) => ({
            id: p.user.id,
            display_name: p.user.display_name,
          }));

          const status = claim.claim_status as "active" | "cancelled" | "fulfilled";
          if (status === "active") totalActive++;
          else if (status === "cancelled") totalCancelled++;
          else if (status === "fulfilled") totalFulfilled++;

          const historyItem: SplitClaimHistoryItem = {
            type: "split",
            id: claim.id,
            status,
            created_at: claim.created_at,
            cancelled_at: claim.cancelled_at,
            fulfilled_at: claim.fulfilled_at,
            split_status: claim.status as "pending" | "confirmed",
            initiated_by: claim.initiated_by,
            is_initiator: claim.initiated_by === user.id,
            target_participants: claim.target_participants,
            current_participants: participants.length,
            participants,
            item: {
              id: item.id,
              title: item.title,
              description: item.description,
              image_url: item.image_url,
              custom_image_url: item.custom_image_url,
              price: item.price,
              currency: item.currency,
              url: item.url,
              wishlist_id: item.wishlist_id,
            },
            wishlist: {
              id: wishlist.id,
              name: wishlist.name,
            },
            friend: {
              id: owner.id,
              display_name: owner.display_name,
              avatar_url: owner.avatar_url,
            },
          };

          allClaims.push(historyItem);
        });
      }
    }
  }

  // Group all claims by year/month
  const periods = groupClaimsByPeriod(allClaims);

  return {
    periods,
    totalActive,
    totalCancelled,
    totalFulfilled,
  };
}

/**
 * Record a claim history event (audit log)
 */
export async function recordClaimHistoryEvent(
  eventType: string,
  itemClaimId?: string,
  splitClaimId?: string,
  metadata?: Record<string, unknown>
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  // Validate exactly one claim ID is provided (database constraint requires this)
  if ((!itemClaimId && !splitClaimId) || (itemClaimId && splitClaimId)) {
    console.error(
      "recordClaimHistoryEvent: exactly one of itemClaimId or splitClaimId must be provided"
    );
    return;
  }

  await supabase.from("claim_history_events").insert({
    item_claim_id: itemClaimId || null,
    split_claim_id: splitClaimId || null,
    event_type: eventType,
    user_id: user.id,
    metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
  });
}
