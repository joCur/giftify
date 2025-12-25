import { notFound } from "next/navigation";
import { ArrowLeft, Plus, Settings, Gift, Lock, Users, UserCheck, Sparkles, Archive, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getWishlist } from "@/lib/actions/wishlists";
import { getOwnershipFlags } from "@/lib/actions/ownership-flags";
import { getUser } from "@/lib/supabase/auth";
import { WishlistItemCard } from "@/components/wishlists/wishlist-item-card";
import { AddItemSheet } from "@/components/wishlists/add-item-sheet";
import { WishlistSettingsSheet } from "@/components/wishlists/wishlist-settings-sheet";
import { UnarchiveButton } from "@/components/wishlists/unarchive-button";
import type { WishlistPrivacy } from "@/lib/supabase/types.custom";

const privacyConfig: Record<
  WishlistPrivacy,
  { icon: React.ReactNode; label: string; color: string }
> = {
  private: {
    icon: <Lock className="w-3 h-3" />,
    label: "Private",
    color: "bg-muted text-muted-foreground",
  },
  friends: {
    icon: <Users className="w-3 h-3" />,
    label: "All Friends",
    color: "bg-emerald-500/10 text-emerald-600",
  },
  selected_friends: {
    icon: <UserCheck className="w-3 h-3" />,
    label: "Selected Friends",
    color: "bg-blue-500/10 text-blue-600",
  },
  // Legacy value - behaves same as 'friends'
  public: {
    icon: <Users className="w-3 h-3" />,
    label: "All Friends",
    color: "bg-emerald-500/10 text-emerald-600",
  },
};

export default async function WishlistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [wishlist, user, ownershipFlags] = await Promise.all([
    getWishlist(id),
    getUser(),
    getOwnershipFlags(id),
  ]);

  if (!wishlist) {
    notFound();
  }

  const isOwner = user?.id === wishlist.user_id;
  const items = wishlist.items || [];
  const privacy = privacyConfig[wishlist.privacy];
  const isArchived = wishlist.is_archived;

  // Map ownership flags to items (only pending flags for owner)
  const ownershipFlagsMap = new Map(
    ownershipFlags
      .filter((f) => f.status === "pending")
      .map((f) => [f.item_id, f])
  );

  return (
    <div className="space-y-8 lg:space-y-10">
      {/* Archived Banner */}
      {isOwner && isArchived && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-amber-900 dark:text-amber-100 text-sm">
                This wishlist is archived
              </h3>
              <p className="text-xs text-amber-800/80 dark:text-amber-200/80 mt-1">
                It's hidden from friends and cannot be edited. Unarchive it to make changes.
              </p>
            </div>
            <UnarchiveButton wishlistId={wishlist.id} wishlistName={wishlist.name} />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-6">
        {/* Back button */}
        <Link
          href="/wishlists"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to wishlists
        </Link>

        {/* Title row */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
              <Gift className="w-7 h-7 text-primary" />
            </div>

            {/* Title and description */}
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-[family-name:var(--font-outfit)] text-2xl sm:text-3xl font-bold">
                  {wishlist.name}
                </h1>
                {isOwner && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium ${privacy.color}`}
                  >
                    {privacy.icon}
                    {privacy.label}
                  </span>
                )}
              </div>
              {wishlist.description && (
                <p className="text-muted-foreground mt-1">
                  {wishlist.description}
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                {items.length} {items.length === 1 ? "item" : "items"}
              </p>
            </div>
          </div>

          {/* Actions */}
          {isOwner && !isArchived && (
            <div className="flex items-center gap-2">
              <AddItemSheet wishlistId={wishlist.id}>
                <Button className="rounded-xl shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 transition-all hover:-translate-y-0.5">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </AddItemSheet>
              <WishlistSettingsSheet wishlist={wishlist}>
                <Button
                  size="icon"
                  variant="outline"
                  className="rounded-xl h-10 w-10"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </WishlistSettingsSheet>
            </div>
          )}
          {isOwner && isArchived && (
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                <Archive className="w-3.5 h-3.5" />
                Archived
              </span>
              <WishlistSettingsSheet wishlist={wishlist}>
                <Button
                  size="icon"
                  variant="outline"
                  className="rounded-xl h-10 w-10"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </WishlistSettingsSheet>
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <div className="bg-card border border-border/50 rounded-3xl p-8 md:p-12 lg:p-16">
          <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6">
              <Gift className="w-10 h-10 text-primary" />
            </div>
            <h3 className="font-[family-name:var(--font-outfit)] text-xl sm:text-2xl font-semibold mb-3">
              No items yet
            </h3>
            <p className="text-muted-foreground mb-8">
              {isOwner
                ? isArchived
                  ? "This archived wishlist has no items. Unarchive it to add items."
                  : "Add items by pasting a link to something you'd love to receive. We'll fetch the details automatically!"
                : "This wishlist is empty. Check back later!"}
            </p>
            {isOwner && !isArchived && (
              <AddItemSheet wishlistId={wishlist.id}>
                <Button
                  size="lg"
                  className="rounded-xl shadow-md shadow-primary/20"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Add your first item
                </Button>
              </AddItemSheet>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <WishlistItemCard
              key={item.id}
              item={item}
              wishlistId={wishlist.id}
              isOwner={isOwner}
              isArchived={isArchived}
              ownershipFlag={ownershipFlagsMap.get(item.id) || null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
