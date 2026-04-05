import Layout from "@/components/layout";
import { GuestGate } from "@/components/guest-gate";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getAuthToken } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { getServerUrl } from "@/lib/capacitor";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import UserAvatar from "@/components/user-avatar";
import { ArrowLeft, Building2, Plus, Users, Crown, Diamond, UserMinus, Search, ChevronRight, Loader2, LogOut, Shield, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { User } from "@shared/schema";

interface Agency {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  logo: string | null;
  diamondBonusPercent: number;
  isRecruiting: boolean;
  memberCount: number;
  totalDiamondsEarned: number;
  createdAt: string;
  owner: User;
}

interface AgencyMember {
  id: string;
  agencyId: string;
  userId: string;
  role: string;
  diamondsEarned: number;
  joinedAt: string;
  user: User;
}

interface AgencyMembership {
  id: string;
  agencyId: string;
  userId: string;
  role: string;
  diamondsEarned: number;
  joinedAt: string;
  agency: Agency;
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getAuthToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export default function AgencyPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [agencyName, setAgencyName] = useState("");
  const [agencyDescription, setAgencyDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"my" | "browse">("my");
  const [viewingAgencyId, setViewingAgencyId] = useState<string | null>(null);

  const { data: myMembership, isLoading: loadingMy } = useQuery<AgencyMembership | null>({
    queryKey: ["my-agency"],
    queryFn: async () => {
      const res = await fetch(`${getServerUrl()}/api/agencies/my`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!user,
  });

  const { data: allAgencies = [], isLoading: loadingAll } = useQuery<Agency[]>({
    queryKey: ["agencies", searchQuery],
    queryFn: async () => {
      const url = searchQuery ? `/api/agencies?search=${encodeURIComponent(searchQuery)}` : "/api/agencies";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: viewingAgency } = useQuery<Agency>({
    queryKey: ["agency", viewingAgencyId],
    queryFn: async () => {
      const res = await fetch(`${getServerUrl()}/api/agencies/${viewingAgencyId}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!viewingAgencyId,
  });

  const { data: agencyMembers = [] } = useQuery<AgencyMember[]>({
    queryKey: ["agency-members", viewingAgencyId || myMembership?.agencyId],
    queryFn: async () => {
      const id = viewingAgencyId || myMembership?.agencyId;
      const res = await fetch(`${getServerUrl()}/api/agencies/${id}/members`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!(viewingAgencyId || myMembership?.agencyId),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${getServerUrl()}/api/agencies`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ name: agencyName, description: agencyDescription }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create agency");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-agency"] });
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
      setShowCreate(false);
      setAgencyName("");
      setAgencyDescription("");
      toast({ title: "Agency created!" });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const joinMutation = useMutation({
    mutationFn: async (agencyId: string) => {
      const res = await fetch(`${getServerUrl()}/api/agencies/${agencyId}/join`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to join");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-agency"] });
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
      setViewingAgencyId(null);
      toast({ title: "You joined the agency!" });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async (agencyId: string) => {
      const res = await fetch(`${getServerUrl()}/api/agencies/${agencyId}/leave`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to leave");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-agency"] });
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
      toast({ title: "You left the agency" });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (agencyId: string) => {
      const res = await fetch(`${getServerUrl()}/api/agencies/${agencyId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-agency"] });
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
      toast({ title: "Agency deleted" });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async ({ agencyId, memberId }: { agencyId: string; memberId: string }) => {
      const res = await fetch(`${getServerUrl()}/api/agencies/${agencyId}/members/${memberId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to remove member");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-members"] });
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
      toast({ title: "Member removed" });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  if (!user) return null;

  const currentAgency = viewingAgency || (myMembership ? myMembership.agency : null);
  const isOwner = currentAgency?.ownerId === user.id;
  const isAdmin = myMembership?.role === "admin" || isOwner;

  if (viewingAgencyId && currentAgency) {
    const isMember = myMembership?.agencyId === viewingAgencyId;
    return (
      <GuestGate>
        <Layout>
          <div className="p-4 pb-24 max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setViewingAgencyId(null)} className="p-2 rounded-full bg-muted" data-testid="button-back-agency">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold flex-1">{currentAgency.name}</h1>
            </div>

            <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold" data-testid="text-agency-name">{currentAgency.name}</h2>
                  <p className="text-muted-foreground text-sm">Owner: {currentAgency.owner?.username || "Unknown"}</p>
                </div>
              </div>
              {currentAgency.description && (
                <p className="text-muted-foreground text-sm mb-4">{currentAgency.description}</p>
              )}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-background/50 rounded-xl p-3">
                  <div className="font-bold text-lg" data-testid="text-member-count">{currentAgency.memberCount}</div>
                  <div className="text-xs text-muted-foreground">Members</div>
                </div>
                <div className="bg-background/50 rounded-xl p-3">
                  <div className="font-bold text-lg text-cyan-400">{currentAgency.diamondBonusPercent}%</div>
                  <div className="text-xs text-muted-foreground">Bonus</div>
                </div>
                <div className="bg-background/50 rounded-xl p-3">
                  <div className="font-bold text-lg text-yellow-400" data-testid="text-total-diamonds">{currentAgency.totalDiamondsEarned.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">💎 Earned</div>
                </div>
              </div>
            </div>

            {!isMember && currentAgency.isRecruiting && (
              <button
                onClick={() => joinMutation.mutate(currentAgency.id)}
                disabled={joinMutation.isPending}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold py-3 rounded-xl mb-6 disabled:opacity-50"
                data-testid="button-join-agency"
              >
                {joinMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Join Agency"}
              </button>
            )}
            {!isMember && !currentAgency.isRecruiting && (
              <div className="text-center text-muted-foreground py-3 mb-6 bg-muted rounded-xl">Not recruiting</div>
            )}

            <h3 className="font-bold mb-3 flex items-center gap-2">
              <Users className="w-5 h-5" /> Members ({agencyMembers.length})
            </h3>
            <div className="space-y-2">
              {agencyMembers.map((member, idx) => (
                <div key={member.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl" data-testid={`agency-member-${member.userId}`}>
                  <span className="text-sm font-bold text-muted-foreground w-6">{idx + 1}</span>
                  <UserAvatar userId={member.user.id} username={member.user.username} avatar={member.user.avatar} size="sm" linkToProfile={false} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{member.user.username}</span>
                      {member.role === "owner" && <Crown className="w-4 h-4 text-yellow-400" />}
                      {member.role === "admin" && <Shield className="w-4 h-4 text-blue-400" />}
                    </div>
                    <span className="text-xs text-muted-foreground">💎 {member.diamondsEarned.toLocaleString()} earned</span>
                  </div>
                  {isAdmin && member.userId !== currentAgency.ownerId && member.userId !== user.id && (
                    <button
                      onClick={() => removeMemberMutation.mutate({ agencyId: currentAgency.id, memberId: member.userId })}
                      className="p-2 rounded-full hover:bg-destructive/20"
                      data-testid={`button-remove-member-${member.userId}`}
                    >
                      <UserMinus className="w-4 h-4 text-red-400" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Layout>
      </GuestGate>
    );
  }

  if (myMembership) {
    return (
      <GuestGate>
        <Layout>
          <div className="p-4 pb-24 max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setLocation("/profile")} className="p-2 rounded-full bg-muted" data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold flex-1">My Agency</h1>
              {isOwner && (
                <button onClick={() => setViewingAgencyId(myMembership.agencyId)} className="p-2 rounded-full bg-muted" data-testid="button-manage-agency">
                  <Settings className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold" data-testid="text-my-agency-name">{myMembership.agency.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    {myMembership.role === "owner" && <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded-full">Owner</span>}
                    {myMembership.role === "admin" && <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded-full">Admin</span>}
                    {myMembership.role === "member" && <span className="bg-gray-500/20 text-gray-400 text-xs px-2 py-0.5 rounded-full">Member</span>}
                  </div>
                </div>
              </div>
              {myMembership.agency.description && (
                <p className="text-muted-foreground text-sm mb-4">{myMembership.agency.description}</p>
              )}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-background/50 rounded-xl p-3">
                  <div className="font-bold text-lg">{myMembership.agency.memberCount}</div>
                  <div className="text-xs text-muted-foreground">Members</div>
                </div>
                <div className="bg-background/50 rounded-xl p-3">
                  <div className="font-bold text-lg text-cyan-400">{myMembership.agency.diamondBonusPercent}%</div>
                  <div className="text-xs text-muted-foreground">Bonus</div>
                </div>
                <div className="bg-background/50 rounded-xl p-3">
                  <div className="font-bold text-lg text-yellow-400" data-testid="text-my-diamonds">{myMembership.diamondsEarned.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">💎 My Earnings</div>
                </div>
              </div>
            </div>

            <h3 className="font-bold mb-3 flex items-center gap-2">
              <Diamond className="w-5 h-5 text-cyan-400" /> Agency Leaderboard
            </h3>
            <div className="space-y-2 mb-6">
              {agencyMembers.map((member, idx) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`flex items-center gap-3 p-3 rounded-xl ${member.userId === user.id ? 'bg-cyan-500/10 border border-cyan-500/30' : 'bg-muted/30'}`}
                  data-testid={`leaderboard-member-${member.userId}`}
                >
                  <span className={`text-sm font-bold w-6 ${idx < 3 ? 'text-yellow-400' : 'text-muted-foreground'}`}>
                    {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`}
                  </span>
                  <UserAvatar userId={member.user.id} username={member.user.username} avatar={member.user.avatar} size="sm" linkToProfile={false} />
                  <div className="flex-1">
                    <span className="font-medium">{member.user.username}</span>
                    {member.role === "owner" && <Crown className="w-3 h-3 text-yellow-400 inline ml-1" />}
                  </div>
                  <span className="text-cyan-400 font-bold">💎 {member.diamondsEarned.toLocaleString()}</span>
                </motion.div>
              ))}
            </div>

            {!isOwner && (
              <button
                onClick={() => leaveMutation.mutate(myMembership.agencyId)}
                disabled={leaveMutation.isPending}
                className="w-full flex items-center justify-center gap-2 text-red-400 border border-red-500/30 py-3 rounded-xl hover:bg-red-500/10"
                data-testid="button-leave-agency"
              >
                <LogOut className="w-4 h-4" />
                {leaveMutation.isPending ? "Leaving..." : "Leave Agency"}
              </button>
            )}
            {isOwner && (
              <button
                onClick={() => { if (window.confirm("Delete this agency? This cannot be undone.")) deleteMutation.mutate(myMembership.agencyId); }}
                disabled={deleteMutation.isPending}
                className="w-full flex items-center justify-center gap-2 text-red-400 border border-red-500/30 py-3 rounded-xl hover:bg-red-500/10"
                data-testid="button-delete-agency"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete Agency"}
              </button>
            )}
          </div>
        </Layout>
      </GuestGate>
    );
  }

  return (
    <GuestGate>
      <Layout>
        <div className="p-4 pb-24 max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setLocation("/profile")} className="p-2 rounded-full bg-muted" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold flex-1">Agency</h1>
            <button
              onClick={() => setShowCreate(true)}
              className="p-2 rounded-full bg-cyan-500/20 text-cyan-400"
              data-testid="button-create-agency"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-2xl p-6 mb-6 text-center">
            <Building2 className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
            <h2 className="text-lg font-bold mb-2">Join or Create an Agency</h2>
            <p className="text-muted-foreground text-sm mb-4">
              Agencies give you a diamond bonus on all gifts received while streaming. Create your own or join an existing one!
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold px-6 py-2.5 rounded-full"
              data-testid="button-create-agency-cta"
            >
              Create Agency
            </button>
          </div>

          <AnimatePresence>
            {showCreate && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-6"
              >
                <div className="bg-muted/30 border border-border rounded-2xl p-4 space-y-3">
                  <h3 className="font-bold">Create Agency</h3>
                  <input
                    type="text"
                    placeholder="Agency name"
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground"
                    data-testid="input-agency-name"
                  />
                  <textarea
                    placeholder="Description (optional)"
                    value={agencyDescription}
                    onChange={(e) => setAgencyDescription(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground resize-none"
                    rows={3}
                    data-testid="input-agency-description"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowCreate(false)}
                      className="flex-1 bg-muted text-foreground py-2.5 rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => createMutation.mutate()}
                      disabled={!agencyName.trim() || createMutation.isPending}
                      className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold py-2.5 rounded-xl disabled:opacity-50"
                      data-testid="button-submit-create"
                    >
                      {createMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Create"}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search agencies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-3 text-foreground"
              data-testid="input-search-agencies"
            />
          </div>

          {loadingAll ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : allAgencies.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              {searchQuery ? "No agencies found" : "No agencies yet. Be the first to create one!"}
            </div>
          ) : (
            <div className="space-y-3">
              {allAgencies.map((agency) => (
                <div
                  key={agency.id}
                  onClick={() => setViewingAgencyId(agency.id)}
                  className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors"
                  data-testid={`agency-card-${agency.id}`}
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold truncate">{agency.name}</h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span><Users className="w-3 h-3 inline" /> {agency.memberCount}</span>
                      <span>💎 {agency.totalDiamondsEarned.toLocaleString()}</span>
                      <span className="text-cyan-400">+{agency.diamondBonusPercent}% bonus</span>
                    </div>
                  </div>
                  {agency.isRecruiting && (
                    <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full">Open</span>
                  )}
                  <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      </Layout>
    </GuestGate>
  );
}
