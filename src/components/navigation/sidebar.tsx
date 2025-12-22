"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gift, Users, User, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Profile } from "@/lib/supabase/types";

const navItems = [
  { href: "/dashboard", label: "My Wishlists", icon: Gift },
  { href: "/friends", label: "Friends", icon: Users },
  { href: "/profile", label: "Profile", icon: User },
];

interface SidebarProps {
  profile: Profile | null;
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname();

  const initials = profile?.display_name
    ? profile.display_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-border/50 bg-card/50 h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-border/50">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-md shadow-primary/20 transition-transform group-hover:scale-105">
            <Gift className="w-5 h-5" />
          </div>
          <span className="font-[family-name:var(--font-outfit)] font-bold text-xl">
            Giftify
          </span>
        </Link>
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
          <Avatar className="h-10 w-10 ring-2 ring-border">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="text-sm font-medium bg-secondary text-secondary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
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
