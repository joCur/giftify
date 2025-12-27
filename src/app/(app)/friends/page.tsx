import { getMyFriends, getPendingRequests } from "@/lib/actions/friends";
import { getMyInvites } from "@/lib/actions/invites";
import { FriendsPageContent } from "@/components/friends/friends-page-content";

export default async function FriendsPage() {
  const [friends, requests, invites] = await Promise.all([
    getMyFriends(),
    getPendingRequests(),
    getMyInvites(),
  ]);

  return (
    <FriendsPageContent
      friends={friends}
      requests={requests}
      invites={invites}
    />
  );
}
