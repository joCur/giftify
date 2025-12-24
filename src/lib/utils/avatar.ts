import { createHash } from "crypto";

/**
 * Generate a Gravatar URL from an email address
 * @param email - The email address to generate a Gravatar URL for
 * @param size - The size of the avatar in pixels (default: 200)
 * @returns The Gravatar URL with a "mystery person" fallback
 */
export function getGravatarUrl(email: string, size = 200): string {
  const trimmedEmail = email.trim().toLowerCase();
  const hash = createHash("md5").update(trimmedEmail).digest("hex");
  // d=mp uses "mystery person" silhouette as fallback
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=mp`;
}

/**
 * Get the best available avatar URL for a profile
 * Priority: custom avatar_url > Gravatar from email > undefined (will show initials)
 * @param avatarUrl - Custom avatar URL from the profile
 * @param email - User's email for Gravatar fallback
 * @returns The avatar URL to use, or undefined if no image available
 */
export function getAvatarUrl(
  avatarUrl: string | null | undefined,
  email: string | null | undefined
): string | undefined {
  // Priority 1: Custom uploaded avatar
  if (avatarUrl) {
    return avatarUrl;
  }

  // Priority 2: Gravatar from email
  if (email) {
    return getGravatarUrl(email);
  }

  // Priority 3: Return undefined - component will show initials
  return undefined;
}
