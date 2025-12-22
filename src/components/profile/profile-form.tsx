"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/lib/actions/profile";
import { toast } from "sonner";
import { Loader2, User, Cake, Check } from "lucide-react";
import type { Profile } from "@/lib/supabase/types";

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    const result = await updateProfile(formData);

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Profile updated");
    }
    setIsLoading(false);
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* Display Name Field */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400/20 to-purple-500/10 flex items-center justify-center">
            <User className="w-4 h-4 text-violet-500" />
          </div>
          <Label htmlFor="displayName" className="text-sm font-medium">
            Display Name
          </Label>
        </div>
        <Input
          id="displayName"
          name="displayName"
          defaultValue={profile?.display_name || ""}
          placeholder="Your display name"
          disabled={isLoading}
          className="h-11 rounded-xl bg-muted/50 border-border/50 focus:bg-background transition-colors"
        />
        <p className="text-xs text-muted-foreground pl-1">
          This is how your friends will see you
        </p>
      </div>

      {/* Birthday Field */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400/20 to-orange-500/10 flex items-center justify-center">
            <Cake className="w-4 h-4 text-amber-500" />
          </div>
          <Label htmlFor="birthday" className="text-sm font-medium">
            Birthday
          </Label>
        </div>
        <Input
          id="birthday"
          name="birthday"
          type="date"
          defaultValue={profile?.birthday || ""}
          disabled={isLoading}
          className="h-11 rounded-xl bg-muted/50 border-border/50 focus:bg-background transition-colors"
        />
        <p className="text-xs text-muted-foreground pl-1">
          Your birthday will be shown to your friends so they can plan gifts
        </p>
      </div>

      {/* Submit Button */}
      <div className="pt-2">
        <Button
          type="submit"
          disabled={isLoading}
          className="rounded-xl shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 transition-all hover:-translate-y-0.5"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
