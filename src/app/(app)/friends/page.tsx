import { getMyFriends, getPendingRequests } from "@/lib/actions/friends";
import { FriendsList } from "@/components/friends/friends-list";
import { FriendRequests } from "@/components/friends/friend-requests";
import { AddFriendDialog } from "@/components/friends/add-friend-dialog";
import { Button } from "@/components/ui/button";
import { UserPlus, Users, Inbox } from "lucide-react";

export default async function FriendsPage() {
  const [friends, requests] = await Promise.all([
    getMyFriends(),
    getPendingRequests(),
  ]);

  const pendingCount = requests.incoming.length;
  const hasRequests = requests.incoming.length > 0 || requests.outgoing.length > 0;

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
        <AddFriendDialog>
          <Button className="rounded-xl shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 transition-all hover:-translate-y-0.5">
            <UserPlus className="w-4 h-4 mr-2" />
            Add Friend
          </Button>
        </AddFriendDialog>
      </div>

      {/* Desktop: Two-column layout / Mobile: Stacked */}
      <div className="grid gap-8 lg:grid-cols-[1fr,380px] xl:grid-cols-[1fr,420px]">
        {/* Main content - Friends Grid */}
        <div className="space-y-6 order-2 lg:order-1">
          {/* Section header */}
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
          {/* Section header with notification badge */}
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
    </div>
  );
}
