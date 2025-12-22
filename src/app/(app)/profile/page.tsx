import { getProfile, signOut } from "@/lib/supabase/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, User, Settings, Calendar, Sparkles } from "lucide-react";
import { ProfileForm } from "@/components/profile/profile-form";
import { format } from "date-fns";

export default async function ProfilePage() {
  const profile = await getProfile();

  const initials = profile?.display_name
    ? profile.display_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <div className="space-y-8 lg:space-y-10">
      {/* Header */}
      <div>
        <h1 className="font-[family-name:var(--font-outfit)] text-2xl sm:text-3xl font-bold">
          Profile
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Desktop: Two-column layout / Mobile: Stacked */}
      <div className="grid gap-8 lg:grid-cols-[320px,1fr] xl:grid-cols-[380px,1fr]">
        {/* Sidebar - Profile Card */}
        <div className="space-y-6">
          {/* Profile Overview Card */}
          <div className="bg-card border border-border/50 rounded-2xl p-6 lg:p-8">
            <div className="flex flex-col items-center text-center">
              {/* Avatar with gradient background */}
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center p-1">
                  <Avatar className="h-full w-full rounded-xl">
                    <AvatarImage src={profile?.avatar_url || undefined} className="rounded-xl" />
                    <AvatarFallback className="rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 text-2xl font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              </div>

              {/* Name */}
              <h2 className="font-[family-name:var(--font-outfit)] text-xl font-semibold mb-1">
                {profile?.display_name || "User"}
              </h2>

              {/* Member since */}
              <p className="text-sm text-muted-foreground mb-4">
                Member since{" "}
                {profile?.created_at
                  ? format(new Date(profile.created_at), "MMM yyyy")
                  : "Unknown"}
              </p>

              {/* Quick stats */}
              <div className="w-full pt-4 border-t border-border/50">
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-primary" />
                  {profile?.birthday ? (
                    <span>Birthday: {format(new Date(profile.birthday), "MMMM d")}</span>
                  ) : (
                    <span className="text-muted-foreground">No birthday set</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content - Settings Form */}
        <div className="space-y-6">
          {/* Section header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400/20 to-indigo-500/10 flex items-center justify-center">
              <Settings className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className="font-[family-name:var(--font-outfit)] text-lg font-semibold">
                Account Settings
              </h2>
              <p className="text-xs text-muted-foreground">
                Update your personal information
              </p>
            </div>
          </div>

          {/* Settings Card */}
          <div className="bg-card border border-border/50 rounded-2xl p-6 lg:p-8">
            <ProfileForm profile={profile} />
          </div>

          {/* Sign Out Section */}
          <div className="pt-6 border-t border-border/50">
            <form action={signOut}>
              <Button
                variant="outline"
                className="rounded-xl hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-colors"
                type="submit"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
