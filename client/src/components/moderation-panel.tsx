import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Shield, Clock, Ban, VolumeX, UserPlus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ModerationPanelProps {
  streamId: string;
  hostId: string;
  currentUserId: string;
  onClose: () => void;
}

const SLOW_MODE_OPTIONS = [
  { value: 0, label: "Off" },
  { value: 5, label: "5s" },
  { value: 10, label: "10s" },
  { value: 30, label: "30s" },
  { value: 60, label: "1m" },
  { value: 300, label: "5m" },
];

const MUTE_DURATION_OPTIONS = [
  { value: 60, label: "1 min" },
  { value: 300, label: "5 mins" },
  { value: 600, label: "10 mins" },
  { value: 1800, label: "30 mins" },
  { value: 3600, label: "1 hour" },
];

export default function ModerationPanel({ streamId, hostId, currentUserId, onClose }: ModerationPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"settings" | "muted" | "banned" | "mods">("settings");
  const [selectedSlowMode, setSelectedSlowMode] = useState(0);

  const { data: stream } = useQuery({
    queryKey: ['stream', streamId],
    queryFn: () => api.getStream(streamId),
  });

  const { data: moderators = [] } = useQuery({
    queryKey: ['moderators', streamId],
    queryFn: () => api.getRoomModerators(streamId),
  });

  const { data: mutes = [] } = useQuery({
    queryKey: ['mutes', streamId],
    queryFn: () => api.getRoomMutes(streamId),
  });

  const { data: bans = [] } = useQuery({
    queryKey: ['bans', streamId],
    queryFn: () => api.getRoomBans(streamId),
  });

  const updateSlowModeMutation = useMutation({
    mutationFn: (seconds: number) => api.updateStreamSettings(streamId, currentUserId, { slowModeSeconds: seconds }),
    onSuccess: () => {
      toast({ title: "Slow mode updated" });
      queryClient.invalidateQueries({ queryKey: ['stream', streamId] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update slow mode", variant: "destructive" });
    },
  });

  const unmuteMutation = useMutation({
    mutationFn: (userId: string) => api.unmuteUser(streamId, userId, currentUserId),
    onSuccess: () => {
      toast({ title: "User unmuted" });
      queryClient.invalidateQueries({ queryKey: ['mutes', streamId] });
    },
  });

  const unbanMutation = useMutation({
    mutationFn: (userId: string) => api.unbanUser(streamId, userId, currentUserId),
    onSuccess: () => {
      toast({ title: "User unbanned" });
      queryClient.invalidateQueries({ queryKey: ['bans', streamId] });
    },
  });

  const removeModMutation = useMutation({
    mutationFn: (userId: string) => api.removeRoomModerator(streamId, userId, currentUserId),
    onSuccess: () => {
      toast({ title: "Moderator removed" });
      queryClient.invalidateQueries({ queryKey: ['moderators', streamId] });
    },
  });

  const isHost = currentUserId === hostId;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-gray-900 rounded-t-2xl overflow-hidden max-h-[70vh]"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-white">Moderation</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="flex border-b border-gray-700">
          {["settings", "muted", "banned", isHost ? "mods" : null].filter(Boolean).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex-1 py-2 text-sm font-medium capitalize ${
                activeTab === tab ? "text-primary border-b-2 border-primary" : "text-gray-400"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-4 overflow-y-auto max-h-[50vh]">
          {activeTab === "settings" && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-white font-medium">Slow Mode</span>
                </div>
                <p className="text-xs text-gray-400 mb-3">
                  Limit how often viewers can send messages
                </p>
                <div className="flex flex-wrap gap-2">
                  {SLOW_MODE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSelectedSlowMode(option.value);
                        updateSlowModeMutation.mutate(option.value);
                      }}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        (stream?.slowModeSeconds || 0) === option.value
                          ? "bg-primary text-white"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      }`}
                      data-testid={`slow-mode-${option.value}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {stream?.slowModeSeconds ? (
                  <p className="text-xs text-primary mt-2">
                    Slow mode is ON: {stream.slowModeSeconds}s between messages
                  </p>
                ) : null}
              </div>
            </div>
          )}

          {activeTab === "muted" && (
            <div className="space-y-2">
              {mutes.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No muted users</p>
              ) : (
                mutes.map((mute: any) => (
                  <div key={mute.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div>
                      <p className="text-white font-medium">{mute.user?.username || "Unknown"}</p>
                      <p className="text-xs text-gray-400">
                        Expires: {new Date(mute.expiresAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => unmuteMutation.mutate(mute.userId)}
                      className="text-green-400 hover:bg-green-500/20"
                    >
                      Unmute
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "banned" && (
            <div className="space-y-2">
              {bans.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No banned users</p>
              ) : (
                bans.map((ban: any) => (
                  <div key={ban.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div>
                      <p className="text-white font-medium">{ban.user?.username || "Unknown"}</p>
                      <p className="text-xs text-gray-400">
                        {ban.isPermanent ? "Permanent" : `Expires: ${new Date(ban.expiresAt).toLocaleTimeString()}`}
                      </p>
                      {ban.reason && <p className="text-xs text-gray-500 mt-1">{ban.reason}</p>}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => unbanMutation.mutate(ban.userId)}
                      className="text-green-400 hover:bg-green-500/20"
                    >
                      Unban
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "mods" && isHost && (
            <div className="space-y-2">
              {moderators.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No moderators assigned</p>
              ) : (
                moderators.map((mod: any) => (
                  <div key={mod.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-primary" />
                      <p className="text-white font-medium">{mod.user?.username || "Unknown"}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeModMutation.mutate(mod.userId)}
                      className="text-red-400 hover:bg-red-500/20"
                    >
                      Remove
                    </Button>
                  </div>
                ))
              )}
              <p className="text-xs text-gray-500 mt-4">
                Tip: Tap on a user's name in chat to add them as a moderator
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

interface UserActionMenuProps {
  streamId: string;
  targetUserId: string;
  targetUsername: string;
  hostId: string;
  currentUserId: string;
  onClose: () => void;
}

export function UserActionMenu({ streamId, targetUserId, targetUsername, hostId, currentUserId, onClose }: UserActionMenuProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showMuteOptions, setShowMuteOptions] = useState(false);

  const isHost = currentUserId === hostId;

  const { data: modInfo } = useQuery({
    queryKey: ['modInfo', streamId, currentUserId],
    queryFn: () => api.getModerationInfo(streamId, currentUserId),
  });

  const canModerate = isHost || modInfo?.isModerator;

  const muteMutation = useMutation({
    mutationFn: (duration: number) => api.muteUser(streamId, targetUserId, currentUserId, undefined, duration),
    onSuccess: () => {
      toast({ title: `${targetUsername} has been muted` });
      queryClient.invalidateQueries({ queryKey: ['mutes', streamId] });
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to mute user", variant: "destructive" });
    },
  });

  const banMutation = useMutation({
    mutationFn: () => api.banUser(streamId, targetUserId, currentUserId),
    onSuccess: () => {
      toast({ title: `${targetUsername} has been banned` });
      queryClient.invalidateQueries({ queryKey: ['bans', streamId] });
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to ban user", variant: "destructive" });
    },
  });

  const addModMutation = useMutation({
    mutationFn: () => api.addRoomModerator(streamId, targetUserId, currentUserId),
    onSuccess: () => {
      toast({ title: `${targetUsername} is now a moderator` });
      queryClient.invalidateQueries({ queryKey: ['moderators', streamId] });
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to add moderator", variant: "destructive" });
    },
  });

  if (!canModerate || targetUserId === hostId) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-64 bg-gray-900 rounded-xl overflow-hidden shadow-xl"
      >
        <div className="p-3 border-b border-gray-700 text-center">
          <p className="text-white font-medium">{targetUsername}</p>
        </div>

        {showMuteOptions ? (
          <div className="p-2">
            <p className="text-xs text-gray-400 text-center mb-2">Mute duration</p>
            {MUTE_DURATION_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => muteMutation.mutate(option.value)}
                className="w-full py-2 text-sm text-gray-300 hover:bg-gray-800 rounded"
              >
                {option.label}
              </button>
            ))}
            <button
              onClick={() => setShowMuteOptions(false)}
              className="w-full py-2 text-sm text-gray-500 hover:bg-gray-800 rounded mt-1"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="p-1">
            <button
              onClick={() => setShowMuteOptions(true)}
              className="w-full flex items-center gap-3 px-4 py-3 text-yellow-400 hover:bg-gray-800 rounded"
            >
              <VolumeX className="w-4 h-4" />
              <span>Mute</span>
            </button>
            <button
              onClick={() => banMutation.mutate()}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-gray-800 rounded"
            >
              <Ban className="w-4 h-4" />
              <span>Ban from stream</span>
            </button>
            {isHost && (
              <button
                onClick={() => addModMutation.mutate()}
                className="w-full flex items-center gap-3 px-4 py-3 text-primary hover:bg-gray-800 rounded"
              >
                <UserPlus className="w-4 h-4" />
                <span>Make Moderator</span>
              </button>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
