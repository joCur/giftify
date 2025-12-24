"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gift, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/user-avatar";
import { NotificationBell } from "@/components/notifications/notification-bell";
import type { ProfileWithEmail } from "@/lib/supabase/types";

const navItems = [
  { href: "/dashboard", label: "My Wishlists", icon: Gift },
  { href: "/friends", label: "Friends", icon: Users },
  { href: "/profile", label: "Profile", icon: User },
];

interface SidebarProps {
  profile: ProfileWithEmail | null;
  userId: string;
}

export function Sidebar({ profile, userId }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-border/50 bg-card/50 h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-md shadow-primary/20 transition-transform group-hover:scale-105">
              <Gift className="w-5 h-5" />
            </div>
            <span className="font-[family-name:var(--font-outfit)] font-bold text-xl">
              Giftify
            </span>
          </Link>
          <NotificationBell userId={userId} />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "text-primary")} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-border/50">
        <Link
          href="/profile"
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors"
        >
          <UserAvatar
            avatarUrl={profile?.avatar_url}
            email={profile?.email}
            displayName={profile?.display_name}
            size="md"
            className="ring-2 ring-border"
            fallbackClassName="bg-secondary text-secondary-foreground"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {profile?.display_name || "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              View profile
            </p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
