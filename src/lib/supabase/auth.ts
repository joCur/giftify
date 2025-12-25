"use server";

import { createClient } from "./server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function signUp(formData: FormData, inviteCode: string) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const displayName = formData.get("displayName") as string;

  const supabase = await createClient();

  // Call edge function for secure user creation
  // The edge function uses service role key to create users,
  // keeping admin credentials out of the app
  const { data, error } = await supabase.functions.invoke("create-invited-user", {
    body: {
      email,
      password,
      displayName,
      inviteCode,
    },
  });

  if (error || data?.error) {
    console.error("Signup error:", error || data?.error);
    return { error: data?.error || error?.message || "Failed to create account" };
  }

  // Account created successfully - redirect to login
  // User needs to sign in since we used admin API (no auto-session)
  revalidatePath("/", "layout");
  redirect("/login?registered=true");
}

export async function signIn(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // DEBUG: Log auth state
  console.log('[getUser Debug]', {
    hasUser: !!user,
    userId: user?.id,
    hasError: !!error,
    error: error?.message,
  });

  return user;
}

export async function getProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Include email from auth.users for Gravatar support
  return profile ? { ...profile, email: user.email } : null;
}
