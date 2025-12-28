"use client";

import { useCallback } from "react";
import { Search, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { searchUsers, sendFriendRequest } from "@/lib/actions/friends";
import { toast } from "sonner";
import { useDebouncedCallback } from "use-debounce";
import { useDialogForm } from "@/lib/hooks/use-dialog-form";

interface SearchResult {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface AddFriendState {
  query: string;
  results: SearchResult[];
  isSearching: boolean;
  sendingTo: string | null;
}

const DEFAULT_STATE: AddFriendState = {
  query: "",
  results: [],
  isSearching: false,
  sendingTo: null,
};

export function AddFriendDialog({ children }: { children: React.ReactNode }) {
  const dialog = useDialogForm<AddFriendState>({
    defaultState: DEFAULT_STATE,
  });

  const debouncedSearch = useDebouncedCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      dialog.setState((prev) => ({ ...prev, results: [], isSearching: false }));
      return;
    }

    dialog.setState((prev) => ({ ...prev, isSearching: true }));
    const data = await searchUsers(searchQuery);
    dialog.setState((prev) => ({ ...prev, results: data, isSearching: false }));
  }, 300);

  const handleQueryChange = useCallback(
    (value: string) => {
      dialog.setState((prev) => ({ ...prev, query: value }));
      debouncedSearch(value);
    },
    [debouncedSearch, dialog]
  );

  async function handleSendRequest(userId: string) {
    dialog.setState((prev) => ({ ...prev, sendingTo: userId }));
    const result = await sendFriendRequest(userId);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Friend request sent!");
      dialog.setState((prev) => ({
        ...prev,
        results: prev.results.filter((u) => u.id !== userId),
      }));
    }
    dialog.setState((prev) => ({ ...prev, sendingTo: null }));
  }

  return (
    <Dialog open={dialog.open} onOpenChange={dialog.setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="px-6">
          <DialogTitle>Add Friend</DialogTitle>
          <DialogDescription>
            Search for friends by their display name.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4 pb-6 px-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={dialog.state.query}
              onChange={(e) => handleQueryChange(e.target.value)}
              className="pl-9"
            />
          </div>

          {dialog.state.isSearching && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!dialog.state.isSearching && dialog.state.query && dialog.state.results.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No users found
            </div>
          )}

          {!dialog.state.isSearching && dialog.state.results.length > 0 && (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {dialog.state.results.map((user) => {
                const initials = user.display_name
                  ? user.display_name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)
                  : "?";

                return (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-3 rounded-lg border"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <span className="flex-1 font-medium truncate">
                      {user.display_name || "Unknown"}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => handleSendRequest(user.id)}
                      disabled={dialog.state.sendingTo === user.id}
                    >
                      {dialog.state.sendingTo === user.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Add
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
