import { useState } from "react";
import { Video, Phone } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

interface CallButtonProps {
  receiverId: string;
  receiverName: string;
  coinCost?: number;
}

export default function CallButton({ receiverId, receiverName, coinCost = 100 }: CallButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showConfirm, setShowConfirm] = useState(false);
  const [, setLocation] = useLocation();

  const callMutation = useMutation({
    mutationFn: () => api.requestPrivateCall(user!.id, receiverId),
    onSuccess: (data: any) => {
      setShowConfirm(false);
      if (data?.id) {
        setLocation(`/private-call/${data.id}`);
      } else {
        toast({ title: "Call request sent!", description: "Waiting for host to accept" });
      }
    },
    onError: (error: any) => {
      const msg = error.message || "Failed to request call";
      if (error.code === "HOST_UNAVAILABLE") {
        toast({ title: "Host unavailable", description: "This user is not accepting calls right now", variant: "destructive" });
      } else if (error.code === "INSUFFICIENT_FUNDS") {
        toast({ title: "Not enough coins", description: msg, variant: "destructive" });
      } else {
        toast({ title: "Call failed", description: msg, variant: "destructive" });
      }
    },
  });

  const handleCallRequest = () => {
    if (!user) {
      toast({ title: "Please log in", variant: "destructive" });
      return;
    }
    callMutation.mutate();
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="p-3 bg-green-500 rounded-full text-white hover:bg-green-600 transition-colors"
        data-testid="button-call"
      >
        <Video className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl p-6 w-full max-w-sm text-center"
            >
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Request 1-on-1 Call</h3>
              <p className="text-white/60 mb-4">
                Request a private video call with {receiverName}
              </p>
              <div className="bg-white/5 rounded-xl p-3 mb-4">
                <p className="text-yellow-500 font-bold">{coinCost} coins/min</p>
                <p className="text-xs text-white/50">Charged per minute during the call</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-3 bg-white/10 rounded-xl font-bold text-white"
                  data-testid="button-cancel-call"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCallRequest}
                  disabled={callMutation.isPending}
                  className="flex-1 py-3 bg-green-500 rounded-xl font-bold text-white disabled:opacity-50"
                  data-testid="button-confirm-call"
                >
                  {callMutation.isPending ? "Sending..." : "Request"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
