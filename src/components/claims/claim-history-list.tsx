"use client";

import { useState } from "react";
import { History, Calendar, Package, Loader2, Gift, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClaimHistoryItemCard } from "./claim-history-item";
import { useClaimHistory } from "@/lib/queries/hooks";
import type { ClaimHistoryResponse, ClaimHistoryPeriod } from "@/lib/types/claims";

function PeriodSection({ period }: { period: ClaimHistoryPeriod }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Calendar className="w-4 h-4" />
        {period.label}
        <span className="text-xs">({period.claims.length} items)</span>
      </div>
      <div className="space-y-2">
        {period.claims.map((claim) => (
          <ClaimHistoryItemCard key={claim.id} claim={claim} />
        ))}
      </div>
    </div>
  );
}

function EmptyState({ type }: { type: "active" | "cancelled" | "fulfilled" }) {
  const messages = {
    active: "No active claims yet. Browse your friends' wishlists to claim gifts!",
    cancelled: "No cancelled claims. Your claim history will appear here.",
    fulfilled: "No fulfilled gifts yet. Once you've given a gift, it will appear here!",
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mb-4">
        <Package className="w-6 h-6 text-muted-foreground/50" />
      </div>
      <p className="text-sm text-muted-foreground">{messages[type]}</p>
    </div>
  );
}

interface ClaimHistoryListProps {
  initialData?: ClaimHistoryResponse;
}

export function ClaimHistoryList({ initialData }: ClaimHistoryListProps) {
  const [tab, setTab] = useState<"active" | "fulfilled" | "cancelled">("active");
  const { data, isLoading, error } = useClaimHistory(undefined);

  const history = data || initialData;

  if (isLoading && !history) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Failed to load claim history
      </div>
    );
  }

  if (!history) {
    return null;
  }

  // Filter periods based on active tab
  const activePeriods = history.periods
    .map((period) => ({
      ...period,
      claims: period.claims.filter((c) => c.status === "active"),
    }))
    .filter((period) => period.claims.length > 0);

  const fulfilledPeriods = history.periods
    .map((period) => ({
      ...period,
      claims: period.claims.filter((c) => c.status === "fulfilled"),
    }))
    .filter((period) => period.claims.length > 0);

  const cancelledPeriods = history.periods
    .map((period) => ({
      ...period,
      claims: period.claims.filter((c) => c.status === "cancelled"),
    }))
    .filter((period) => period.claims.length > 0);

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as "active" | "fulfilled" | "cancelled")}>
      <TabsList className="grid w-full grid-cols-3 mb-6">
        <TabsTrigger value="active" className="gap-1.5">
          <History className="w-4 h-4" />
          Active
          <span className="text-xs bg-primary/10 px-1.5 py-0.5 rounded-full">
            {history.totalActive}
          </span>
        </TabsTrigger>
        <TabsTrigger value="fulfilled" className="gap-1.5">
          <Gift className="w-4 h-4" />
          Given
          <span className="text-xs bg-amber-500/10 px-1.5 py-0.5 rounded-full">
            {history.totalFulfilled}
          </span>
        </TabsTrigger>
        <TabsTrigger value="cancelled" className="gap-1.5">
          <X className="w-4 h-4" />
          Cancelled
          <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">
            {history.totalCancelled}
          </span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="active" className="space-y-6">
        {activePeriods.length === 0 ? (
          <EmptyState type="active" />
        ) : (
          activePeriods.map((period) => (
            <PeriodSection key={`${period.year}-${period.month}`} period={period} />
          ))
        )}
      </TabsContent>

      <TabsContent value="fulfilled" className="space-y-6">
        {fulfilledPeriods.length === 0 ? (
          <EmptyState type="fulfilled" />
        ) : (
          fulfilledPeriods.map((period) => (
            <PeriodSection key={`${period.year}-${period.month}`} period={period} />
          ))
        )}
      </TabsContent>

      <TabsContent value="cancelled" className="space-y-6">
        {cancelledPeriods.length === 0 ? (
          <EmptyState type="cancelled" />
        ) : (
          cancelledPeriods.map((period) => (
            <PeriodSection key={`${period.year}-${period.month}`} period={period} />
          ))
        )}
      </TabsContent>
    </Tabs>
  );
}
