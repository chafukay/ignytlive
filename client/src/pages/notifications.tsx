import Layout from "@/components/layout";
import { GuestGate } from "@/components/guest-gate";
import { ChevronLeft, ChevronRight, UserPlus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Link } from "wouter";

export default function Notifications() {
  const { user } = useAuth();

  const { data: followers, isLoading } = useQuery({
    queryKey: ['followers', user?.id],
    queryFn: () => api.getFollowers(user!.id),
    enabled: !!user?.id,
  });

  const { data: allUsers } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => api.getUser(user?.id || ''),
    enabled: !!user?.id,
  });

  const formatTime = (date: Date | string) => {
    const now = new Date();
    const notifDate = typeof date === 'string' ? new Date(date) : date;
    const diff = now.getTime() - notifDate.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (isNaN(diff)) return '';
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return dayNames[notifDate.getDay()];
    }
    return notifDate.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
  };

  const mockProfileViewers = [
    { id: '1', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=viewer1' },
    { id: '2', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=viewer2' },
    { id: '3', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=viewer3' },
    { id: '4', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=viewer4' },
  ];

  return (
    <GuestGate>
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Link href="/">
              <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10">
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
            </Link>
            <h1 className="text-xl font-bold text-white">Notifications</h1>
          </div>
          <button className="flex items-center gap-1 bg-white/5 px-3 py-1.5 rounded-full text-sm text-white/70">
            All
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 border-b border-white/10">
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

        <div className="p-4">
          <h3 className="text-white font-medium mb-4">New</h3>
          
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 animate-pulse">
                  <div className="w-12 h-12 rounded-full bg-white/10" />
                  <div className="flex-1">
                    <div className="h-4 w-32 bg-white/10 rounded mb-2" />
                    <div className="h-3 w-24 bg-white/10 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : followers && followers.length > 0 ? (
            <div className="space-y-1">
              {followers.map((follower) => (
                <div 
                  key={follower.id}
                  className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 transition-colors"
                  data-testid={`notification-${follower.id}`}
                >
                  <div className="relative">
                    <img 
                      src={follower.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${follower.username}`}
                      className="w-12 h-12 rounded-full object-cover"
                      alt={follower.username}
                    />
                    {follower.level && (
                      <span className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-[10px] font-bold px-1.5 rounded-full min-w-[20px] text-center">
                        {follower.level}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{follower.username}</span>
                      <span className="text-white/50">Followed you</span>
                    </div>
                    <span className="text-white/30 text-sm">
                      {formatTime(follower.createdAt || new Date())}
                    </span>
                  </div>
                  <button className="bg-blue-500/20 text-blue-400 px-4 py-2 rounded-full flex items-center gap-1 hover:bg-blue-500/30 transition-colors">
                    <UserPlus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-white/50">
              <p>No notifications yet</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
    </GuestGate>
  );
}
