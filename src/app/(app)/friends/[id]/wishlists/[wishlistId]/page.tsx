import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Gift } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getWishlist } from "@/lib/actions/wishlists";
import { getItemClaims } from "@/lib/actions/claims";
import { getSplitClaimsForWishlist } from "@/lib/actions/split-claims";
import { getOwnershipFlags } from "@/lib/actions/ownership-flags";
import { FriendWishlistItems } from "@/components/wishlists/friend-wishlist-items";
import { createClient } from "@/lib/supabase/server";

export default async function FriendWishlistPage({
  params,
}: {
  params: Promise<{ id: string; wishlistId: string }>;
}) {
  const { id: friendId, wishlistId } = await params;

  // Get current user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [wishlist, claims, splitClaims, ownershipFlags] = await Promise.all([
    getWishlist(wishlistId),
    getItemClaims(wishlistId),
    getSplitClaimsForWishlist(wishlistId),
    getOwnershipFlags(wishlistId),
  ]);

  if (!wishlist || wishlist.user_id !== friendId) {
    notFound();
  }

  // If current user is a collaborator on this wishlist, redirect to owner view
  const collaborators = (wishlist as { collaborators?: { user_id: string }[] }).collaborators || [];
  const isCollaborator = user && collaborators.some((c) => c.user_id === user.id);

  if (isCollaborator) {
    redirect(`/wishlists/${wishlistId}`);
  }

  const owner = wishlist.owner as {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };

  const initials = owner.display_name
    ? owner.display_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  // Filter out purchased and received items (including items confirmed as already owned)
  const items = (wishlist.items || []).filter((item) => !item.is_purchased && !item.is_received);

  // Map claims, split claims, and ownership flags to items
  const claimsMap = new Map(claims.map((c) => [c.item_id, c]));
  const splitClaimsMap = new Map(splitClaims.map((sc) => [sc.item_id, sc]));
  const ownershipFlagsMap = new Map(ownershipFlags.map((f) => [f.item_id, f]));

  // Generate a consistent gradient based on owner's name
  const gradients = [
    "from-rose-400/20 to-pink-500/10",
    "from-amber-400/20 to-orange-500/10",
    "from-emerald-400/20 to-teal-500/10",
    "from-blue-400/20 to-indigo-500/10",
    "from-purple-400/20 to-violet-500/10",
    "from-cyan-400/20 to-sky-500/10",
  ];
  const gradientIndex = (owner.display_name || "").charCodeAt(0) % gradients.length;
  const gradient = gradients[gradientIndex];

  return (
    <div className="space-y-8 lg:space-y-10">
      {/* Header */}
      <div className="flex flex-col gap-6">
        {/* Back button */}
        <Link
          href={`/friends/${friendId}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to {owner.display_name || "friend"}&apos;s profile
        </Link>

        {/* Title row */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
              <Gift className="w-7 h-7 text-primary" />
            </div>

            {/* Title and owner */}
            <div className="min-w-0">
              <h1 className="font-[family-name:var(--font-outfit)] text-2xl sm:text-3xl font-bold">
                {wishlist.name}
              </h1>
              {/* Owner badge */}
              <div className="flex items-center gap-2 mt-2">
                <div className={`relative w-6 h-6 rounded-md bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                  <Avatar className="h-5 w-5 rounded-sm">
                    <AvatarImage src={owner.avatar_url || undefined} className="rounded-sm" />
                    <AvatarFallback className="rounded-sm bg-transparent text-[10px] font-medium">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <span className="text-sm text-muted-foreground">
                  {owner.display_name}&apos;s wishlist
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {items.length} {items.length === 1 ? "item" : "items"}
              </p>
            </div>
          </div>
        </div>

        {wishlist.description && (
          <p className="text-muted-foreground max-w-2xl">
            {wishlist.description}
          </p>
        )}
      </div>

      {/* Items */}
      <FriendWishlistItems
        items={items}
        wishlistId={wishlistId}
        claimsMap={claimsMap}
        splitClaimsMap={splitClaimsMap}
        ownershipFlagsMap={ownershipFlagsMap}
      />
    </div>
  );
}
