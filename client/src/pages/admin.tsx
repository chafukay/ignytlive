import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Shield, Users, Crown, Coins, Diamond, TrendingUp, 
  Search, Edit, AlertTriangle, Eye, UserCheck,
  Calendar, BarChart3, Award, Flame, X, LogOut,
  Plus, Trash2, ToggleLeft, ToggleRight, Percent, Loader2,
  Filter, MessageSquareWarning, Check
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdminAuth, adminFetch } from "@/lib/admin-auth-context";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

type AdminTab = 'dashboard' | 'users' | 'reports' | 'economy' | 'moderation';

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

interface CoinPackageData {
  id: number;
  coins: number;
  priceUsd: number;
  originalPriceUsd: number | null;
  discountPercent: number;
  label: string | null;
  sortOrder: number;
  isActive: boolean;
  effectivePriceCents: number;
  createdAt: string;
}

export default function AdminDashboard() {
  const { admin, token, logout } = useAdminAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState("");
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editingPackage, setEditingPackage] = useState<CoinPackageData | null>(null);
  const [showPackageForm, setShowPackageForm] = useState(false);
  const [newFilterWord, setNewFilterWord] = useState("");
  const [newFilterCategory, setNewFilterCategory] = useState("custom");
  const [flaggedFilter, setFlaggedFilter] = useState<"all" | "unreviewed" | "reviewed">("unreviewed");

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const res = await adminFetch(`/api/admin/stats`, token!);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!admin?.id && !!token,
    refetchInterval: 30000,
  });

  const { data: allUsers = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const res = await adminFetch(`/api/admin/users`, token!);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: activeTab === 'users' && !!token,
  });

  const { data: reports = [] } = useQuery<any[]>({
    queryKey: ['admin', 'reports'],
    queryFn: async () => {
      const res = await adminFetch(`/api/admin/reports`, token!);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: activeTab === 'reports' && !!token,
  });

  const { data: coinPackages = [], isLoading: packagesLoading } = useQuery<CoinPackageData[]>({
    queryKey: ['admin', 'coin-packages'],
    queryFn: async () => {
      const res = await adminFetch(`/api/admin/coin-packages`, token!);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: activeTab === 'economy' && !!token,
  });

  const { data: filterWordsData = [], isLoading: filterWordsLoading } = useQuery<any[]>({
    queryKey: ['admin', 'filter-words'],
    queryFn: async () => {
      const res = await adminFetch(`/api/admin/filter-words`, token!);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: activeTab === 'moderation' && !!token,
  });

  const { data: flaggedData } = useQuery<{ items: any[]; total: number; unreviewed: number }>({
    queryKey: ['admin', 'flagged-content', flaggedFilter],
    queryFn: async () => {
      const reviewed = flaggedFilter === "all" ? "" : flaggedFilter === "reviewed" ? "&reviewed=true" : "&reviewed=false";
      const res = await adminFetch(`/api/admin/flagged-content?limit=50${reviewed}`, token!);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: activeTab === 'moderation' && !!token,
  });

  const updateUserMutation = useMutation({
    mutationFn: async (data: { userId: string; updates: any }) => {
      const res = await adminFetch(`/api/admin/update-user`, token!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: data.userId, updates: data.updates }),
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

  const deactivateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await adminFetch(`/api/admin/users/${userId}/deactivate`, token!, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      toast({ title: "User deactivated" });
    },
    onError: () => {
      toast({ title: "Failed to deactivate user", variant: "destructive" });
    },
  });

  const reactivateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await adminFetch(`/api/admin/users/${userId}/reactivate`, token!, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      toast({ title: "User reactivated" });
    },
    onError: () => {
      toast({ title: "Failed to reactivate user", variant: "destructive" });
    },
  });

  const resolveReportMutation = useMutation({
    mutationFn: async ({ reportId, status }: { reportId: string; status: string }) => {
      const res = await adminFetch(`/api/admin/reports/${reportId}`, token!, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      toast({ title: "Report updated" });
    },
    onError: () => {
      toast({ title: "Failed to update report", variant: "destructive" });
    },
  });

  const createPackageMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await adminFetch(`/api/admin/coin-packages`, token!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'coin-packages'] });
      toast({ title: "Package created" });
      setShowPackageForm(false);
    },
    onError: (err: any) => {
      toast({ title: err.message || "Failed to create package", variant: "destructive" });
    },
  });

  const updatePackageMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await adminFetch(`/api/admin/coin-packages/${id}`, token!, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'coin-packages'] });
      toast({ title: "Package updated" });
      setEditingPackage(null);
    },
    onError: (err: any) => {
      toast({ title: err.message || "Failed to update package", variant: "destructive" });
    },
  });

  const deletePackageMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await adminFetch(`/api/admin/coin-packages/${id}`, token!, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'coin-packages'] });
      toast({ title: "Package deactivated" });
    },
    onError: () => {
      toast({ title: "Failed to delete package", variant: "destructive" });
    },
  });

  const addFilterWordMutation = useMutation({
    mutationFn: async (data: { word: string; category: string }) => {
      const res = await adminFetch(`/api/admin/filter-words`, token!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'filter-words'] });
      toast({ title: "Filter word added" });
      setNewFilterWord("");
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const deleteFilterWordMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await adminFetch(`/api/admin/filter-words/${id}`, token!, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'filter-words'] });
      toast({ title: "Filter word removed" });
    },
  });

  const toggleFilterWordMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await adminFetch(`/api/admin/filter-words/${id}`, token!, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'filter-words'] });
    },
  });

  const reviewFlaggedMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await adminFetch(`/api/admin/flagged-content/${id}/review`, token!, { method: "PATCH" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'flagged-content'] });
      toast({ title: "Marked as reviewed" });
    },
  });

  const togglePackageMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await adminFetch(`/api/admin/coin-packages/${id}`, token!, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'coin-packages'] });
    },
    onError: () => {
      toast({ title: "Failed to toggle package", variant: "destructive" });
    },
  });

  const filteredUsers = allUsers.filter(u =>
    u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tabs = [
    { id: 'dashboard' as AdminTab, label: 'Dashboard', icon: BarChart3 },
    { id: 'users' as AdminTab, label: 'Users', icon: Users },
    { id: 'reports' as AdminTab, label: 'Reports', icon: AlertTriangle },
    { id: 'moderation' as AdminTab, label: 'Moderation', icon: Filter },
    { id: 'economy' as AdminTab, label: 'Economy', icon: Coins },
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
              {tab.id === 'moderation' && flaggedData && flaggedData.unreviewed > 0 && (
                <span className="ml-auto bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">{flaggedData.unreviewed}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="border-t border-zinc-800 pt-4 mt-4">
          <div className="px-3 py-2 mb-2">
            <p className="text-zinc-400 text-xs">Logged in as</p>
            <p className="text-white text-sm font-medium">{admin?.username}</p>
          </div>
          <button onClick={logout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 w-full" data-testid="button-admin-logout">
            <LogOut className="w-5 h-5" />
            Sign Out
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
                  <StatCard icon={Coins} label="Total Coins" value={stats.totalCoins} color="amber" />
                  <StatCard icon={Diamond} label="Total Diamonds" value={stats.totalDiamonds} color="pink" />
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
                placeholder="Search by username or email..."
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
                      <th className="px-4 py-3 text-zinc-400 font-medium">Email</th>
                      <th className="px-4 py-3 text-zinc-400 font-medium">Status</th>
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
                        <td className="px-4 py-3">
                          {u.emailVerified ? (
                            <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-xs">Verified</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-xs">Unverified</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {u.isDeleted ? (
                            <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-xs" title={u.deletedAt ? `Deleted ${new Date(u.deletedAt).toLocaleDateString()}` : ''}>Deleted</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-xs">Active</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-zinc-500 text-xs">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}</td>
                        <td className="px-4 py-3 flex gap-1">
                          <button
                            onClick={() => setEditingUser({ ...u })}
                            className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
                            data-testid={`edit-user-${u.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {u.isDeleted ? (
                            <button
                              onClick={() => reactivateUserMutation.mutate(u.id)}
                              className="p-1.5 rounded-lg bg-green-900/50 text-green-400 hover:bg-green-800/50 text-xs"
                              data-testid={`reactivate-user-${u.id}`}
                              title="Reactivate user"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => { if (confirm(`Deactivate ${u.username}? This will anonymize their data.`)) deactivateUserMutation.mutate(u.id); }}
                              className="p-1.5 rounded-lg bg-red-900/50 text-red-400 hover:bg-red-800/50 text-xs"
                              data-testid={`deactivate-user-${u.id}`}
                              title="Deactivate user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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
                          <span className={`px-2 py-0.5 rounded text-xs ${report.status === 'resolved' ? 'bg-green-500/20 text-green-400' : report.status === 'dismissed' ? 'bg-zinc-500/20 text-zinc-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{report.status}</span>
                        </div>
                        {report.description && <p className="text-zinc-400 text-sm mb-2">{report.description}</p>}
                        <div className="flex items-center justify-between">
                          <p className="text-zinc-600 text-xs">Reported by: {report.reporterId} • {new Date(report.createdAt).toLocaleString()}</p>
                          {report.status === 'pending' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => resolveReportMutation.mutate({ reportId: report.id, status: 'resolved' })}
                                className="px-3 py-1 rounded bg-green-600 text-white text-xs hover:bg-green-700"
                                data-testid={`resolve-report-${report.id}`}
                              >Resolve</button>
                              <button
                                onClick={() => resolveReportMutation.mutate({ reportId: report.id, status: 'dismissed' })}
                                className="px-3 py-1 rounded bg-zinc-700 text-zinc-300 text-xs hover:bg-zinc-600"
                                data-testid={`dismiss-report-${report.id}`}
                              >Dismiss</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'moderation' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-2xl font-bold text-white mb-6" data-testid="text-moderation-title">Content Moderation</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Custom Filter Words</h3>
                  <span className="text-zinc-500 text-sm">{filterWordsData.length} words</span>
                </div>

                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newFilterWord}
                    onChange={(e) => setNewFilterWord(e.target.value)}
                    placeholder="Add word to filter..."
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-3 text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500/50 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newFilterWord.trim()) {
                        addFilterWordMutation.mutate({ word: newFilterWord, category: newFilterCategory });
                      }
                    }}
                    data-testid="input-filter-word"
                  />
                  <select
                    value={newFilterCategory}
                    onChange={(e) => setNewFilterCategory(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-2 text-white text-sm"
                    data-testid="select-filter-category"
                  >
                    <option value="custom">Custom</option>
                    <option value="profanity">Profanity</option>
                    <option value="slur">Slur</option>
                    <option value="spam">Spam</option>
                  </select>
                  <button
                    onClick={() => {
                      if (newFilterWord.trim()) addFilterWordMutation.mutate({ word: newFilterWord, category: newFilterCategory });
                    }}
                    disabled={!newFilterWord.trim() || addFilterWordMutation.isPending}
                    className="px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
                    data-testid="button-add-filter-word"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="bg-zinc-900 rounded-xl border border-zinc-800 max-h-[400px] overflow-y-auto">
                  {filterWordsLoading ? (
                    <div className="p-4 space-y-2">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 animate-pulse">
                          <div className="h-4 w-24 bg-zinc-700 rounded" />
                          <div className="h-4 w-16 bg-zinc-700 rounded" />
                        </div>
                      ))}
                    </div>
                  ) : filterWordsData.length === 0 ? (
                    <div className="p-8 text-center">
                      <Filter className="w-10 h-10 text-zinc-700 mx-auto mb-2" />
                      <p className="text-zinc-500 text-sm">No custom filter words yet</p>
                      <p className="text-zinc-600 text-xs mt-1">Default profanity list is always active</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-800/50">
                      {filterWordsData.map((fw: any) => (
                        <div key={fw.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-zinc-800/30" data-testid={`filter-word-${fw.id}`}>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => toggleFilterWordMutation.mutate({ id: fw.id, isActive: !fw.isActive })}
                              data-testid={`toggle-filter-${fw.id}`}
                            >
                              {fw.isActive ? (
                                <ToggleRight className="w-5 h-5 text-green-400" />
                              ) : (
                                <ToggleLeft className="w-5 h-5 text-zinc-600" />
                              )}
                            </button>
                            <span className={`text-sm ${fw.isActive ? 'text-white' : 'text-zinc-600 line-through'}`}>{fw.word}</span>
                            <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 text-xs">{fw.category}</span>
                          </div>
                          <button
                            onClick={() => deleteFilterWordMutation.mutate(fw.id)}
                            className="p-1 rounded hover:bg-red-500/10 text-zinc-500 hover:text-red-400"
                            data-testid={`delete-filter-${fw.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-zinc-600 text-xs mt-2">A default list of common profanity and slurs is always active in addition to custom words above.</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <MessageSquareWarning className="w-5 h-5 text-amber-400" />
                    Flagged Content
                    {flaggedData && flaggedData.unreviewed > 0 && (
                      <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded-full">{flaggedData.unreviewed} unreviewed</span>
                    )}
                  </h3>
                  <div className="flex gap-1">
                    {(["unreviewed", "all", "reviewed"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setFlaggedFilter(f)}
                        className={`px-2.5 py-1 rounded text-xs font-medium ${flaggedFilter === f ? 'bg-orange-500/20 text-orange-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                        data-testid={`filter-flagged-${f}`}
                      >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-zinc-900 rounded-xl border border-zinc-800 max-h-[500px] overflow-y-auto">
                  {!flaggedData || flaggedData.items.length === 0 ? (
                    <div className="p-8 text-center">
                      <Check className="w-10 h-10 text-green-500/30 mx-auto mb-2" />
                      <p className="text-zinc-500 text-sm">No flagged content</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-800/50">
                      {flaggedData.items.map((item: any) => (
                        <div key={item.id} className="p-3 hover:bg-zinc-800/30" data-testid={`flagged-${item.id}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-xs">{item.contentType}</span>
                                <span className="text-zinc-600 text-xs">{new Date(item.createdAt).toLocaleString()}</span>
                              </div>
                              <p className="text-white text-sm break-words">{item.filteredContent}</p>
                              {item.context && <p className="text-zinc-600 text-xs mt-1">{item.context}</p>}
                              <div className="flex flex-wrap gap-1 mt-1">
                                {JSON.parse(item.matchedWords || "[]").map((w: string, i: number) => (
                                  <span key={i} className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 text-xs">{w}</span>
                                ))}
                              </div>
                            </div>
                            {!item.reviewed && (
                              <button
                                onClick={() => reviewFlaggedMutation.mutate(item.id)}
                                className="shrink-0 px-2 py-1 rounded bg-green-500/10 text-green-400 text-xs hover:bg-green-500/20"
                                data-testid={`review-flagged-${item.id}`}
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'economy' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white" data-testid="text-economy-title">Coin Packages</h2>
              <button
                onClick={() => setShowPackageForm(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600"
                data-testid="button-add-package"
              >
                <Plus className="w-4 h-4" />
                Add Package
              </button>
            </div>

            {packagesLoading ? (
              <div className="text-center py-8 text-zinc-500">Loading packages...</div>
            ) : coinPackages.length === 0 ? (
              <div className="text-center py-16">
                <Coins className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                <h3 className="text-zinc-400 font-medium mb-1">No Packages</h3>
                <p className="text-zinc-600 text-sm">Add coin packages for users to purchase</p>
              </div>
            ) : (
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-left">
                      <th className="px-4 py-3 text-zinc-400 font-medium">Order</th>
                      <th className="px-4 py-3 text-zinc-400 font-medium">Coins</th>
                      <th className="px-4 py-3 text-zinc-400 font-medium">Base Price</th>
                      <th className="px-4 py-3 text-zinc-400 font-medium">Discount</th>
                      <th className="px-4 py-3 text-zinc-400 font-medium">Effective Price</th>
                      <th className="px-4 py-3 text-zinc-400 font-medium">Original Price</th>
                      <th className="px-4 py-3 text-zinc-400 font-medium">Label</th>
                      <th className="px-4 py-3 text-zinc-400 font-medium">Status</th>
                      <th className="px-4 py-3 text-zinc-400 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coinPackages.map((pkg) => (
                      <tr key={pkg.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30" data-testid={`package-row-${pkg.id}`}>
                        <td className="px-4 py-3 text-zinc-400">{pkg.sortOrder}</td>
                        <td className="px-4 py-3 text-amber-400 font-medium">{pkg.coins.toLocaleString()}</td>
                        <td className="px-4 py-3 text-zinc-300">${(pkg.priceUsd / 100).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          {pkg.discountPercent > 0 ? (
                            <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-xs font-medium">{pkg.discountPercent}% OFF</span>
                          ) : (
                            <span className="text-zinc-600 text-xs">None</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-green-400 font-medium">${(pkg.effectivePriceCents / 100).toFixed(2)}</td>
                        <td className="px-4 py-3 text-zinc-500">{pkg.originalPriceUsd ? `$${(pkg.originalPriceUsd / 100).toFixed(2)}` : '-'}</td>
                        <td className="px-4 py-3">
                          {pkg.label ? (
                            <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 text-xs">{pkg.label}</span>
                          ) : (
                            <span className="text-zinc-600 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => togglePackageMutation.mutate({ id: pkg.id, isActive: !pkg.isActive })}
                            className="flex items-center gap-1"
                            data-testid={`toggle-package-${pkg.id}`}
                          >
                            {pkg.isActive ? (
                              <ToggleRight className="w-6 h-6 text-green-400" />
                            ) : (
                              <ToggleLeft className="w-6 h-6 text-zinc-600" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setEditingPackage(pkg)}
                              className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
                              data-testid={`edit-package-${pkg.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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

      {(showPackageForm || editingPackage) && (
        <PackageFormModal
          pkg={editingPackage}
          onClose={() => { setShowPackageForm(false); setEditingPackage(null); }}
          onSave={(data) => {
            if (editingPackage) {
              updatePackageMutation.mutate({ id: editingPackage.id, ...data });
            } else {
              createPackageMutation.mutate(data);
            }
          }}
          isPending={createPackageMutation.isPending || updatePackageMutation.isPending}
        />
      )}
    </div>
  );
}

function PackageFormModal({ pkg, onClose, onSave, isPending }: {
  pkg: CoinPackageData | null;
  onClose: () => void;
  onSave: (data: any) => void;
  isPending: boolean;
}) {
  const [coins, setCoins] = useState(pkg?.coins || 0);
  const [priceUsd, setPriceUsd] = useState(pkg ? (pkg.priceUsd / 100).toFixed(2) : "");
  const [originalPriceUsd, setOriginalPriceUsd] = useState(pkg?.originalPriceUsd ? (pkg.originalPriceUsd / 100).toFixed(2) : "");
  const [discountPercent, setDiscountPercent] = useState(pkg?.discountPercent || 0);
  const [label, setLabel] = useState(pkg?.label || "");
  const [sortOrder, setSortOrder] = useState(pkg?.sortOrder || 0);
  const [isActive, setIsActive] = useState(pkg?.isActive !== false);

  const basePriceCents = Math.round(parseFloat(priceUsd || "0") * 100);
  const effectiveCents = discountPercent > 0 ? Math.floor(basePriceCents * (100 - discountPercent) / 100) : basePriceCents;

  const handleSubmit = () => {
    if (coins <= 0 || basePriceCents <= 0) return;
    onSave({
      coins,
      priceUsd: basePriceCents,
      originalPriceUsd: originalPriceUsd ? Math.round(parseFloat(originalPriceUsd) * 100) : null,
      discountPercent,
      label: label || null,
      sortOrder,
      isActive,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-zinc-900 rounded-2xl p-6 w-full max-w-md border border-zinc-800">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">{pkg ? "Edit Package" : "Add Package"}</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-zinc-400 text-sm block mb-1">Coins</label>
            <input type="number" value={coins || ""} onChange={(e) => setCoins(parseInt(e.target.value) || 0)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-2 px-3 text-white" placeholder="e.g. 1000" data-testid="input-pkg-coins" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-zinc-400 text-sm block mb-1">Base Price (USD)</label>
              <input type="text" value={priceUsd} onChange={(e) => setPriceUsd(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-2 px-3 text-white" placeholder="9.99" data-testid="input-pkg-price" />
            </div>
            <div>
              <label className="text-zinc-400 text-sm block mb-1">Original Price (USD)</label>
              <input type="text" value={originalPriceUsd} onChange={(e) => setOriginalPriceUsd(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-2 px-3 text-white" placeholder="19.99" data-testid="input-pkg-original-price" />
            </div>
          </div>
          <div>
            <label className="text-zinc-400 text-sm block mb-1">Discount %</label>
            <div className="flex items-center gap-3">
              <input type="number" min={0} max={99} value={discountPercent} onChange={(e) => setDiscountPercent(Math.min(99, Math.max(0, parseInt(e.target.value) || 0)))} className="w-24 bg-zinc-800 border border-zinc-700 rounded-lg py-2 px-3 text-white" data-testid="input-pkg-discount" />
              <Percent className="w-4 h-4 text-zinc-500" />
              {discountPercent > 0 && basePriceCents > 0 && (
                <span className="text-green-400 text-sm">Effective: ${(effectiveCents / 100).toFixed(2)}</span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-zinc-400 text-sm block mb-1">Label</label>
              <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-2 px-3 text-white" placeholder="Popular, Hot, etc." data-testid="input-pkg-label" />
            </div>
            <div>
              <label className="text-zinc-400 text-sm block mb-1">Sort Order</label>
              <input type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-2 px-3 text-white" data-testid="input-pkg-sort" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded" data-testid="checkbox-pkg-active" />
            <label className="text-zinc-300 text-sm">Active (visible to users)</label>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700" data-testid="button-pkg-cancel">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={isPending || coins <= 0 || basePriceCents <= 0}
            className="flex-1 py-2.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
            data-testid="button-pkg-save"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {pkg ? "Update" : "Create"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function formatCompact(n: number | string): string {
  const num = typeof n === 'string' ? parseFloat(n.replace(/,/g, '')) : n;
  if (isNaN(num)) return String(n);
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 10_000) return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(num);
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
      <p className="text-2xl font-bold text-white truncate" title={String(value)}>{formatCompact(value)}</p>
      <p className="text-zinc-400 text-sm truncate">{label}</p>
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
            <span className="text-zinc-400 text-xs whitespace-nowrap">{formatCompact(u[valueKey] || 0)} {valueLabel}</span>
          </div>
        ))}
        {users.length === 0 && <p className="text-zinc-600 text-sm text-center py-4">No data</p>}
      </div>
    </div>
  );
}
