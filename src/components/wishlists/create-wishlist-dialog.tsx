"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createWishlist } from "@/lib/actions/wishlists";
import { toast } from "sonner";
import { Loader2, Lock, Users, Globe, Gift, Sparkles, Check } from "lucide-react";
import type { WishlistPrivacy } from "@/lib/supabase/types";

const privacyOptions: {
  value: WishlistPrivacy;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    value: "friends",
    label: "All Friends",
    description: "Visible to all your friends",
    icon: <Users className="w-5 h-5" />,
    color: "from-emerald-400 to-teal-500",
  },
  {
    value: "public",
    label: "Public",
    description: "Same as friends (all friends can see)",
    icon: <Globe className="w-5 h-5" />,
    color: "from-blue-400 to-indigo-500",
  },
  {
    value: "private",
    label: "Private",
    description: "Only visible to you",
    icon: <Lock className="w-5 h-5" />,
    color: "from-gray-400 to-gray-500",
  },
];

export function CreateWishlistDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [privacy, setPrivacy] = useState<WishlistPrivacy>("friends");
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    formData.set("privacy", privacy);

    const result = await createWishlist(formData);

    if (result.error) {
      toast.error(result.error);
      setIsLoading(false);
      return;
    }

    toast.success("Wishlist created!");
    setOpen(false);
    setIsLoading(false);

    if (result.data) {
      router.push(`/wishlists/${result.data.id}`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[440px] overflow-hidden">
        <form action={handleSubmit} className="flex flex-col">
          {/* Header */}
          <div className="px-5 sm:px-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground shadow-md shadow-primary/20">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="font-[family-name:var(--font-outfit)] text-xl">
                  Create Wishlist
                </DialogTitle>
                <DialogDescription className="text-sm">
                  Start a new collection of things you want
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto px-5 sm:px-6 space-y-5 max-h-[60vh] sm:max-h-none">
            {/* Name field */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Name
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="Birthday 2024"
                required
                disabled={isLoading}
                className="h-11 rounded-xl bg-muted/50 border-border/50 focus:bg-background transition-colors"
              />
            </div>

            {/* Description field */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="description"
                name="description"
                placeholder="Things I'd love for my birthday"
                disabled={isLoading}
                className="h-11 rounded-xl bg-muted/50 border-border/50 focus:bg-background transition-colors"
              />
            </div>

            {/* Privacy options */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Privacy</Label>
              <div className="grid gap-2">
                {privacyOptions.map((option) => {
                  const isSelected = privacy === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setPrivacy(option.value)}
                      disabled={isLoading}
                      className={`relative flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border/50 hover:border-border hover:bg-muted/30"
                      }`}
                    >
                      {/* Icon */}
                      <div
                        className={`w-10 h-10 rounded-lg bg-gradient-to-br ${option.color} flex items-center justify-center text-white shadow-sm`}
                      >
                        {option.icon}
                      </div>

                      {/* Text */}
                      <div className="flex-1">
                        <div className="font-medium text-sm">{option.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {option.description}
                        </div>
                      </div>

                      {/* Check mark */}
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer - fixed at bottom */}
          <div className="px-5 sm:px-6 py-5 mt-2 border-t border-border/50 bg-background pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-5">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-xl text-base font-semibold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Create Wishlist
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
