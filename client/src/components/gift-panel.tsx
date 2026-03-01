import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { X, Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import type { Gift as GiftType } from "@shared/schema";

interface GiftPanelProps {
  receiverId: string;
  receiverName: string;
  streamId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function GiftPanel({ receiverId, receiverName, streamId, isOpen, onClose }: GiftPanelProps) {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSending, setIsSending] = useState(false);

  const { data: gifts } = useQuery({
    queryKey: ['gifts'],
    queryFn: () => api.getGifts(),
    enabled: isOpen,
  });

  const handleSendGift = async (gift: GiftType) => {
    if (!user) {
      toast({ title: "Please log in to send gifts", variant: "destructive" });
      return;
    }

    if ((user.coins || 0) < gift.coinCost) {
      toast({ title: "Not enough coins", description: "Top up to send this gift!", variant: "destructive" });
      return;
    }

    setIsSending(true);
    try {
      await api.sendGift({
        giftId: gift.id,
        senderId: user.id,
        receiverId,
        streamId,
        quantity: 1,
        totalCoins: gift.coinCost,
      });

      setUser({
        ...user,
        coins: (user.coins || 0) - gift.coinCost
      });

      queryClient.invalidateQueries({ queryKey: ['user', user.id] });
      queryClient.invalidateQueries({ queryKey: ['user', receiverId] });

      toast({ title: `Sent ${gift.emoji} ${gift.name} to ${receiverName}!` });
      onClose();
    } catch (error) {
      toast({ title: "Failed to send gift", description: "Please try again", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[90]"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-[#1a1a1a] rounded-t-3xl p-4 z-[91] border-t border-white/10 max-h-[60vh] overflow-y-auto"
            data-testid="gift-panel"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Gift className="w-5 h-5 text-yellow-400" />
                Send Gift to {receiverName}
              </h3>
              <button onClick={onClose} data-testid="button-close-gift-panel">
                <X className="w-5 h-5 text-white/50" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {gifts?.map((gift) => (
                <button
                  key={gift.id}
                  onClick={() => handleSendGift(gift)}
                  disabled={isSending}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-xl transition-colors",
                    isSending ? "opacity-50 cursor-not-allowed" : "hover:bg-white/5 active:scale-95"
                  )}
                  data-testid={`gift-panel-item-${gift.id}`}
                >
                  <span className="text-3xl">{gift.emoji}</span>
                  <span className="text-[10px] text-white/70 truncate w-full text-center">{gift.name}</span>
                  <span className="text-[10px] text-yellow-500 font-bold">{gift.coinCost}</span>
                </button>
              ))}
            </div>
            {user && (
              <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                <span className="text-white/50 text-sm">Your balance:</span>
                <span className="text-yellow-500 font-bold">{user.coins?.toLocaleString() || 0} coins</span>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
