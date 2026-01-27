import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { 
  Shield, Users, Ban, Crown, Coins, Diamond, TrendingUp, 
  Settings, Search, ChevronRight, ArrowLeft, Edit, Trash2,
  UserCheck, UserX, AlertTriangle
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

type AdminTab = 'overview' | 'users' | 'streams' | 'reports' | 'settings';

export default function Admin() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [searchQuery, setSearchQuery] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const { data: allUsers, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['admin', 'users'],
    queryFn: () => api.getAllUsers(user?.id),
    enabled: (user?.role === 'admin' || user?.role === 'superadmin') && !!user?.id,
  });

  const { data: liveStreams } = useQuery({
    queryKey: ['admin', 'streams'],
    queryFn: () => api.getLiveStreams(),
    enabled: user?.role === 'admin' || user?.role === 'superadmin',
  });

  const updateUserMutation = useMutation({
    mutationFn: (data: { userId: string; updates: Partial<User> }) => 
      api.updateUser(data.userId, data.updates, user?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast({ title: "User updated successfully" });
      setEditingUser(null);
    },
    onError: () => {
      toast({ title: "Failed to update user", variant: "destructive" });
    },
  });

  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a0a2e] via-[#16082a] to-[#0d0015] flex items-center justify-center p-6">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-white/50 mb-6">You don't have permission to access this page</p>
          <button
            onClick={() => setLocation("/")}
            className="bg-primary text-white px-6 py-2 rounded-full"
            data-testid="button-go-home"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const filteredUsers = allUsers?.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const stats = {
    totalUsers: allUsers?.length || 0,
    activeStreams: liveStreams?.length || 0,
    admins: allUsers?.filter(u => u.role === 'admin' || u.role === 'superadmin').length || 0,
    vipUsers: allUsers?.filter(u => u.vipTier > 0).length || 0,
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'streams', label: 'Streams', icon: Crown },
    { id: 'reports', label: 'Reports', icon: AlertTriangle },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a0a2e] via-[#16082a] to-[#0d0015]">
      <div className="sticky top-0 z-50 bg-[#1a0a2e]/95 backdrop-blur-md border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation("/")}
              className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white"
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Admin Dashboard
              </h1>
              <p className="text-white/50 text-xs capitalize">{user.role}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary text-white'
                  : 'bg-white/5 text-white/50 hover:bg-white/10'
              }`}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl p-4 border border-blue-500/30">
                <Users className="w-8 h-8 text-blue-400 mb-2" />
                <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
                <p className="text-white/50 text-sm">Total Users</p>
              </div>
              <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl p-4 border border-green-500/30">
                <Crown className="w-8 h-8 text-green-400 mb-2" />
                <p className="text-2xl font-bold text-white">{stats.activeStreams}</p>
                <p className="text-white/50 text-sm">Live Streams</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl p-4 border border-purple-500/30">
                <Shield className="w-8 h-8 text-purple-400 mb-2" />
                <p className="text-2xl font-bold text-white">{stats.admins}</p>
                <p className="text-white/50 text-sm">Admins</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-2xl p-4 border border-yellow-500/30">
                <Diamond className="w-8 h-8 text-yellow-400 mb-2" />
                <p className="text-2xl font-bold text-white">{stats.vipUsers}</p>
                <p className="text-white/50 text-sm">VIP Users</p>
              </div>
            </div>

            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <h3 className="text-white font-bold mb-3">Recent Activity</h3>
              <div className="space-y-3">
                {liveStreams?.slice(0, 5).map((stream) => (
                  <div key={stream.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm">{stream.title}</p>
                      <p className="text-white/50 text-xs">{stream.user?.username} • {stream.viewersCount} viewers</p>
                    </div>
                  </div>
                ))}
                {(!liveStreams || liveStreams.length === 0) && (
                  <p className="text-white/30 text-sm text-center py-4">No active streams</p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'users' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50"
                data-testid="input-search-users"
              />
            </div>

            {usersLoading ? (
              <div className="text-center py-8 text-white/50">Loading users...</div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((u) => (
                  <div 
                    key={u.id} 
                    className="bg-white/5 rounded-xl p-4 border border-white/10"
                    data-testid={`user-row-${u.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <img 
                        src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`} 
                        alt={u.username}
                        className="w-12 h-12 rounded-full"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-white font-medium">{u.username}</p>
                          {u.role === 'superadmin' && (
                            <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs">Super Admin</span>
                          )}
                          {u.role === 'admin' && (
                            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-xs">Admin</span>
                          )}
                          {u.vipTier > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs">VIP {u.vipTier}</span>
                          )}
                        </div>
                        <p className="text-white/50 text-xs">{u.email}</p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-white/30">
                          <span>Level {u.level}</span>
                          <span className="flex items-center gap-1"><Coins className="w-3 h-3" /> {u.coins?.toLocaleString()}</span>
                          <span className="flex items-center gap-1"><Diamond className="w-3 h-3" /> {u.diamonds?.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingUser(u)}
                          className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:text-white"
                          data-testid={`edit-user-${u.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'streams' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h3 className="text-white font-bold">Active Streams</h3>
            {liveStreams?.map((stream) => (
              <div key={stream.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary/50 to-pink-500/50 flex items-center justify-center">
                    <Crown className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{stream.title}</p>
                    <p className="text-white/50 text-sm">by {stream.user?.username}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-white/30">
                      <span className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        LIVE
                      </span>
                      <span>{stream.viewersCount} viewers</span>
                      <span>{stream.category}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setLocation(`/live/${stream.id}`)}
                    className="px-4 py-2 rounded-full bg-primary text-white text-sm"
                    data-testid={`view-stream-${stream.id}`}
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
            {(!liveStreams || liveStreams.length === 0) && (
              <div className="text-center py-8 text-white/30">No active streams</div>
            )}
          </motion.div>
        )}

        {activeTab === 'reports' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <AlertTriangle className="w-16 h-16 text-yellow-500/50 mx-auto mb-4" />
            <h3 className="text-white font-bold mb-2">No Reports</h3>
            <p className="text-white/50">No user reports to review</p>
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <h3 className="text-white font-bold mb-4">Platform Settings</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-white/70">Maintenance Mode</span>
                  <span className="text-green-400 text-sm">Off</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-white/70">New Registrations</span>
                  <span className="text-green-400 text-sm">Enabled</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-white/70">Version</span>
                  <span className="text-white/50 text-sm">1.0.0</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {editingUser && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#1a0a2e] rounded-2xl p-6 w-full max-w-md border border-white/10"
          >
            <h3 className="text-xl font-bold text-white mb-4">Edit User</h3>
            <div className="space-y-4">
              <div>
                <label className="text-white/50 text-sm">Username</label>
                <p className="text-white">{editingUser.username}</p>
              </div>
              <div>
                <label className="text-white/50 text-sm">Role</label>
                <select
                  value={editingUser.role || 'user'}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white mt-1"
                  disabled={user.role !== 'superadmin'}
                  data-testid="select-role"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  {user.role === 'superadmin' && <option value="superadmin">Super Admin</option>}
                </select>
              </div>
              <div>
                <label className="text-white/50 text-sm">VIP Tier</label>
                <select
                  value={editingUser.vipTier}
                  onChange={(e) => setEditingUser({ ...editingUser, vipTier: parseInt(e.target.value) })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white mt-1"
                  data-testid="select-vip"
                >
                  <option value="0">None</option>
                  <option value="1">VIP 1</option>
                  <option value="2">VIP 2</option>
                  <option value="3">VIP 3</option>
                  <option value="4">VIP 4</option>
                  <option value="5">VIP 5</option>
                </select>
              </div>
              <div>
                <label className="text-white/50 text-sm">Coins</label>
                <input
                  type="number"
                  value={editingUser.coins}
                  onChange={(e) => setEditingUser({ ...editingUser, coins: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white mt-1"
                  data-testid="input-coins"
                />
              </div>
              <div>
                <label className="text-white/50 text-sm">Diamonds</label>
                <input
                  type="number"
                  value={editingUser.diamonds}
                  onChange={(e) => setEditingUser({ ...editingUser, diamonds: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white mt-1"
                  data-testid="input-diamonds"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingUser(null)}
                className="flex-1 py-2 rounded-xl bg-white/10 text-white"
                data-testid="button-cancel"
              >
                Cancel
              </button>
              <button
                onClick={() => updateUserMutation.mutate({ 
                  userId: editingUser.id, 
                  updates: { 
                    role: editingUser.role,
                    vipTier: editingUser.vipTier,
                    coins: editingUser.coins,
                    diamonds: editingUser.diamonds,
                  } 
                })}
                disabled={updateUserMutation.isPending}
                className="flex-1 py-2 rounded-xl bg-primary text-white disabled:opacity-50"
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
