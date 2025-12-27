"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gift, Users, User, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/wishlists", label: "Wishlists", icon: Gift },
  { href: "/friends", label: "Friends", icon: Users },
  { href: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
      {/* Glass background */}
      <div className="absolute inset-0 glass border-t-0" />

      <div className="relative container max-w-2xl mx-auto px-2">
        <div className="flex items-center justify-around h-16">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {/* Active indicator */}
                {isActive && (
                  <span className="absolute top-2 w-8 h-1 rounded-full bg-primary" />
                )}
                <span
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-xl transition-all",
                    isActive && "bg-primary/10"
                  )}
                >
                  <Icon className={cn("w-5 h-5", isActive && "scale-110")} />
                </span>
                <span className={cn(
                  "text-[10px] font-medium",
                  isActive && "text-primary"
                )}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Safe area padding for iOS */}
      <div className="h-[env(safe-area-inset-bottom)] glass" />
    </nav>
  );
}
