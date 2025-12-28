"use client";

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
import { Loader2, Lock, Users, UserCheck, Gift, Sparkles, Check } from "lucide-react";
import type { WishlistPrivacy } from "@/lib/supabase/types.custom";
import { useDialogForm } from "@/lib/hooks/use-dialog-form";

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
    value: "selected_friends",
    label: "Selected Friends",
    description: "Choose specific friends",
    icon: <UserCheck className="w-5 h-5" />,
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

interface CreateWishlistState {
  isLoading: boolean;
  privacy: WishlistPrivacy;
}

const DEFAULT_STATE: CreateWishlistState = {
  isLoading: false,
  privacy: "friends",
};

export function CreateWishlistDialog({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const dialog = useDialogForm<CreateWishlistState>({
    defaultState: DEFAULT_STATE,
  });

  async function handleSubmit(formData: FormData) {
    dialog.setState((prev) => ({ ...prev, isLoading: true }));
    formData.set("privacy", dialog.state.privacy);

    const result = await createWishlist(formData);

    if (result.error) {
      toast.error(result.error);
      dialog.setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    toast.success("Wishlist created!");
    dialog.closeDialog();

    if (result.data) {
      router.push(`/wishlists/${result.data.id}`);
    }
  }

  return (
    <Dialog open={dialog.open} onOpenChange={dialog.setOpen}>
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
                disabled={dialog.state.isLoading}
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
                disabled={dialog.state.isLoading}
                className="h-11 rounded-xl bg-muted/50 border-border/50 focus:bg-background transition-colors"
              />
            </div>

            {/* Privacy options */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Privacy</Label>
              <div className="grid gap-2">
                {privacyOptions.map((option) => {
                  const isSelected = dialog.state.privacy === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        dialog.setState((prev) => ({ ...prev, privacy: option.value }))
                      }
                      disabled={dialog.state.isLoading}
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
              {dialog.state.privacy === "selected_friends" && (
                <p className="text-xs text-muted-foreground p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                  You can choose specific friends after creating the wishlist
                </p>
              )}
            </div>
          </div>

          {/* Footer - fixed at bottom */}
          <div className="px-5 sm:px-6 py-5 mt-2 border-t border-border/50 bg-background pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-5">
            <Button
              type="submit"
              disabled={dialog.state.isLoading}
              className="w-full h-11 rounded-xl text-base font-semibold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 transition-all"
            >
              {dialog.state.isLoading ? (
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
