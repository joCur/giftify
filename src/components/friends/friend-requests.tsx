"use client";

import { useState } from "react";
import { Check, X, Loader2, Clock, UserCheck, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
} from "@/lib/actions/friends";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface IncomingRequest {
  id: string;
  from: Profile;
  created_at: string;
}

interface OutgoingRequest {
  id: string;
  to: Profile;
  created_at: string;
}

export function FriendRequests({
  incoming,
  outgoing,
}: {
  incoming: IncomingRequest[];
  outgoing: OutgoingRequest[];
}) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleAccept(id: string) {
    setLoadingId(id);
    const result = await acceptFriendRequest(id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Friend request accepted!");
    }
    setLoadingId(null);
  }

  async function handleDecline(id: string) {
    setLoadingId(id);
    const result = await declineFriendRequest(id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Friend request declined");
    }
    setLoadingId(null);
  }

  async function handleCancel(id: string) {
    setLoadingId(id);
    const result = await cancelFriendRequest(id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Friend request cancelled");
    }
    setLoadingId(null);
  }

  if (incoming.length === 0 && outgoing.length === 0) {
    return (
      <div className="bg-card border border-border/50 rounded-2xl p-6 lg:p-8">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mb-4">
            <Clock className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="font-[family-name:var(--font-outfit)] text-base font-semibold mb-2">
            No pending requests
          </h3>
          <p className="text-muted-foreground text-sm max-w-[250px]">
            Friend requests you send or receive will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Incoming Requests */}
      {incoming.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <UserCheck className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-medium text-muted-foreground">
              Incoming
            </h3>
            <span className="ml-auto text-xs text-muted-foreground/60">
              {incoming.length}
            </span>
          </div>
          <div className="space-y-2">
            {incoming.map((request) => {
              const initials = request.from.display_name
                ? request.from.display_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)
                : "?";

              return (
                <div
                  key={request.id}
                  className="group bg-card border border-border/50 rounded-xl p-4 hover:shadow-md hover:shadow-primary/5 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-11 w-11 rounded-lg">
                        <AvatarImage
                          src={request.from.avatar_url || undefined}
                          className="rounded-lg"
                        />
                        <AvatarFallback className="rounded-lg bg-gradient-to-br from-emerald-400/20 to-teal-500/10 text-sm font-medium">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                        <UserCheck className="w-2.5 h-2.5 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm">
                        {request.from.display_name || "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(request.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
                        onClick={() => handleDecline(request.id)}
                        disabled={loadingId === request.id}
                      >
                        {loadingId === request.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <X className="w-3.5 h-3.5" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        className="h-8 w-8 rounded-lg shadow-sm shadow-primary/20"
                        onClick={() => handleAccept(request.id)}
                        disabled={loadingId === request.id}
                      >
                        {loadingId === request.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Outgoing Requests */}
      {outgoing.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Send className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-medium text-muted-foreground">
              Sent
            </h3>
            <span className="ml-auto text-xs text-muted-foreground/60">
              {outgoing.length}
            </span>
          </div>
          <div className="space-y-2">
            {outgoing.map((request) => {
              const initials = request.to.display_name
                ? request.to.display_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)
                : "?";

              return (
                <div
                  key={request.id}
                  className="group bg-card border border-border/50 rounded-xl p-4 hover:shadow-md hover:shadow-primary/5 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-11 w-11 rounded-lg">
                        <AvatarImage
                          src={request.to.avatar_url || undefined}
                          className="rounded-lg"
                        />
                        <AvatarFallback className="rounded-lg bg-gradient-to-br from-blue-400/20 to-indigo-500/10 text-sm font-medium">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                        <Send className="w-2 h-2 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm">
                        {request.to.display_name || "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Pending •{" "}
                        {formatDistanceToNow(new Date(request.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-lg text-xs hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
                      onClick={() => handleCancel(request.id)}
                      disabled={loadingId === request.id}
                    >
                      {loadingId === request.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        "Cancel"
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
