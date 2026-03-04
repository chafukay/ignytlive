import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { Phone, PhoneOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import type { User } from "@shared/schema";

interface PendingCall {
  id: string;
  viewerId: string;
  hostId: string;
  status: string;
  billingMode: string;
  ratePerMinute: number;
  sessionPrice: number;
  viewer: User;
}

export default function IncomingCallBanner() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [dismissedCallIds, setDismissedCallIds] = useState<Set<string>>(new Set());

  const { data: pendingCalls } = useQuery({
    queryKey: ['incomingCalls', user?.id],
    queryFn: () => api.getPendingPrivateCalls(user!.id),
    enabled: !!user?.id && !user?.dndEnabled,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });

  const visibleCalls = (pendingCalls || []).filter(
    (call: PendingCall) => !dismissedCallIds.has(call.id)
  );

  const handleAccept = async (call: PendingCall) => {
    try {
      await api.acceptPrivateCall(call.id, user!.id);
      queryClient.invalidateQueries({ queryKey: ['incomingCalls'] });
      setLocation(`/private-call/${call.id}`);
    } catch (e) {
      console.error("Failed to accept call:", e);
    }
  };

  const handleDecline = async (call: PendingCall) => {
    try {
      await api.declinePrivateCall(call.id, user!.id);
      setDismissedCallIds(prev => new Set(prev).add(call.id));
      queryClient.invalidateQueries({ queryKey: ['incomingCalls'] });
    } catch (e) {
      console.error("Failed to decline call:", e);
    }
  };

  if (!visibleCalls.length) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] flex flex-col gap-2 p-3 pointer-events-none">
      <AnimatePresence>
        {visibleCalls.map((call: PendingCall) => (
          <motion.div
            key={call.id}
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="pointer-events-auto bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl shadow-black/50 mx-auto w-full max-w-md"
            data-testid={`incoming-call-banner-${call.id}`}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" />
                <img
                  src={call.viewer?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${call.viewer?.username}`}
                  className="w-12 h-12 rounded-full object-cover relative z-10 border-2 border-green-500/50"
                  alt={call.viewer?.username || "Caller"}
                />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold truncate" data-testid="text-caller-name">
                  {call.viewer?.username || "Unknown"}
                </p>
                <p className="text-white/50 text-sm">
                  {call.billingMode === "per_minute"
                    ? `${call.ratePerMinute} coins/min`
                    : `${call.sessionPrice} coins/session`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDecline(call)}
                  className="w-11 h-11 rounded-full bg-red-500/20 flex items-center justify-center hover:bg-red-500/30 transition-colors"
                  data-testid={`button-decline-call-${call.id}`}
                >
                  <PhoneOff className="w-5 h-5 text-red-400" />
                </button>
                <button
                  onClick={() => handleAccept(call)}
                  className="w-11 h-11 rounded-full bg-green-500/20 flex items-center justify-center hover:bg-green-500/30 transition-colors animate-pulse"
                  data-testid={`button-accept-call-${call.id}`}
                >
                  <Phone className="w-5 h-5 text-green-400" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
