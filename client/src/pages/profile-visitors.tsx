import Layout from "@/components/layout";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api, ProfileVisitor } from "@/lib/api";
import { ChevronRight, Eye, User } from "lucide-react";
import UserAvatar from "@/components/user-avatar";

export default function ProfileVisitors() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: visitors = [], isLoading } = useQuery<ProfileVisitor[]>({
    queryKey: ['profile-visitors', user?.id],
    queryFn: () => api.getProfileVisitors(user!.id),
    enabled: !!user,
  });

  if (!user) return null;

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background p-4 pb-24 max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setLocation("/profile")} className="text-foreground" data-testid="button-back">
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Profile Visitors</h1>
        </div>

        <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-2xl p-4 mb-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
            <Eye className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <p className="text-foreground font-bold text-lg">{(user.profileViews || 0).toLocaleString()}</p>
            <p className="text-muted-foreground text-xs">Total profile views</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                <div className="w-12 h-12 rounded-full bg-muted" />
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-24 mb-2" />
                  <div className="h-3 bg-muted rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : visitors.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Eye className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No visitors yet</p>
            <p className="text-muted-foreground text-xs mt-1">When someone views your profile, they'll appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {visitors.map((visit) => (
              <div
                key={visit.id}
                onClick={() => visit.visitor && setLocation(`/profile/${visit.visitorId}`)}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                data-testid={`visitor-${visit.visitorId}`}
              >
                {visit.visitor ? (
                  <UserAvatar
                    userId={visit.visitor.id}
                    username={visit.visitor.username}
                    avatar={visit.visitor.avatar}
                    size="md"
                    linkToProfile={false}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <User className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-foreground font-medium text-sm truncate">
                    {visit.visitor?.username || "Unknown User"}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Visited {formatTime(visit.visitedAt)}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
