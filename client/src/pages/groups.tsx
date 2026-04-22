import { GuestGate } from "@/components/guest-gate";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, MessageCircle, ArrowLeft, Send, Lock, Unlock, Image, Video, X, Crown, UserMinus, Radio, Coins } from "lucide-react";
import type { Group, GroupMessage, User } from "@shared/schema";

export default function Groups() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [selectedGroup, setSelectedGroup] = useState<(Group & { memberCount: number }) | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [message, setMessage] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [isPrivateMedia, setIsPrivateMedia] = useState(false);
  const [unlockCost, setUnlockCost] = useState(50);
  const [memberUsername, setMemberUsername] = useState("");
  const [mediaPromptType, setMediaPromptType] = useState<"image" | "video" | null>(null);
  const [mediaPromptUrl, setMediaPromptUrl] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: groups = [] } = useQuery({
    queryKey: ["userGroups", user?.id],
    queryFn: () => api.getUserGroups(user!.id),
    enabled: !!user,
  });

  const { data: groupMessages = [], refetch: refetchMessages } = useQuery({
    queryKey: ["groupMessages", selectedGroup?.id],
    queryFn: () => api.getGroupMessages(selectedGroup!.id),
    enabled: !!selectedGroup,
    refetchInterval: 3000,
  });

  const { data: groupMembers = [] } = useQuery({
    queryKey: ["groupMembers", selectedGroup?.id],
    queryFn: () => api.getGroupMembers(selectedGroup!.id),
    enabled: !!selectedGroup,
  });

  const { data: followers = [] } = useQuery({
    queryKey: ["followers", user?.id],
    queryFn: () => api.getFollowers(user!.id),
    enabled: !!user && showAddMemberDialog,
  });

  const createGroupMutation = useMutation({
    mutationFn: () => api.createGroup(newGroupName, user!.id, newGroupDescription),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userGroups"] });
      setShowCreateDialog(false);
      setNewGroupName("");
      setNewGroupDescription("");
      toast({ title: "Group created!" });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: () => api.sendGroupMessage(
      selectedGroup!.id,
      user!.id,
      message || undefined,
      mediaUrl || undefined,
      mediaType || undefined,
      isPrivateMedia,
      isPrivateMedia ? unlockCost : 0
    ),
    onSuccess: () => {
      refetchMessages();
      setMessage("");
      setMediaUrl("");
      setMediaType(null);
      setIsPrivateMedia(false);
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: (userId: string) => api.addGroupMember(selectedGroup!.id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groupMembers"] });
      toast({ title: "Member added!" });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => api.removeGroupMember(selectedGroup!.id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groupMembers"] });
      toast({ title: "Member removed" });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [groupMessages]);

  const handleSendMessage = () => {
    if (!message.trim() && !mediaUrl) return;
    sendMessageMutation.mutate();
  };

  const getGroupOwner = () => {
    return groupMembers.find(m => m.role === "owner");
  };

  if (!user) {
    return (
      <GuestGate>
      <Layout>
        <div className="flex items-center justify-center h-full">
          <p className="text-white/60">Please log in to view groups</p>
        </div>
      </Layout>
      </GuestGate>
    );
  }

  if (selectedGroup) {
    return (
      <GuestGate>
      <Layout hideNav>
        <div className="flex flex-col h-full bg-gradient-to-b from-violet-950 to-black">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedGroup(null)} data-testid="button-back-groups">
                <ArrowLeft className="w-6 h-6 text-white" />
              </button>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center">
                {selectedGroup.avatar ? (
                  <img src={selectedGroup.avatar} alt={selectedGroup.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <Users className="w-5 h-5 text-white" />
                )}
              </div>
              <div>
                <h2 className="font-bold text-white" data-testid="text-group-name">{selectedGroup.name}</h2>
                <p className="text-xs text-white/60">{selectedGroup.memberCount} members</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(`/go-live?groupId=${selectedGroup.id}`)}
                className="text-pink-400"
                data-testid="button-group-live"
              >
                <Radio className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowMembersDialog(true)}
                className="text-white/70"
                data-testid="button-view-members"
              >
                <Users className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {groupMessages.map((msg) => (
              <GroupMessageBubble
                key={msg.id}
                message={msg}
                isOwn={msg.senderId === user.id}
                currentUserId={user.id}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-white/10 space-y-2">
            {mediaUrl && (
              <div className="relative bg-white/5 rounded-lg p-2 flex items-center gap-2">
                {mediaType === "image" ? <Image className="w-4 h-4 text-cyan-400" /> : <Video className="w-4 h-4 text-pink-400" />}
                <span className="text-xs text-white/60 truncate flex-1">{mediaUrl}</span>
                <button onClick={() => { setMediaUrl(""); setMediaType(null); }}>
                  <X className="w-4 h-4 text-white/60" />
                </button>
              </div>
            )}
            
            {mediaUrl && (
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-white/70">
                  <input
                    type="checkbox"
                    checked={isPrivateMedia}
                    onChange={(e) => setIsPrivateMedia(e.target.checked)}
                    className="rounded"
                    data-testid="checkbox-private-media"
                  />
                  <Lock className="w-4 h-4" />
                  Pay to view
                </label>
                {isPrivateMedia && (
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-yellow-400" />
                    <Input
                      type="number"
                      value={unlockCost}
                      onChange={(e) => setUnlockCost(Number(e.target.value))}
                      className="w-20 h-8 text-sm bg-white/5 border-white/20"
                      data-testid="input-unlock-cost"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/60 hover:text-cyan-400"
                  onClick={() => { setMediaPromptUrl(""); setMediaPromptType("image"); }}
                  data-testid="button-add-image"
                >
                  <Image className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/60 hover:text-pink-400"
                  onClick={() => { setMediaPromptUrl(""); setMediaPromptType("video"); }}
                  data-testid="button-add-video"
                >
                  <Video className="w-5 h-5" />
                </Button>
              </div>
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-white/5 border-white/20 text-white"
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                data-testid="input-group-message"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() && !mediaUrl}
                className="bg-gradient-to-r from-pink-500 to-violet-600"
                data-testid="button-send-group-message"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
            <DialogContent className="bg-violet-950 border-white/20 max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-white">Group Members</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {groupMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                    <div className="flex items-center gap-3">
                      <img
                        src={member.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.user.username}`}
                        alt={member.user.username}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <p className="text-white font-medium flex items-center gap-1">
                          {member.user.username}
                          {member.role === "owner" && <Crown className="w-4 h-4 text-yellow-400" />}
                        </p>
                        <p className="text-xs text-white/60">{member.role}</p>
                      </div>
                    </div>
                    {getGroupOwner()?.userId === user.id && member.userId !== user.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMemberMutation.mutate(member.userId)}
                        className="text-red-400"
                        data-testid={`button-remove-member-${member.userId}`}
                      >
                        <UserMinus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              {getGroupOwner()?.userId === user.id && (
                <Button
                  onClick={() => { setShowMembersDialog(false); setShowAddMemberDialog(true); }}
                  className="w-full bg-gradient-to-r from-pink-500 to-violet-600"
                  data-testid="button-add-member"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Member
                </Button>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={showAddMemberDialog} onOpenChange={setShowAddMemberDialog}>
            <DialogContent className="bg-violet-950 border-white/20 max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-white">Add Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <p className="text-sm text-white/60">Select from your followers:</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {followers.filter(f => !groupMembers.find(m => m.userId === f.id)).map((follower) => (
                    <button
                      key={follower.id}
                      onClick={() => {
                        addMemberMutation.mutate(follower.id);
                        setShowAddMemberDialog(false);
                      }}
                      className="w-full flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition"
                      data-testid={`button-add-follower-${follower.id}`}
                    >
                      <img
                        src={follower.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${follower.username}`}
                        alt={follower.username}
                        className="w-10 h-10 rounded-full"
                      />
                      <span className="text-white">{follower.username}</span>
                    </button>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={!!mediaPromptType} onOpenChange={(open) => { if (!open) setMediaPromptType(null); }}>
            <DialogContent className="bg-violet-950 border-white/20 max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-white">
                  {mediaPromptType === "image" ? "Add image" : "Add video"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  autoFocus
                  value={mediaPromptUrl}
                  onChange={(e) => setMediaPromptUrl(e.target.value)}
                  placeholder={mediaPromptType === "image" ? "https://example.com/image.jpg" : "https://example.com/video.mp4"}
                  className="bg-white/5 border-white/20 text-white"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && mediaPromptUrl.trim() && mediaPromptType) {
                      setMediaUrl(mediaPromptUrl.trim());
                      setMediaType(mediaPromptType);
                      setMediaPromptType(null);
                    }
                  }}
                  data-testid="input-media-url"
                />
              </div>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => setMediaPromptType(null)}
                  data-testid="button-cancel-media-url"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (mediaPromptUrl.trim() && mediaPromptType) {
                      setMediaUrl(mediaPromptUrl.trim());
                      setMediaType(mediaPromptType);
                      setMediaPromptType(null);
                    }
                  }}
                  disabled={!mediaPromptUrl.trim()}
                  className="bg-gradient-to-r from-pink-500 to-violet-600"
                  data-testid="button-confirm-media-url"
                >
                  Add
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </Layout>
      </GuestGate>
    );
  }

  return (
    <GuestGate>
    <Layout>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Groups</h1>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-pink-500 to-violet-600" data-testid="button-create-group">
                <Plus className="w-4 h-4 mr-2" />
                Create
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-violet-950 border-white/20 max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-white">Create Group</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Group name"
                  className="bg-white/5 border-white/20 text-white"
                  data-testid="input-group-name"
                />
                <Textarea
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="Description (optional)"
                  className="bg-white/5 border-white/20 text-white"
                  data-testid="input-group-description"
                />
                <Button
                  onClick={() => createGroupMutation.mutate()}
                  disabled={!newGroupName.trim()}
                  className="w-full bg-gradient-to-r from-pink-500 to-violet-600"
                  data-testid="button-confirm-create-group"
                >
                  Create Group
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-white/60">
            <Users className="w-16 h-16 mb-4 opacity-50" />
            <p>No groups yet</p>
            <p className="text-sm">Create a group to chat with friends</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => (
              <motion.button
                key={group.id}
                onClick={() => setSelectedGroup(group)}
                className="w-full flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                data-testid={`button-group-${group.id}`}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center">
                  {group.avatar ? (
                    <img src={group.avatar} alt={group.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <Users className="w-6 h-6 text-white" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-bold text-white">{group.name}</h3>
                  <p className="text-sm text-white/60">{group.memberCount} members</p>
                </div>
                <MessageCircle className="w-5 h-5 text-white/40" />
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </Layout>
    </GuestGate>
  );
}

function GroupMessageBubble({ 
  message, 
  isOwn, 
  currentUserId 
}: { 
  message: GroupMessage & { sender: User }; 
  isOwn: boolean; 
  currentUserId: string;
}) {
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (message.isPrivateMedia && !isOwn) {
      api.checkMediaUnlock(currentUserId, message.id, "group")
        .then((res) => {
          setUnlocked(res.unlocked);
          setChecking(false);
        })
        .catch(() => setChecking(false));
    } else {
      setChecking(false);
      if (isOwn) setUnlocked(true);
    }
  }, [message.id, message.isPrivateMedia, isOwn, currentUserId]);

  const handleUnlock = async () => {
    try {
      await api.unlockMedia(currentUserId, message.id, "group", message.unlockCost);
      setUnlocked(true);
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      toast({ title: "Media unlocked!" });
    } catch (error) {
      toast({ title: "Not enough coins", variant: "destructive" });
    }
  };

  const showMedia = !message.isPrivateMedia || unlocked;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
    >
      <div className={`max-w-[80%] ${isOwn ? "order-1" : ""}`}>
        {!isOwn && (
          <div className="flex items-center gap-2 mb-1">
            <img
              src={message.sender.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${message.sender.username}`}
              alt={message.sender.username}
              className="w-6 h-6 rounded-full"
            />
            <span className="text-xs text-white/60">{message.sender.username}</span>
          </div>
        )}
        <div
          className={`rounded-2xl p-3 ${
            isOwn
              ? "bg-gradient-to-r from-pink-500 to-violet-600 text-white"
              : "bg-white/10 text-white"
          }`}
        >
          {message.content && <p className="text-sm">{message.content}</p>}
          
          {message.mediaUrl && (
            <div className="mt-2">
              {checking ? (
                <div className="w-full h-32 bg-black/20 rounded-lg animate-pulse" />
              ) : showMedia ? (
                message.mediaType === "video" ? (
                  <video
                    src={message.mediaUrl}
                    controls
                    playsInline
                    className="w-full rounded-lg max-h-48"
                    data-testid={`video-group-message-${message.id}`}
                  />
                ) : (
                  <img
                    src={message.mediaUrl}
                    alt="Media"
                    className="w-full rounded-lg max-h-48 object-cover"
                  />
                )
              ) : (
                <button
                  onClick={handleUnlock}
                  className="w-full h-32 bg-black/40 backdrop-blur rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-black/50 transition"
                  data-testid={`button-unlock-${message.id}`}
                >
                  <Lock className="w-8 h-8 text-white/80" />
                  <div className="flex items-center gap-1 text-white">
                    <Coins className="w-4 h-4 text-yellow-400" />
                    <span className="font-bold">{message.unlockCost}</span>
                    <span className="text-sm">to unlock</span>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
