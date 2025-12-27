"use client";

import { Check, X, Users, Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClaimStatus } from "@/lib/types/claims";

interface ClaimStatusBadgeProps {
  status: ClaimStatus;
  type: "solo" | "split";
  splitStatus?: "pending" | "confirmed";
  className?: string;
}

export function ClaimStatusBadge({
  status,
  type,
  splitStatus,
  className,
}: ClaimStatusBadgeProps) {
  if (status === "cancelled") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
          "bg-muted text-muted-foreground",
          className
        )}
      >
        <X className="w-3 h-3" />
        Cancelled
      </span>
    );
  }

  if (status === "fulfilled") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
          "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
          className
        )}
      >
        <Gift className="w-3 h-3" />
        Gift Given
      </span>
    );
  }

  if (type === "split") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
          splitStatus === "confirmed"
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
          className
        )}
      >
        <Users className="w-3 h-3" />
        {splitStatus === "confirmed" ? "Split Complete" : "Split Pending"}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
        className
      )}
    >
      <Check className="w-3 h-3" />
      Claimed
    </span>
  );
}
