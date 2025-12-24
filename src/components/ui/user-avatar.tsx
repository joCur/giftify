"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/utils/avatar";
import { getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";

export interface UserAvatarProps {
  /** Custom avatar URL from the profile */
  avatarUrl?: string | null;
  /** User's email for Gravatar fallback */
  email?: string | null;
  /** Display name for generating initials fallback */
  displayName?: string | null;
  /** Size variant */
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** Additional CSS classes for the Avatar container */
  className?: string;
  /** Additional CSS classes for the fallback */
  fallbackClassName?: string;
}

const sizeClasses = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-xl",
  xl: "h-24 w-24 text-3xl",
};

/**
 * UserAvatar - A smart avatar component with intelligent fallback
 *
 * Fallback priority:
 * 1. Custom avatar_url (uploaded image)
 * 2. Gravatar (from email)
 * 3. Initials (from display name)
 */
export function UserAvatar({
  avatarUrl,
  email,
  displayName,
  size = "md",
  className,
  fallbackClassName,
}: UserAvatarProps) {
  const imageUrl = getAvatarUrl(avatarUrl, email);
  const initials = getInitials(displayName);

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {imageUrl && <AvatarImage src={imageUrl} alt={displayName || "User avatar"} />}
      <AvatarFallback className={cn("font-medium", fallbackClassName)}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
