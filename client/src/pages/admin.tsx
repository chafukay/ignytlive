import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { 
  Shield, Users, Crown, Coins, Diamond, TrendingUp, 
  Search, ArrowLeft, Edit, AlertTriangle, Eye, UserCheck,
  Calendar, BarChart3, Award, Flame, X
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

const API_BASE = "";

type AdminTab = 'dashboard' | 'users' | 'reports';

interface AdminStats {
  totalUsers: number;
  newUsersToday: number;
  newUsersWeek: number;
  vipUsers: number;
  verifiedUsers: number;
  totalCoins: number;
  totalDiamonds: number;
  activeStreams: number;
  topStreamers: User[];
  topGifters: User[];
  mostFollowed: User[];
}

export default function Admin() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState("");
  const [editingUser, setEditingUser] = useState<any | null>(null);

  const isAdmin = user?.isAdmin === true;

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/admin/stats?adminId=${user?.id}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: isAdmin && !!user?.id,
    refetchInterval: 30000,
  });

  const { data: allUsers = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/admin/users?adminId=${user?.id}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: isAdmin && activeTab === 'users' && !!user?.id,
  });

  const { data: reports = [] } = useQuery<any[]>({
    queryKey: ['admin', 'reports'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/admin/reports?adminId=${user?.id}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: isAdmin && activeTab === 'reports' && !!user?.id,
  });

  const updateUserMutation = useMutation({
    mutationFn: async (data: { userId: string; updates: any }) => {
      const res = await fetch(`${API_BASE}/api/admin/update-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId: user?.id, userId: data.userId, updates: data.updates }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      toast({ title: "User updated successfully" });
      setEditingUser(null);
    },
    onError: () => {
      toast({ title: "Failed to update user", variant: "destructive" });
    },
  });

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2" data-testid="text-access-denied">Access Denied</h1>
          <p className="text-zinc-400 mb-6">You don't have admin privileges</p>
          <button onClick={() => setLocation("/")} className="bg-orange-500 text-white px-6 py-2 rounded-lg" data-testid="button-go-home">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const filteredUsers = allUsers.filter(u =>
    u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tabs = [
    { id: 'dashboard' as AdminTab, label: 'Dashboard', icon: BarChart3 },
    { id: 'users' as AdminTab, label: 'Users', icon: Users },
    { id: 'reports' as AdminTab, label: 'Reports', icon: AlertTriangle },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      <aside className="w-64 bg-zinc-900 border-r border-zinc-800 p-4 flex flex-col fixed h-full">
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg">Admin Panel</h1>
            <p className="text-zinc-500 text-xs">Ignyt Live</p>
          </div>
        </div>

        <nav className="space-y-1 flex-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-orange-500/10 text-orange-400'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
              {tab.id === 'reports' && reports.length > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{reports.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="border-t border-zinc-800 pt-4 mt-4">
          <button onClick={() => setLocation("/")} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 w-full" data-testid="button-back-to-app">
            <ArrowLeft className="w-5 h-5" />
            Back to App
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-64 p-8">
        {activeTab === 'dashboard' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-2xl font-bold text-white mb-6" data-testid="text-dashboard-title">Dashboard</h2>

            {statsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => <div key={i} className="h-28 bg-zinc-900 rounded-xl animate-pulse" />)}
              </div>
            ) : stats && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <StatCard icon={Users} label="Total Users" value={stats.totalUsers} color="blue" />
                  <StatCard icon={TrendingUp} label="New Today" value={stats.newUsersToday} color="green" />
                  <StatCard icon={Calendar} label="New This Week" value={stats.newUsersWeek} color="cyan" />
                  <StatCard icon={Flame} label="Live Streams" value={stats.activeStreams} color="red" />
                  <StatCard icon={Crown} label="VIP Users" value={stats.vipUsers} color="yellow" />
                  <StatCard icon={UserCheck} label="Verified" value={stats.verifiedUsers} color="purple" />
                  <StatCard icon={Coins} label="Total Coins" value={stats.totalCoins.toLocaleString()} color="amber" />
                  <StatCard icon={Diamond} label="Total Diamonds" value={stats.totalDiamonds.toLocaleString()} color="pink" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <LeaderboardCard title="Top Streamers" subtitle="By gifts received" users={stats.topStreamers} valueKey="totalGiftsReceived" valueLabel="gifts" />
                  <LeaderboardCard title="Top Gifters" subtitle="By coins spent" users={stats.topGifters} valueKey="totalSpent" valueLabel="spent" />
                  <LeaderboardCard title="Most Followed" subtitle="By followers" users={stats.mostFollowed} valueKey="followersCount" valueLabel="followers" />
                </div>
              </>
            )}
          </motion.div>
        )}

        {activeTab === 'users' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white" data-testid="text-users-title">User Management</h2>
              <span className="text-zinc-500 text-sm">{filteredUsers.length} users</span>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by username, email, or display name..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-3 pl-12 pr-4 text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500/50"
                data-testid="input-search-users"
              />
            </div>

            {usersLoading ? (
              <div className="text-center py-8 text-zinc-500">Loading users...</div>
            ) : (
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-left">
                      <th className="px-4 py-3 text-zinc-400 font-medium">User</th>
                      <th className="px-4 py-3 text-zinc-400 font-medium">Level</th>
                      <th className="px-4 py-3 text-zinc-400 font-medium">VIP</th>
                      <th className="px-4 py-3 text-zinc-400 font-medium">Coins</th>
                      <th className="px-4 py-3 text-zinc-400 font-medium">Diamonds</th>
                      <th className="px-4 py-3 text-zinc-400 font-medium">Followers</th>
                      <th className="px-4 py-3 text-zinc-400 font-medium">Joined</th>
                      <th className="px-4 py-3 text-zinc-400 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30" data-testid={`user-row-${u.id}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`} alt="" className="w-8 h-8 rounded-full" />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-white font-medium">{u.username}</span>
                                {u.isVerified && <UserCheck className="w-3.5 h-3.5 text-blue-400" />}
                                {u.isAdmin && <Shield className="w-3.5 h-3.5 text-orange-400" />}
                              </div>
                              <span className="text-zinc-500 text-xs">{u.email || 'No email'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-zinc-300">{u.level}</td>
                        <td className="px-4 py-3">
                          {u.vipTier && u.vipTier > 0 ? (
                            <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-xs">Tier {u.vipTier}</span>
                          ) : (
                            <span className="text-zinc-600 text-xs">None</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-amber-400">{(u.coins || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-pink-400">{(u.diamonds || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-zinc-300">{(u.followersCount || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-zinc-500 text-xs">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setEditingUser({ ...u })}
                            className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
                            data-testid={`edit-user-${u.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'reports' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-2xl font-bold text-white mb-6" data-testid="text-reports-title">User Reports</h2>
            {reports.length === 0 ? (
              <div className="text-center py-16">
                <AlertTriangle className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                <h3 className="text-zinc-400 font-medium mb-1">No Reports</h3>
                <p className="text-zinc-600 text-sm">No user reports to review</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report: any) => (
                  <div key={report.id} className="bg-zinc-900 rounded-xl p-4 border border-zinc-800" data-testid={`report-${report.id}`}>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-medium">{report.reportedUser?.username}</span>
                          <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-xs">{report.reason}</span>
                        </div>
                        {report.description && <p className="text-zinc-400 text-sm mb-2">{report.description}</p>}
                        <p className="text-zinc-600 text-xs">Reported by: {report.reporterUserId} • {new Date(report.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </main>

      {editingUser && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-zinc-900 rounded-2xl p-6 w-full max-w-md border border-zinc-800">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Edit User</h3>
              <button onClick={() => setEditingUser(null)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-zinc-400 text-sm block mb-1">Username</label>
                <p className="text-white font-medium">{editingUser.username}</p>
              </div>
              <div>
                <label className="text-zinc-400 text-sm block mb-1">VIP Tier</label>
                <select value={editingUser.vipTier || 0} onChange={(e) => setEditingUser({ ...editingUser, vipTier: parseInt(e.target.value) })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-2 px-3 text-white" data-testid="select-vip">
                  <option value="0">None</option>
                  <option value="1">VIP 1</option>
                  <option value="2">VIP 2</option>
                  <option value="3">VIP 3</option>
                  <option value="4">VIP 4</option>
                  <option value="5">VIP 5</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-zinc-400 text-sm block mb-1">Coins</label>
                  <input type="number" value={editingUser.coins || 0} onChange={(e) => setEditingUser({ ...editingUser, coins: parseInt(e.target.value) || 0 })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-2 px-3 text-white" data-testid="input-coins" />
                </div>
                <div>
                  <label className="text-zinc-400 text-sm block mb-1">Diamonds</label>
                  <input type="number" value={editingUser.diamonds || 0} onChange={(e) => setEditingUser({ ...editingUser, diamonds: parseInt(e.target.value) || 0 })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-2 px-3 text-white" data-testid="input-diamonds" />
                </div>
              </div>
              <div>
                <label className="text-zinc-400 text-sm block mb-1">Level</label>
                <input type="number" value={editingUser.level || 1} onChange={(e) => setEditingUser({ ...editingUser, level: parseInt(e.target.value) || 1 })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-2 px-3 text-white" data-testid="input-level" />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={editingUser.isVerified || false} onChange={(e) => setEditingUser({ ...editingUser, isVerified: e.target.checked })} className="rounded" data-testid="checkbox-verified" />
                <label className="text-zinc-300 text-sm">Verified User</label>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={editingUser.isAdmin || false} onChange={(e) => setEditingUser({ ...editingUser, isAdmin: e.target.checked })} className="rounded" data-testid="checkbox-admin" />
                <label className="text-zinc-300 text-sm">Admin Access</label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditingUser(null)} className="flex-1 py-2.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700" data-testid="button-cancel">Cancel</button>
              <button
                onClick={() => updateUserMutation.mutate({
                  userId: editingUser.id,
                  updates: {
                    vipTier: editingUser.vipTier,
                    coins: editingUser.coins,
                    diamonds: editingUser.diamonds,
                    level: editingUser.level,
                    isVerified: editingUser.isVerified,
                    isAdmin: editingUser.isAdmin,
                  }
                })}
                disabled={updateUserMutation.isPending}
                className="flex-1 py-2.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
                data-testid="button-save"
              >
                {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'from-blue-500/10 to-blue-600/10 border-blue-500/20 text-blue-400',
    green: 'from-green-500/10 to-green-600/10 border-green-500/20 text-green-400',
    cyan: 'from-cyan-500/10 to-cyan-600/10 border-cyan-500/20 text-cyan-400',
    red: 'from-red-500/10 to-red-600/10 border-red-500/20 text-red-400',
    yellow: 'from-yellow-500/10 to-yellow-600/10 border-yellow-500/20 text-yellow-400',
    purple: 'from-purple-500/10 to-purple-600/10 border-purple-500/20 text-purple-400',
    amber: 'from-amber-500/10 to-amber-600/10 border-amber-500/20 text-amber-400',
    pink: 'from-pink-500/10 to-pink-600/10 border-pink-500/20 text-pink-400',
  };
  const cls = colorMap[color] || colorMap.blue;
  return (
    <div className={`bg-gradient-to-br ${cls} rounded-xl p-4 border`} data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <Icon className="w-6 h-6 mb-2" />
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-zinc-400 text-sm">{label}</p>
    </div>
  );
}

function LeaderboardCard({ title, subtitle, users, valueKey, valueLabel }: { title: string; subtitle: string; users: any[]; valueKey: string; valueLabel: string }) {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4" data-testid={`leaderboard-${title.toLowerCase().replace(/\s/g, '-')}`}>
      <h3 className="text-white font-bold mb-1">{title}</h3>
      <p className="text-zinc-500 text-xs mb-4">{subtitle}</p>
      <div className="space-y-3">
        {users.map((u, i) => (
          <div key={u.id} className="flex items-center gap-3">
            <span className={`w-6 text-center text-sm font-bold ${i < 3 ? 'text-orange-400' : 'text-zinc-600'}`}>{i + 1}</span>
            <img src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`} alt="" className="w-7 h-7 rounded-full" />
            <span className="text-white text-sm flex-1 truncate">{u.username}</span>
            <span className="text-zinc-400 text-xs">{(u[valueKey] || 0).toLocaleString()} {valueLabel}</span>
          </div>
        ))}
        {users.length === 0 && <p className="text-zinc-600 text-sm text-center py-4">No data</p>}
      </div>
    </div>
  );
}
