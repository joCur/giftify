"use client";

import { useEffect, useTransition } from "react";
import { Users, Search, Loader2, Check } from "lucide-react";
import { useDialogForm } from "@/lib/hooks/use-dialog-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { getInitials } from "@/lib/utils";
import { getAvailableFriendsForCollaboration, convertToJointWishlist } from "@/lib/actions/collaborators";
import { toast } from "sonner";

interface ConvertToJointDialogProps {
  wishlistId: string;
  wishlistName: string;
  children?: React.ReactNode;
}

interface Friend {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface ConvertToJointState {
  friends: Friend[];
  selectedIds: string[];
  searchQuery: string;
  isLoading: boolean;
}

const DEFAULT_STATE: ConvertToJointState = {
  friends: [],
  selectedIds: [],
  searchQuery: "",
  isLoading: false,
};

export function ConvertToJointDialog({
  wishlistId,
  wishlistName,
  children,
}: ConvertToJointDialogProps) {
  const dialog = useDialogForm<ConvertToJointState>({
    defaultState: DEFAULT_STATE,
  });
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (dialog.open) {
      dialog.setState((prev) => ({ ...prev, isLoading: true }));
      getAvailableFriendsForCollaboration(wishlistId).then((result) => {
        if ("data" in result) {
          dialog.setState((prev) => ({
            ...prev,
            friends: result.data || [],
            isLoading: false,
          }));
        } else {
          dialog.setState((prev) => ({ ...prev, isLoading: false }));
        }
      });
    }
  }, [dialog.open, wishlistId, dialog]);

  const filteredFriends = dialog.state.friends.filter(
    (f) =>
      f.display_name?.toLowerCase().includes(dialog.state.searchQuery.toLowerCase()) ||
      dialog.state.searchQuery === ""
  );

  const handleToggle = (friendId: string) => {
    dialog.setState((prev) => ({
      ...prev,
      selectedIds: prev.selectedIds.includes(friendId)
        ? prev.selectedIds.filter((id) => id !== friendId)
        : [...prev.selectedIds, friendId],
    }));
  };

  const handleConvert = () => {
    if (dialog.state.selectedIds.length === 0) {
      toast.error("Select at least one friend");
      return;
    }

    startTransition(async () => {
      const result = await convertToJointWishlist(wishlistId, dialog.state.selectedIds);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Wishlist converted to joint!");
        dialog.closeDialog();
      }
    });
  };

  return (
    <Dialog open={dialog.open} onOpenChange={dialog.setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="rounded-xl">
            <Users className="w-4 h-4 mr-2" />
            Make Joint
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-outfit)]">
            Convert to Joint Wishlist
          </DialogTitle>
          <DialogDescription>
            Add friends as co-owners of &quot;{wishlistName}&quot;. They can add and
            edit items.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search friends..."
              value={dialog.state.searchQuery}
              onChange={(e) =>
                dialog.setState((prev) => ({ ...prev, searchQuery: e.target.value }))
              }
              className="pl-9 rounded-xl"
            />
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {dialog.state.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredFriends.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {dialog.state.searchQuery ? "No friends found" : "You don't have any friends yet"}
              </p>
            ) : (
              filteredFriends.map((friend) => {
                const isSelected = dialog.state.selectedIds.includes(friend.id);
                return (
                  <div
                    key={friend.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border/50 hover:border-border bg-card"
                    }`}
                    onClick={() => handleToggle(friend.id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggle(friend.id)}
                      className="pointer-events-none"
                    />
                    <Avatar>
                      <AvatarImage src={friend.avatar_url || undefined} />
                      <AvatarFallback>
                        {getInitials(friend.display_name || "User")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {friend.display_name || "Unknown"}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => dialog.closeDialog()}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConvert}
            disabled={isPending || dialog.state.selectedIds.length === 0}
            className="rounded-xl"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Converting...
              </>
            ) : (
              <>
                <Users className="w-4 h-4 mr-2" />
                Add {dialog.state.selectedIds.length} Co-owner{dialog.state.selectedIds.length !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
