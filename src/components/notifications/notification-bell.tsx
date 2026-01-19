"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotificationListV2 } from "./notification-list-v2";
import { useNotificationsV2 } from "@/hooks/use-notifications-v2";
import { useArchivedNotificationsV2 } from "@/hooks/use-archived-notifications-v2";

export function NotificationBell() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"inbox" | "archived">("inbox");
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    archiveNotification,
    archiveAllRead,
    refetch: refetchInbox,
  } = useNotificationsV2();

  const {
    notifications: archivedNotifications,
    isLoading: isArchivedLoading,
    unarchiveNotification,
    refetch: refetchArchived,
  } = useArchivedNotificationsV2();

  // Prevent hydration mismatch by only rendering Sheet after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as "inbox" | "archived");
    // Refetch notifications when switching tabs
    if (tab === "archived") {
      refetchArchived();
    } else {
      refetchInbox();
    }
  };

  // Wrapper functions that discard return values to match expected void type
  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id);
  };

  const handleMarkAsUnread = async (id: string) => {
    await markAsUnread(id);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleArchive = async (id: string) => {
    await archiveNotification(id);
  };

  const handleArchiveAllRead = async () => {
    await archiveAllRead();
  };

  const handleUnarchive = async (id: string) => {
    await unarchiveNotification(id);
  };

  // Render a placeholder button during SSR to prevent hydration mismatch
  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="relative h-9 w-9">
        <Bell className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 flex items-center justify-center text-[10px] font-bold"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-6 pb-3">
          <SheetTitle>Notifications</SheetTitle>
          <SheetDescription>
            Stay updated with your friends&apos; activity
          </SheetDescription>
        </SheetHeader>

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="flex-1 flex flex-col min-h-0"
        >
          <TabsList className="mx-6 grid w-[calc(100%-3rem)] grid-cols-2">
            <TabsTrigger value="inbox" className="gap-2">
              Inbox
              {unreadCount > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
          </TabsList>

          <TabsContent value="inbox" className="flex-1 mt-3 data-[state=inactive]:hidden">
            <NotificationListV2
              notifications={notifications}
              isLoading={isLoading}
              view="inbox"
              onMarkAsRead={handleMarkAsRead}
              onMarkAsUnread={handleMarkAsUnread}
              onMarkAllAsRead={handleMarkAllAsRead}
              onArchive={handleArchive}
              onArchiveAllRead={handleArchiveAllRead}
            />
          </TabsContent>

          <TabsContent value="archived" className="flex-1 mt-3 data-[state=inactive]:hidden">
            <NotificationListV2
              notifications={archivedNotifications}
              isLoading={isArchivedLoading}
              view="archived"
              onMarkAsRead={handleMarkAsRead}
              onUnarchive={handleUnarchive}
            />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
