import { History } from "lucide-react";
import { ClaimHistoryList } from "@/components/claims/claim-history-list";
import { getClaimHistoryGrouped } from "@/lib/actions/claim-history";

export default async function ClaimsHistoryPage() {
  const history = await getClaimHistoryGrouped();

  return (
    <div className="space-y-8 lg:space-y-10">
      {/* Header */}
      <div>
        <h1 className="font-[family-name:var(--font-outfit)] text-2xl sm:text-3xl font-bold">
          Claims History
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track all gifts you&apos;ve claimed over time
        </p>
      </div>

      {/* Main content */}
      <div className="max-w-3xl">
        {/* Section header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400/20 to-teal-500/10 flex items-center justify-center">
            <History className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h2 className="font-[family-name:var(--font-outfit)] text-lg font-semibold">
              Your Gift History
            </h2>
            <p className="text-xs text-muted-foreground">
              {history.totalActive} active, {history.totalFulfilled} given, {history.totalCancelled} cancelled
            </p>
          </div>
        </div>

        <ClaimHistoryList initialData={history} />
      </div>
    </div>
  );
}
