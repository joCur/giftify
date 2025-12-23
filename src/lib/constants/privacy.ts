import { Lock, Users, UserCheck } from "lucide-react";
import type { WishlistPrivacy } from "@/lib/supabase/types";

export const PRIVACY_OPTIONS: {
  value: WishlistPrivacy;
  label: string;
  description: string;
  icon: typeof Lock;
}[] = [
  {
    value: "friends",
    label: "All Friends",
    description: "Visible to all your friends",
    icon: Users,
  },
  {
    value: "selected_friends",
    label: "Selected Friends",
    description: "Choose specific friends who can see",
    icon: UserCheck,
  },
  {
    value: "private",
    label: "Private",
    description: "Only visible to you",
    icon: Lock,
  },
];

export const PRIVACY_CONFIG: Record<
  WishlistPrivacy,
  { label: string; icon: typeof Lock }
> = {
  private: { label: "Private", icon: Lock },
  friends: { label: "All Friends", icon: Users },
  selected_friends: { label: "Selected Friends", icon: UserCheck },
};
