"use client";

import { useEffect, useTransition } from "react";
import { UserPlus, Search, Loader2 } from "lucide-react";
import { useDialogForm } from "@/lib/hooks/use-dialog-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { getAvailableFriendsForCollaboration, addCollaborator } from "@/lib/actions/collaborators";
import { toast } from "sonner";

interface AddCollaboratorDialogProps {
  wishlistId: string;
  existingCollaboratorIds: string[];
  children: React.ReactNode;
}

interface Friend {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface AddCollaboratorState {
  friends: Friend[];
  searchQuery: string;
  isLoading: boolean;
  addingId: string | null;
}

const DEFAULT_STATE: AddCollaboratorState = {
  friends: [],
  searchQuery: "",
  isLoading: false,
  addingId: null,
};

export function AddCollaboratorDialog({
  wishlistId,
  existingCollaboratorIds,
  children,
}: AddCollaboratorDialogProps) {
  const dialog = useDialogForm<AddCollaboratorState>({
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
      !existingCollaboratorIds.includes(f.id) &&
      (f.display_name?.toLowerCase().includes(dialog.state.searchQuery.toLowerCase()) ||
        dialog.state.searchQuery === "")
  );

  const handleAdd = async (friendId: string) => {
    dialog.setState((prev) => ({ ...prev, addingId: friendId }));

    startTransition(async () => {
      const result = await addCollaborator(wishlistId, friendId);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Collaborator added!");
        // Remove the friend from the local list
        dialog.setState((prev) => ({
          ...prev,
          friends: prev.friends.filter((f) => f.id !== friendId),
        }));
      }

      dialog.setState((prev) => ({ ...prev, addingId: null }));
    });
  };

  return (
    <Dialog open={dialog.open} onOpenChange={dialog.setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-outfit)]">
            Add Collaborator
          </DialogTitle>
          <DialogDescription>
            Choose a friend to add as a co-owner. They can add and edit items.
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
                {dialog.state.searchQuery
                  ? "No friends found"
                  : dialog.state.friends.length === 0
                  ? "You don't have any friends who can be added"
                  : "All your friends are already collaborators"}
              </p>
            ) : (
              filteredFriends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 hover:border-primary/20 transition-colors"
                >
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
                  <Button
                    size="sm"
                    onClick={() => handleAdd(friend.id)}
                    disabled={isPending || dialog.state.addingId === friend.id}
                    className="rounded-lg shrink-0"
                  >
                    {dialog.state.addingId === friend.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add
                      </>
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
