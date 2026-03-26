import Layout from "@/components/layout";
import { GuestGate } from "@/components/guest-gate";
import { ChevronLeft, ChevronRight, UserPlus, Gift, Phone, Bell, TrendingUp } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Link } from "wouter";
import { useEffect, useMemo } from "react";
import type { Notification } from "@shared/schema";

function getNotificationIcon(type: string) {
  switch (type) {
    case "follow":
      return <UserPlus className="w-5 h-5 text-blue-400" />;
    case "gift":
      return <Gift className="w-5 h-5 text-pink-400" />;
    case "call_request":
      return <Phone className="w-5 h-5 text-green-400" />;
    case "level_up":
      return <TrendingUp className="w-5 h-5 text-yellow-400" />;
    case "system":
    default:
      return <Bell className="w-5 h-5 text-white/60" />;
  }
}

function getIconBgColor(type: string) {
  switch (type) {
    case "follow":
      return "bg-blue-500/20";
    case "gift":
      return "bg-pink-500/20";
    case "call_request":
      return "bg-green-500/20";
    case "level_up":
      return "bg-yellow-500/20";
    case "system":
    default:
      return "bg-white/10";
  }
}

function groupByTime(notifications: Notification[]): Record<string, Notification[]> {
  const groups: Record<string, Notification[]> = {};
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  const weekStart = new Date(todayStart.getTime() - 7 * 86400000);

  for (const notif of notifications) {
    const d = new Date(notif.createdAt);
    let group: string;
    if (d >= todayStart) {
      group = "Today";
    } else if (d >= yesterdayStart) {
      group = "Yesterday";
    } else if (d >= weekStart) {
      group = "This Week";
    } else {
      group = "Earlier";
    }
    if (!groups[group]) groups[group] = [];
    groups[group].push(notif);
  }
  return groups;
}

function formatTimeAgo(date: Date | string) {
  const now = new Date();
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Notifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => api.getNotifications(user!.id),
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (user?.id) {
      api.markAllNotificationsRead(user.id).then(() => {
        queryClient.invalidateQueries({ queryKey: ["unreadNotificationCount", user.id] });
        queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
      });
    }
  }, [user?.id, queryClient]);

  const grouped = useMemo(() => {
    if (!notifications) return {};
    return groupByTime(notifications);
  }, [notifications]);

  const groupOrder = ["Today", "Yesterday", "This Week", "Earlier"];

  const mockProfileViewers = [
    { id: "1", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=viewer1" },
    { id: "2", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=viewer2" },
    { id: "3", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=viewer3" },
    { id: "4", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=viewer4" },
  ];

  return (
    <GuestGate>
      <Layout>
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <Link href="/">
                <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10" data-testid="button-back">
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
              </Link>
              <h1 className="text-xl font-bold text-white" data-testid="text-page-title">Notifications</h1>
            </div>
          </div>

          <Link href="/profile-visitors">
            <div className="p-4 border-b border-white/10 cursor-pointer hover:bg-white/5 transition-colors" data-testid="link-profile-viewers">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Viewers of your profile</h3>
                  <p className="text-white/50 text-sm">See who visits your profile</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {mockProfileViewers.map((viewer) => (
                      <img
                        key={viewer.id}
                        src={viewer.avatar}
                        className="w-8 h-8 rounded-full border-2 border-background"
                        alt="Viewer"
                      />
                    ))}
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/30" />
                </div>
              </div>
            </div>
          </Link>

          <div className="p-4">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-white/10" />
                    <div className="flex-1">
                      <div className="h-4 w-40 bg-white/10 rounded mb-2" />
                      <div className="h-3 w-24 bg-white/10 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications && notifications.length > 0 ? (
              <div className="space-y-6">
                {groupOrder.map((groupName) => {
                  const items = grouped[groupName];
                  if (!items || items.length === 0) return null;
                  return (
                    <div key={groupName}>
                      <h3 className="text-white/50 text-sm font-semibold uppercase tracking-wider mb-3" data-testid={`text-group-${groupName.toLowerCase().replace(/\s/g, "-")}`}>
                        {groupName}
                      </h3>
                      <div className="space-y-1">
                        {items.map((notif) => (
                          <div
                            key={notif.id}
                            className={`flex items-start gap-3 p-3 rounded-2xl transition-colors hover:bg-white/5 ${!notif.isRead ? "bg-white/[0.03]" : ""}`}
                            data-testid={`notification-${notif.id}`}
                          >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getIconBgColor(notif.type)}`}>
                              {getNotificationIcon(notif.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-medium" data-testid={`text-notif-title-${notif.id}`}>{notif.title}</p>
                              <p className="text-white/50 text-sm truncate" data-testid={`text-notif-message-${notif.id}`}>{notif.message}</p>
                              <span className="text-white/30 text-xs">
                                {formatTimeAgo(notif.createdAt)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center" data-testid="text-empty-notifications">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <Bell className="w-8 h-8 text-white/20" />
                </div>
                <p className="text-white/70 font-medium">No notifications yet</p>
                <p className="text-white/40 text-sm mt-1 max-w-xs">When someone follows you, sends a gift, or interacts with your content, you'll see it here.</p>
              </div>
            )}
          </div>
        </div>
      </Layout>
    </GuestGate>
  );
}
