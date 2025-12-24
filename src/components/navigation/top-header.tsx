"use client";

import Link from "next/link";
import { Gift } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { NotificationBell } from "@/components/notifications/notification-bell";
import type { ProfileWithEmail } from "@/lib/supabase/types";

interface TopHeaderProps {
  profile: ProfileWithEmail | null;
  userId: string;
}

export function TopHeader({ profile, userId }: TopHeaderProps) {
  return (
    <header className="lg:hidden sticky top-0 z-40 glass">
      <div className="px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-md shadow-primary/20 transition-transform group-hover:scale-105">
              <Gift className="w-4 h-4" />
            </div>
            <span className="font-[family-name:var(--font-outfit)] font-semibold text-lg">
              Giftify
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell userId={userId} />
            <Link href="/profile" className="group">
              <UserAvatar
                avatarUrl={profile?.avatar_url}
                email={profile?.email}
                displayName={profile?.display_name}
                size="sm"
                className="h-9 w-9 ring-2 ring-border ring-offset-2 ring-offset-background transition-all group-hover:ring-primary/50"
                fallbackClassName="bg-secondary text-secondary-foreground"
              />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
