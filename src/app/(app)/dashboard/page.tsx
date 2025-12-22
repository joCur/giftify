import Link from "next/link";
import { Plus, Lock, Users, Globe, Gift, Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMyWishlists } from "@/lib/actions/wishlists";
import { CreateWishlistDialog } from "@/components/wishlists/create-wishlist-dialog";
import type { WishlistPrivacy } from "@/lib/supabase/types";

const privacyConfig: Record<WishlistPrivacy, { icon: React.ReactNode; label: string; color: string }> = {
  private: {
    icon: <Lock className="w-3 h-3" />,
    label: "Private",
    color: "bg-muted text-muted-foreground",
  },
  friends: {
    icon: <Users className="w-3 h-3" />,
    label: "Friends",
    color: "bg-emerald-500/10 text-emerald-600",
  },
  public: {
    icon: <Globe className="w-3 h-3" />,
    label: "Public",
    color: "bg-blue-500/10 text-blue-600",
  },
};

export default async function DashboardPage() {
  const wishlists = await getMyWishlists();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-outfit)] text-2xl sm:text-3xl font-bold">
            My Wishlists
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {wishlists.length} {wishlists.length === 1 ? "wishlist" : "wishlists"} total
          </p>
        </div>
        <CreateWishlistDialog>
          <Button className="rounded-xl shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 transition-all hover:-translate-y-0.5">
            <Plus className="w-4 h-4 mr-2" />
            New Wishlist
          </Button>
        </CreateWishlistDialog>
      </div>

      {/* Wishlists Grid */}
      {wishlists.length === 0 ? (
        <div className="bg-card border border-border/50 rounded-3xl p-8 md:p-12 lg:p-16">
          <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6">
              <Gift className="w-10 h-10 text-primary" />
            </div>
            <h3 className="font-[family-name:var(--font-outfit)] text-xl sm:text-2xl font-semibold mb-3">
              No wishlists yet
            </h3>
            <p className="text-muted-foreground mb-8">
              Create your first wishlist to start adding items you&apos;d love to receive. Share it with friends and family!
            </p>
            <CreateWishlistDialog>
              <Button size="lg" className="rounded-xl shadow-md shadow-primary/20">
                <Sparkles className="w-4 h-4 mr-2" />
                Create your first wishlist
              </Button>
            </CreateWishlistDialog>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {wishlists.map((wishlist) => {
            const itemCount =
              (wishlist.items as unknown as { count: number }[])?.[0]?.count || 0;
            const privacy = privacyConfig[wishlist.privacy];

            return (
              <Link key={wishlist.id} href={`/wishlists/${wishlist.id}`}>
                <div className="group relative h-full bg-card border border-border/50 rounded-2xl p-5 hover:shadow-xl hover:shadow-primary/5 transition-all duration-200 hover:-translate-y-1">
                  {/* Hover gradient overlay */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="relative flex flex-col h-full">
                    {/* Top row: Icon and privacy badge */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Gift className="w-5 h-5 text-primary" />
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium ${privacy.color}`}>
                        {privacy.icon}
                        {privacy.label}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
                        {wishlist.name}
                      </h3>
                      {wishlist.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {wishlist.description}
                        </p>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-border/50 mt-auto">
                      <p className="text-sm text-muted-foreground">
                        {itemCount} {itemCount === 1 ? "item" : "items"}
                      </p>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}

          {/* Add new card */}
          <CreateWishlistDialog>
            <button className="group relative h-full min-h-[200px] bg-card/50 border-2 border-dashed border-border/50 rounded-2xl p-5 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 text-left">
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
                  <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <p className="font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  Create new wishlist
                </p>
              </div>
            </button>
          </CreateWishlistDialog>
        </div>
      )}
    </div>
  );
}
