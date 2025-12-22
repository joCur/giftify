"use client";

import Link from "next/link";
import { Gift } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Profile } from "@/lib/supabase/types";

interface TopHeaderProps {
  profile: Profile | null;
}

export function TopHeader({ profile }: TopHeaderProps) {
  const initials = profile?.display_name
    ? profile.display_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

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
          <Link href="/profile" className="group">
            <Avatar className="h-9 w-9 ring-2 ring-border ring-offset-2 ring-offset-background transition-all group-hover:ring-primary/50">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="text-xs font-medium bg-secondary text-secondary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </div>
    </header>
  );
}
