"use client";

import Link from "next/link";
import { Users, Gift, ChevronRight, Calendar, Sparkles, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, isAfter, isBefore, addDays } from "date-fns";
import { AddFriendDialog } from "./add-friend-dialog";
import { Button } from "@/components/ui/button";

interface Friend {
  friendshipId: string;
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  birthday: string | null;
}

export function FriendsList({ friends }: { friends: Friend[] }) {
  if (friends.length === 0) {
    return (
      <div className="bg-card border border-border/50 rounded-3xl p-8 md:p-12">
        <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-400/20 to-pink-500/10 flex items-center justify-center mb-6">
            <Users className="w-10 h-10 text-rose-500" />
          </div>
          <h3 className="font-[family-name:var(--font-outfit)] text-xl sm:text-2xl font-semibold mb-3">
            No friends yet
          </h3>
          <p className="text-muted-foreground mb-8">
            Add friends to see their wishlists and coordinate the perfect gifts together. No more duplicate presents!
          </p>
          <AddFriendDialog>
            <Button size="lg" className="rounded-xl shadow-md shadow-primary/20">
              <Sparkles className="w-4 h-4 mr-2" />
              Add your first friend
            </Button>
          </AddFriendDialog>
        </div>
      </div>
    );
  }

  // Sort friends: upcoming birthdays first, then alphabetically
  const sortedFriends = [...friends].sort((a, b) => {
    const today = new Date();
    const soon = addDays(today, 30);

    const aHasUpcomingBirthday =
      a.birthday &&
      (() => {
        const bd = new Date(a.birthday);
        bd.setFullYear(today.getFullYear());
        if (isBefore(bd, today)) bd.setFullYear(today.getFullYear() + 1);
        return isBefore(bd, soon);
      })();

    const bHasUpcomingBirthday =
      b.birthday &&
      (() => {
        const bd = new Date(b.birthday);
        bd.setFullYear(today.getFullYear());
        if (isBefore(bd, today)) bd.setFullYear(today.getFullYear() + 1);
        return isBefore(bd, soon);
      })();

    if (aHasUpcomingBirthday && !bHasUpcomingBirthday) return -1;
    if (!aHasUpcomingBirthday && bHasUpcomingBirthday) return 1;

    return (a.display_name || "").localeCompare(b.display_name || "");
  });

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {sortedFriends.map((friend) => {
        const initials = friend.display_name
          ? friend.display_name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)
          : "?";

        const today = new Date();
        const soon = addDays(today, 30);

        let hasUpcomingBirthday = false;
        let birthdayDate: Date | null = null;
        let daysUntilBirthday = 0;

        if (friend.birthday) {
          const bd = new Date(friend.birthday);
          bd.setFullYear(today.getFullYear());
          if (isBefore(bd, today)) bd.setFullYear(today.getFullYear() + 1);
          hasUpcomingBirthday = isAfter(bd, today) && isBefore(bd, soon);
          birthdayDate = bd;
          daysUntilBirthday = Math.ceil((bd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        }

        // Generate a consistent gradient based on friend's name
        const gradients = [
          "from-rose-400/20 to-pink-500/10",
          "from-amber-400/20 to-orange-500/10",
          "from-emerald-400/20 to-teal-500/10",
          "from-blue-400/20 to-indigo-500/10",
          "from-purple-400/20 to-violet-500/10",
          "from-cyan-400/20 to-sky-500/10",
        ];
        const gradientIndex = (friend.display_name || "").charCodeAt(0) % gradients.length;
        const gradient = gradients[gradientIndex];

        return (
          <Link key={friend.id} href={`/friends/${friend.id}`}>
            <div className="group relative h-full bg-card border border-border/50 rounded-2xl p-5 hover:shadow-xl hover:shadow-primary/5 transition-all duration-200 hover:-translate-y-1">
              {/* Hover gradient overlay */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="relative flex flex-col h-full">
                {/* Top row: Avatar and birthday badge */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`relative w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                    <Avatar className="h-12 w-12 rounded-lg">
                      <AvatarImage src={friend.avatar_url || undefined} className="rounded-lg" />
                      <AvatarFallback className="rounded-lg bg-transparent text-lg font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  {hasUpcomingBirthday && birthdayDate && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-600">
                      <Calendar className="w-3 h-3" />
                      {daysUntilBirthday === 0
                        ? "Today!"
                        : daysUntilBirthday === 1
                          ? "Tomorrow!"
                          : `${daysUntilBirthday}d`}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors truncate">
                    {friend.display_name || "Unknown"}
                  </h3>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Gift className="w-3.5 h-3.5" />
                    <span>View wishlists</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-border/50 mt-4">
                  {friend.birthday ? (
                    <p className="text-xs text-muted-foreground">
                      Birthday: {format(new Date(friend.birthday), "MMM d")}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground/50">
                      No birthday set
                    </p>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            </div>
          </Link>
        );
      })}

      {/* Add new friend card */}
      <AddFriendDialog>
        <button className="group relative h-full min-h-[200px] bg-card/50 border-2 border-dashed border-border/50 rounded-2xl p-5 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 text-left w-full">
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
              <UserPlus className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <p className="font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              Add new friend
            </p>
          </div>
        </button>
      </AddFriendDialog>
    </div>
  );
}
