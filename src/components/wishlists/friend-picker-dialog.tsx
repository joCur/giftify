"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Users, Search, Check, UserCheck } from "lucide-react";
import {
  getFriendsWithSelectionState,
  updateWishlistSelectedFriends,
} from "@/lib/actions/wishlist-visibility";
import type { SelectableFriend } from "@/lib/supabase/types";
import { getInitials } from "@/lib/utils";

interface FriendPickerDialogProps {
  wishlistId: string;
  children: React.ReactNode;
  /** If provided, works in "local" mode - doesn't save to DB, just calls onSelect */
  selectedFriendIds?: string[];
  /** Called when selection changes in local mode */
  onSelect?: (friendIds: string[]) => void;
  /** Called after saving to DB (only in DB mode) */
  onSave?: (count: number) => void;
}

export function FriendPickerDialog({
  wishlistId,
  children,
  selectedFriendIds,
  onSelect,
  onSave,
}: FriendPickerDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [friends, setFriends] = useState<SelectableFriend[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Determine if we're in "local" mode (controlled by parent) or "DB" mode
  const isLocalMode = selectedFriendIds !== undefined;

  const loadFriends = useCallback(async () => {
    setIsLoading(true);
    const result = await getFriendsWithSelectionState(wishlistId);

    if (result.error) {
      toast.error(result.error);
      setOpen(false);
    } else {
      // In local mode, use the provided selectedFriendIds for selection state
      if (isLocalMode) {
        const selectedSet = new Set(selectedFriendIds);
        setFriends(
          (result.data || []).map((f) => ({
            ...f,
            isSelected: selectedSet.has(f.id),
          }))
        );
      } else {
        setFriends(result.data || []);
      }
    }
    setIsLoading(false);
  }, [wishlistId, isLocalMode, selectedFriendIds]);

  // Load friends when dialog opens
  useEffect(() => {
    if (open) {
      loadFriends();
    }
  }, [open, loadFriends]);

  function toggleFriend(friendId: string) {
    setFriends((prev) =>
      prev.map((friend) =>
        friend.id === friendId
          ? { ...friend, isSelected: !friend.isSelected }
          : friend
      )
    );
  }

  function selectAll() {
    setFriends((prev) => prev.map((friend) => ({ ...friend, isSelected: true })));
  }

  function deselectAll() {
    setFriends((prev) => prev.map((friend) => ({ ...friend, isSelected: false })));
  }

  async function handleSave() {
    const selectedIds = friends.filter((f) => f.isSelected).map((f) => f.id);

    // In local mode, just update parent state without saving to DB
    if (isLocalMode) {
      onSelect?.(selectedIds);
      toast.success(
        selectedIds.length === 0
          ? "No friends selected"
          : `${selectedIds.length} ${selectedIds.length === 1 ? "friend" : "friends"} selected`
      );
      setOpen(false);
      return;
    }

    // In DB mode, save to database
    setIsSaving(true);
    const result = await updateWishlistSelectedFriends(wishlistId, selectedIds);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(
        selectedIds.length === 0
          ? "No friends selected - wishlist is hidden from everyone"
          : `Visible to ${selectedIds.length} ${selectedIds.length === 1 ? "friend" : "friends"}`
      );
      onSave?.(selectedIds.length);
      setOpen(false);
    }
    setIsSaving(false);
  }

  const filteredFriends = friends.filter((friend) =>
    friend.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedCount = friends.filter((f) => f.isSelected).length;

  // Generate gradients for avatars
  const gradients = [
    "from-rose-400/20 to-pink-500/10",
    "from-amber-400/20 to-orange-500/10",
    "from-emerald-400/20 to-teal-500/10",
    "from-blue-400/20 to-indigo-500/10",
    "from-purple-400/20 to-violet-500/10",
    "from-cyan-400/20 to-sky-500/10",
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px] overflow-hidden">
        {/* Header */}
        <div className="px-5 sm:px-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="font-[family-name:var(--font-outfit)] text-xl">
                Select Friends
              </DialogTitle>
              <DialogDescription className="text-sm">
                Choose who can see this wishlist
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-5 sm:px-6 space-y-4">
          {/* Search and actions */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search friends..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={isLoading}
                className="h-10 pl-9 rounded-xl bg-muted/50 border-border/50 focus:bg-background transition-colors"
              />
            </div>
            {!isLoading && friends.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={selectedCount === friends.length ? deselectAll : selectAll}
                className="rounded-xl text-xs shrink-0"
              >
                {selectedCount === friends.length ? "Deselect all" : "Select all"}
              </Button>
            )}
          </div>

          {/* Friend list */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? "No friends match your search"
                  : "No friends yet. Add friends first!"}
              </p>
            </div>
          ) : (
            <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1">
              {filteredFriends.map((friend) => {
                const initials = getInitials(friend.display_name);
                const isSelected = friend.isSelected || false;
                const gradient = gradients[(friend.display_name || "").charCodeAt(0) % gradients.length];

                return (
                  <button
                    key={friend.id}
                    type="button"
                    onClick={() => toggleFriend(friend.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border/50 hover:border-border hover:bg-muted/30"
                    }`}
                  >
                    {/* Avatar */}
                    <div className={`relative w-10 h-10 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                      <Avatar className="h-9 w-9 rounded-lg">
                        <AvatarImage
                          src={friend.avatar_url || undefined}
                          className="rounded-lg"
                        />
                        <AvatarFallback className="rounded-lg bg-transparent text-sm font-semibold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    {/* Name */}
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium text-sm truncate">
                        {friend.display_name || "Unknown"}
                      </p>
                    </div>

                    {/* Check mark */}
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-5 mt-2 border-t border-border/50 bg-background pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-5 space-y-3">
          {/* Selection count */}
          <p className="text-sm text-center text-muted-foreground">
            {selectedCount === 0 ? (
              "No friends selected"
            ) : (
              <>
                {selectedCount} {selectedCount === 1 ? "friend" : "friends"}{" "}
                selected
              </>
            )}
          </p>

          {/* Save button */}
          <Button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="w-full h-11 rounded-xl text-base font-semibold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 transition-all"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Save Selection
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
