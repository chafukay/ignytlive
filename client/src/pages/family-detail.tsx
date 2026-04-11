import Layout from "@/components/layout";
import { GuestGate } from "@/components/guest-gate";
import { Users, ChevronLeft, Crown, Shield, User, Settings, LogOut, Send, MessageCircle, Trophy, UserMinus, UserPlus } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth, getAuthToken } from "@/lib/auth-context";
import { useParams, useLocation, Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getServerUrl } from "@/lib/capacitor";

interface Family {
  id: string;
  name: string;
  description: string | null;
  avatar: string | null;
  ownerId: string;
  memberCount: number;
  maxMembers: number;
  totalGifts: number;
  weeklyGifts: number;
  isPublic: boolean;
  minLevel: number;
}

interface FamilyMember {
  id: string;
  familyId: string;
  userId: string;
  role: string;
  contributedGifts: number;
  joinedAt: string;
  user: {
    id: string;
    username: string;
    avatar: string | null;
    level: number;
    isLive: boolean;
  };
}

interface FamilyMessage {
  id: string;
  familyId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    avatar: string | null;
  };
}

export default function FamilyDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("members");
  const [messageContent, setMessageContent] = useState("");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editData, setEditData] = useState({ name: "", description: "", isPublic: true, minLevel: 1 });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: family, isLoading } = useQuery<Family>({
    queryKey: ["family", id],
    queryFn: async () => {
      const res = await fetch(`${getServerUrl()}/api/families/${id}`);
      if (!res.ok) throw new Error("Family not found");
      return res.json();
    },
  });

  const { data: members } = useQuery<FamilyMember[]>({
    queryKey: ["family-members", id],
    queryFn: async () => {
      const res = await fetch(`${getServerUrl()}/api/families/${id}/members`);
      return res.json();
    },
    enabled: !!id,
  });

  const { data: messages, refetch: refetchMessages } = useQuery<FamilyMessage[]>({
    queryKey: ["family-messages", id],
    queryFn: async () => {
      const res = await fetch(`${getServerUrl()}/api/families/${id}/messages`);
      return res.json();
    },
    enabled: !!id && activeTab === "chat",
    refetchInterval: activeTab === "chat" ? 3000 : false,
  });

  const currentMember = members?.find(m => m.userId === user?.id);
  const isOwner = family?.ownerId === user?.id;
  const isAdmin = currentMember?.role === "admin";
  const canManage = isOwner || isAdmin;

  useEffect(() => {
    if (family) {
      setEditData({
        name: family.name,
        description: family.description || "",
        isPublic: family.isPublic,
        minLevel: family.minLevel,
      });
    }
  }, [family]);

  useEffect(() => {
    if (messages && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const leaveMutation = useMutation({
    mutationFn: async () => {
      
      const res = await fetch(`${getServerUrl()}/api/families/${id}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(getAuthToken() ? { "Authorization": `Bearer ${getAuthToken()}` } : {}) },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Left family" });
      queryClient.invalidateQueries({ queryKey: ["my-family"] });
      navigate("/families");
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      
      const res = await fetch(`${getServerUrl()}/api/families/${id}`, {
        method: "DELETE",
        headers: { ...(getAuthToken() ? { "Authorization": `Bearer ${getAuthToken()}` } : {}) },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Family deleted" });
      queryClient.invalidateQueries({ queryKey: ["families"] });
      queryClient.invalidateQueries({ queryKey: ["my-family"] });
      navigate("/families");
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof editData) => {
      
      const res = await fetch(`${getServerUrl()}/api/families/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(getAuthToken() ? { "Authorization": `Bearer ${getAuthToken()}` } : {}) },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Family updated" });
      setShowEditDialog(false);
      queryClient.invalidateQueries({ queryKey: ["family", id] });
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      
      const res = await fetch(`${getServerUrl()}/api/families/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(getAuthToken() ? { "Authorization": `Bearer ${getAuthToken()}` } : {}) },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
      return res.json();
    },
    onSuccess: () => {
      setMessageContent("");
      refetchMessages();
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const kickMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      
      const res = await fetch(`${getServerUrl()}/api/families/${id}/members/${memberId}`, {
        method: "DELETE",
        headers: { ...(getAuthToken() ? { "Authorization": `Bearer ${getAuthToken()}` } : {}) },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Member removed" });
      queryClient.invalidateQueries({ queryKey: ["family-members", id] });
      queryClient.invalidateQueries({ queryKey: ["family", id] });
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const promoteMemberMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      const res = await fetch(`${getServerUrl()}/api/families/${id}/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id, role }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Role updated" });
      queryClient.invalidateQueries({ queryKey: ["family-members", id] });
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const getRoleIcon = (role: string) => {
    if (role === "owner") return <Crown className="w-4 h-4 text-yellow-400" />;
    if (role === "admin") return <Shield className="w-4 h-4 text-blue-400" />;
    return <User className="w-4 h-4 text-white/50" />;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (isLoading) {
    return (
      <GuestGate>
      <Layout>
        <div className="max-w-2xl mx-auto p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-white/10 rounded" />
            <div className="h-32 bg-white/10 rounded-xl" />
            <div className="h-64 bg-white/10 rounded-xl" />
          </div>
        </div>
      </Layout>
      </GuestGate>
    );
  }

  if (!family) {
    return (
      <GuestGate>
      <Layout>
        <div className="max-w-2xl mx-auto p-4 text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-white/30" />
          <h2 className="text-xl text-white font-bold">Family not found</h2>
          <Link href="/families">
            <Button className="mt-4">Back to Families</Button>
          </Link>
        </div>
      </Layout>
      </GuestGate>
    );
  }

  return (
    <GuestGate>
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Link href="/families">
              <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10" data-testid="button-back">
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
            </Link>
            <h1 className="text-xl font-bold text-white">{family.name}</h1>
          </div>
          {canManage && (
            <button
              onClick={() => setShowEditDialog(true)}
              className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10"
              data-testid="button-edit-family"
            >
              <Settings className="w-5 h-5 text-white" />
            </button>
          )}
        </div>

        <div className="p-4">
          <div className="bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-2xl p-6 border border-primary/30">
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-4xl">
                {family.avatar || "👨‍👩‍👧‍👦"}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white">{family.name}</h2>
                {family.description && (
                  <p className="text-white/60 mt-1">{family.description}</p>
                )}
                <div className="flex items-center gap-4 mt-3">
                  <div className="text-center">
                    <div className="text-white font-bold">{family.memberCount}/{family.maxMembers}</div>
                    <div className="text-white/50 text-xs">Members</div>
                  </div>
                  <div className="text-center">
                    <div className="text-yellow-400 font-bold flex items-center gap-1">
                      <Trophy className="w-4 h-4" /> {formatNumber(family.totalGifts)}
                    </div>
                    <div className="text-white/50 text-xs">Total Gifts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-green-400 font-bold">{formatNumber(family.weeklyGifts)}</div>
                    <div className="text-white/50 text-xs">This Week</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4">
          <TabsList className="grid w-full grid-cols-2 bg-white/5">
            <TabsTrigger value="members" data-testid="tab-members">
              <Users className="w-4 h-4 mr-2" /> Members
            </TabsTrigger>
            <TabsTrigger value="chat" data-testid="tab-chat">
              <MessageCircle className="w-4 h-4 mr-2" /> Chat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="mt-4 space-y-2 pb-24">
            {members?.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 p-3 bg-white/5 rounded-xl"
                data-testid={`member-${member.userId}`}
              >
                <Link href={`/profile/${member.userId}`}>
                  <div className="relative">
                    <img
                      src={member.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.user.username}`}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    {member.user.isLive && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-pink-500 text-white text-[8px] font-bold px-1 rounded">
                        LIVE
                      </span>
                    )}
                  </div>
                </Link>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{member.user.username}</span>
                    {getRoleIcon(member.role)}
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 rounded">Lv {member.user.level}</span>
                  </div>
                  <div className="text-white/50 text-sm">
                    🎁 {formatNumber(member.contributedGifts)} contributed
                  </div>
                </div>
                {isOwner && member.role !== "owner" && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => promoteMemberMutation.mutate({
                        memberId: member.userId,
                        role: member.role === "admin" ? "member" : "admin"
                      })}
                      className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30"
                      title={member.role === "admin" ? "Demote to member" : "Promote to admin"}
                      data-testid={`button-promote-${member.userId}`}
                    >
                      {member.role === "admin" ? <UserMinus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => kickMemberMutation.mutate(member.userId)}
                      className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                      title="Remove member"
                      data-testid={`button-kick-${member.userId}`}
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {isAdmin && member.role === "member" && member.userId !== user?.id && (
                  <button
                    onClick={() => kickMemberMutation.mutate(member.userId)}
                    className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                    title="Remove member"
                    data-testid={`button-kick-${member.userId}`}
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </TabsContent>

          <TabsContent value="chat" className="mt-4 pb-24">
            {currentMember ? (
              <div className="flex flex-col h-[400px]">
                <div className="flex-1 overflow-y-auto space-y-3 mb-4 px-1">
                  {messages?.length === 0 ? (
                    <div className="text-center py-12 text-white/50">
                      <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages?.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex gap-2 ${msg.userId === user?.id ? "flex-row-reverse" : ""}`}
                        data-testid={`message-${msg.id}`}
                      >
                        <img
                          src={msg.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.user.username}`}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div className={`max-w-[70%] ${msg.userId === user?.id ? "text-right" : ""}`}>
                          <span className="text-white/50 text-xs">{msg.user.username}</span>
                          <div className={`p-3 rounded-2xl ${
                            msg.userId === user?.id
                              ? "bg-primary text-white rounded-tr-none"
                              : "bg-white/10 text-white rounded-tl-none"
                          }`}>
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <div className="flex gap-2">
                  <Input
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-white/5 border-white/10 text-white"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && messageContent.trim()) {
                        sendMessageMutation.mutate(messageContent.trim());
                      }
                    }}
                    data-testid="input-chat-message"
                  />
                  <Button
                    onClick={() => {
                      if (messageContent.trim()) {
                        sendMessageMutation.mutate(messageContent.trim());
                      }
                    }}
                    disabled={!messageContent.trim() || sendMessageMutation.isPending}
                    data-testid="button-send-message"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-white/50">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Join the family to participate in chat</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {currentMember && !isOwner && (
          <div className="fixed bottom-20 left-0 right-0 p-4 max-w-2xl mx-auto">
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => leaveMutation.mutate()}
              disabled={leaveMutation.isPending}
              data-testid="button-leave-family"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Leave Family
            </Button>
          </div>
        )}

        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="bg-zinc-900 border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">Edit Family</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-white/70">Family Name</Label>
                <Input
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                  data-testid="input-edit-name"
                />
              </div>
              <div>
                <Label className="text-white/70">Description</Label>
                <Textarea
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                  data-testid="input-edit-description"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-white/70">Public Family</Label>
                <Switch
                  checked={editData.isPublic}
                  onCheckedChange={(checked) => setEditData({ ...editData, isPublic: checked })}
                  data-testid="switch-edit-public"
                />
              </div>
              <div>
                <Label className="text-white/70">Minimum Level to Join</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={editData.minLevel}
                  onChange={(e) => setEditData({ ...editData, minLevel: parseInt(e.target.value) || 1 })}
                  className="bg-white/5 border-white/10 text-white"
                  data-testid="input-edit-min-level"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => updateMutation.mutate(editData)}
                  disabled={updateMutation.isPending}
                  data-testid="button-save-family"
                >
                  Save Changes
                </Button>
                {isOwner && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this family? This cannot be undone.")) {
                        deleteMutation.mutate();
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    data-testid="button-delete-family"
                  >
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
    </GuestGate>
  );
}
