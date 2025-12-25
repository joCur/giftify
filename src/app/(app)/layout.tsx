import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/lib/supabase/auth";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { TopHeader } from "@/components/navigation/top-header";
import { Sidebar } from "@/components/navigation/sidebar";

// Force dynamic rendering for all authenticated pages
// This ensures user session is fetched fresh on every request, preventing
// stale cached data in production builds (dev mode is always dynamic)
export const dynamic = 'force-dynamic';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getProfile();

  return (
    <>
      {/* Static background blobs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-background">
        <div
          className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-20"
          style={{
            background: "linear-gradient(135deg, oklch(0.8 0.15 25), oklch(0.85 0.12 50))",
          }}
        />
        <div
          className="absolute bottom-0 -left-20 w-[400px] h-[400px] rounded-full opacity-15"
          style={{
            background: "linear-gradient(135deg, oklch(0.75 0.12 60), oklch(0.8 0.1 80))",
          }}
        />
      </div>

      <div className="min-h-screen flex relative">
        {/* Desktop Sidebar */}
        <Sidebar profile={profile} userId={user.id} />

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-h-screen pb-20 lg:pb-0">
          {/* Mobile/Tablet Header */}
          <TopHeader profile={profile} userId={user.id} />

          {/* Page content */}
          <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
        </div>

        {/* Mobile Bottom Nav */}
        <BottomNav />
      </div>
    </>
  );
}
