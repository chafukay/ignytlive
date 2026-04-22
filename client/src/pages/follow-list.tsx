import { GuestGate } from "@/components/guest-gate";
import Layout from "@/components/layout";
import UserAvatar from "@/components/user-avatar";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useRoute, Link, useLocation } from "wouter";
import { ArrowLeft, Users, UserCheck, Search } from "lucide-react";
import { useState, useMemo } from "react";
import type { User } from "@shared/schema";

export default function FollowList() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/follows/:userId/:tab");
  const userId = params?.userId || user?.id || "";
  const initialTab = params?.tab === "followers" ? "followers" : "following";
  const [tab, setTab] = useState<"followers" | "following">(initialTab);
  const [search, setSearch] = useState("");

  const { data: profileUser } = useQuery({
    queryKey: ["user", userId],
    queryFn: () => api.getUser(userId),
    enabled: !!userId,
  });

  const { data: followers, isLoading: followersLoading } = useQuery({
    queryKey: ["followers", userId],
    queryFn: () => api.getFollowers(userId),
    enabled: !!userId,
  });

  const { data: following, isLoading: followingLoading } = useQuery({
    queryKey: ["following", userId],
    queryFn: () => api.getFollowing(userId),
    enabled: !!userId,
  });

  const list = tab === "followers" ? followers : following;
  const loading = tab === "followers" ? followersLoading : followingLoading;

  const filtered = useMemo(() => {
    if (!list) return [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((u: User) => (u.username ?? "").toLowerCase().includes(q));
  }, [list, search]);

  const switchTab = (next: "followers" | "following") => {
    setTab(next);
    setLocation(`/follows/${userId}/${next}`);
  };

  return (
    <GuestGate>
      <Layout>
        <div className="max-w-2xl mx-auto pb-6">
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
            <div className="flex items-center gap-3 p-4">
              <button
                onClick={() => window.history.length > 1 ? window.history.back() : setLocation("/profile")}
                className="p-2 -ml-2 rounded-full hover:bg-white/10"
                data-testid="button-back"
              >
                <ArrowLeft className="w-5 h-5 text-foreground" />
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="text-base font-semibold text-foreground truncate" data-testid="text-follow-username">
                  @{profileUser?.username || "..."}
                </h1>
              </div>
            </div>

            <div className="flex border-b border-border">
              <button
                onClick={() => switchTab("followers")}
                className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
                  tab === "followers" ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid="tab-followers"
              >
                Followers {profileUser ? `· ${profileUser.followersCount}` : ""}
                {tab === "followers" && (
                  <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-full" />
                )}
              </button>
              <button
                onClick={() => switchTab("following")}
                className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
                  tab === "following" ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid="tab-following"
              >
                Following {profileUser ? `· ${profileUser.followingCount}` : ""}
                {tab === "following" && (
                  <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            </div>

            <div className="p-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${tab}...`}
                  className="w-full bg-muted rounded-full py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  data-testid="input-search-follow"
                />
              </div>
            </div>
          </div>

          <div className="p-3">
            {loading ? (
              <div className="space-y-2">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl animate-pulse">
                    <div className="w-12 h-12 rounded-full bg-muted shrink-0" />
                    <div className="flex-1">
                      <div className="h-4 w-32 bg-muted rounded mb-2" />
                      <div className="h-3 w-20 bg-muted rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  {tab === "followers" ? (
                    <Users className="w-8 h-8 text-muted-foreground/50" />
                  ) : (
                    <UserCheck className="w-8 h-8 text-muted-foreground/50" />
                  )}
                </div>
                <p className="text-foreground font-medium">
                  {search.trim() ? "No matches" : `No ${tab} yet`}
                </p>
                <p className="text-muted-foreground text-sm mt-1">
                  {search.trim()
                    ? "Try a different name"
                    : tab === "followers"
                      ? "When people follow this account, they'll show up here."
                      : "Accounts followed will appear here."}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {filtered.map((u: User) => (
                  <Link
                    key={u.id}
                    href={u.id === user?.id ? "/profile" : `/user/${u.id}`}
                    className="block"
                  >
                    <div
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer"
                      data-testid={`row-user-${u.id}`}
                    >
                      <UserAvatar
                        userId={u.id}
                        username={u.username}
                        avatar={u.avatar}
                        isLive={u.isLive}
                        isOnline={u.isLive}
                        size="md"
                        showStatus={true}
                        linkToProfile={false}
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground text-sm truncate" data-testid={`text-username-${u.id}`}>
                          {u.username}
                        </h3>
                        <p className="text-muted-foreground text-xs truncate">
                          Level {u.level} · {u.followersCount.toLocaleString()} followers
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </Layout>
    </GuestGate>
  );
}
