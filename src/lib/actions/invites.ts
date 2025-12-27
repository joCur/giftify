"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "./helpers";
import { revalidatePath } from "next/cache";

// Generate a readable 8-character code (no ambiguous chars like 0/O, 1/I)
function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join("");
}

export async function generateInviteCode() {
  try {
    const { supabase, user } = await requireAuth();

    // Try up to 5 times to generate a unique code
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateCode();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const { data, error } = await supabase
        .from("invite_codes")
        .insert({
          code,
          created_by: user.id,
          expires_at: expiresAt.toISOString(),
        })
        .select("code, expires_at")
        .single();

      if (!error && data) {
        revalidatePath("/friends");
        return { success: true, code: data.code, expiresAt: data.expires_at };
      }

      // If unique constraint violation, try again
      if (error?.code === "23505") continue;

      return { error: error?.message || "Failed to generate invite code" };
    }

    return { error: "Failed to generate unique code, please try again" };
  } catch {
    return { error: "Not authenticated" };
  }
}

export async function validateInviteCode(code: string) {
  // Validate format (8 alphanumeric chars, uppercase)
  if (!code || typeof code !== "string" || !/^[A-Z0-9]{8}$/.test(code)) {
    return { valid: false, error: "Invalid invite code format" };
  }

  const supabase = await createClient();

  // Use the database function to validate (bypasses RLS)
  const { data, error } = await supabase.rpc("validate_invite_code", {
    invite_code: code,
  });

  if (error) {
    return { valid: false, error: "Failed to validate invite code" };
  }

  const result = data?.[0];
  if (!result?.valid) {
    return { valid: false, error: result?.error_message || "Invalid invite code" };
  }

  return {
    valid: true,
    inviterId: result.inviter_id,
    inviterName: result.inviter_name || "A friend",
  };
}

export interface InviteCode {
  code: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  used_by: string | null;
  invitee: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export async function getMyInvites(): Promise<InviteCode[]> {
  try {
    const { supabase, user } = await requireAuth();

    // First get all invite codes
    const { data: invites, error } = await supabase
      .from("invite_codes")
      .select("code, created_at, expires_at, used_at, used_by")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching invites:", error);
      return [];
    }

    if (!invites) return [];

    // Get invitee profiles for used invites
    const usedByIds = invites
      .filter((i) => i.used_by)
      .map((i) => i.used_by as string);

    let profiles: Record<string, { id: string; display_name: string | null; avatar_url: string | null }> = {};

    if (usedByIds.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", usedByIds);

      if (profileData) {
        profiles = Object.fromEntries(profileData.map((p) => [p.id, p]));
      }
    }

    // Map invites with invitee data
    return invites.map((invite) => ({
      code: invite.code,
      created_at: invite.created_at,
      expires_at: invite.expires_at,
      used_at: invite.used_at,
      used_by: invite.used_by,
      invitee: invite.used_by ? profiles[invite.used_by] || null : null,
    }));
  } catch {
    return [];
  }
}

export async function consumeInviteAndBefriend(code: string, newUserId: string) {
  const supabase = await createClient();

  const { error } = await supabase.rpc("consume_invite_and_befriend", {
    invite_code: code,
    new_user_id: newUserId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/friends");
  return { success: true };
}
