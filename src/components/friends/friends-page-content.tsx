"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FriendsList } from "./friends-list";
import { FriendRequests } from "./friend-requests";
import { AddFriendDialog } from "./add-friend-dialog";
import { InvitesList } from "@/components/invites/invites-list";
import { GenerateInviteButton } from "@/components/invites/generate-invite-button";
import { Button } from "@/components/ui/button";
import { UserPlus, Users, Inbox, Ticket, Send } from "lucide-react";
import type { InviteCode } from "@/lib/actions/invites";

interface Friend {
  friendshipId: string;
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  birthday: string | null;
}

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

interface FriendsPageContentProps {
  friends: Friend[];
  requests: {
    incoming: IncomingRequest[];
    outgoing: OutgoingRequest[];
  };
  invites: InviteCode[];
}

export function FriendsPageContent({
  friends,
  requests,
  invites,
}: FriendsPageContentProps) {
  const pendingCount = requests.incoming.length;
  const hasRequests = requests.incoming.length > 0 || requests.outgoing.length > 0;

  const activeInvites = invites.filter(
    (i) => !i.used_at && new Date(i.expires_at) > new Date()
  );
  const usedInvites = invites.filter((i) => i.used_at);

  return (
    <div className="space-y-8 lg:space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-outfit)] text-2xl sm:text-3xl font-bold">
            Friends
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {friends.length} {friends.length === 1 ? "friend" : "friends"} connected
          </p>
        </div>
        <div className="flex gap-2">
          <GenerateInviteButton />
          <AddFriendDialog>
            <Button className="rounded-xl shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 transition-all hover:-translate-y-0.5">
              <UserPlus className="w-4 h-4 mr-2" />
              Add Friend
            </Button>
          </AddFriendDialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="friends" className="space-y-6">
        <TabsList className="h-10">
          <TabsTrigger value="friends" className="gap-2 px-4">
            <Users className="w-4 h-4" />
            Friends
          </TabsTrigger>
          <TabsTrigger value="invites" className="gap-2 px-4">
            <Ticket className="w-4 h-4" />
            Invite Codes
          </TabsTrigger>
        </TabsList>

        {/* Friends Tab */}
        <TabsContent value="friends">
          <div className="grid gap-8 lg:grid-cols-[1fr,380px] xl:grid-cols-[1fr,420px]">
            {/* Main content - Friends Grid */}
            <div className="space-y-6 order-2 lg:order-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-400/20 to-pink-500/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <h2 className="font-[family-name:var(--font-outfit)] text-lg font-semibold">
                    Your Friends
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    View their wishlists and coordinate gifts
                  </p>
                </div>
              </div>

              <FriendsList friends={friends} />
            </div>

            {/* Sidebar - Requests */}
            <div className="space-y-6 order-1 lg:order-2">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/20 to-orange-500/10 flex items-center justify-center">
                    <Inbox className="w-5 h-5 text-amber-500" />
                  </div>
                  {pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow-md">
                      {pendingCount}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="font-[family-name:var(--font-outfit)] text-lg font-semibold">
                    Friend Requests
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {hasRequests ? "Pending requests to review" : "No pending requests"}
                  </p>
                </div>
              </div>

              <FriendRequests
                incoming={requests.incoming}
                outgoing={requests.outgoing}
              />
            </div>
          </div>
        </TabsContent>

        {/* Invites Tab */}
        <TabsContent value="invites">
          <div className="grid gap-8 lg:grid-cols-[1fr,380px] xl:grid-cols-[1fr,420px]">
            {/* Main content - Active Invites */}
            <div className="space-y-6 order-2 lg:order-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400/20 to-teal-500/10 flex items-center justify-center">
                  <Ticket className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <h2 className="font-[family-name:var(--font-outfit)] text-lg font-semibold">
                    Active Invites
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {activeInvites.length} invite{activeInvites.length !== 1 ? "s" : ""} available
                  </p>
                </div>
              </div>

              <InvitesList invites={activeInvites} type="active" />
            </div>

            {/* Sidebar - Used Invites */}
            <div className="space-y-6 order-1 lg:order-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400/20 to-purple-500/10 flex items-center justify-center">
                  <Send className="w-5 h-5 text-violet-500" />
                </div>
                <div>
                  <h2 className="font-[family-name:var(--font-outfit)] text-lg font-semibold">
                    Used Invites
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {usedInvites.length} friend{usedInvites.length !== 1 ? "s" : ""} joined via your invites
                  </p>
                </div>
              </div>

              <InvitesList invites={usedInvites} type="used" />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
