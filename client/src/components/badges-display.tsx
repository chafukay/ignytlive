import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift } from "lucide-react";

interface BadgesDisplayProps {
  userId: string;
  size?: "sm" | "md" | "lg";
  allowGifting?: boolean;
}

export default function BadgesDisplay({ userId, size = "md", allowGifting = false }: BadgesDisplayProps) {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const [selectedBadge, setSelectedBadge] = useState<{ id: string; name: string; icon: string; coinCost: number } | null>(null);

  const { data: badges } = useQuery({
    queryKey: ['user-badges', userId],
    queryFn: () => api.getUserBadges(userId),
    enabled: !!userId,
  });

  const giftBadgeMutation = useMutation({
    mutationFn: async (badgeId: string) => {
      if (!user) throw new Error("Not logged in");
      const badge = badges?.find(b => b.badge.id === badgeId);
      const cost = badge?.badge.coinCost || 500;
      if (user.coins < cost) throw new Error("Not enough coins");
      
      await api.awardBadge(userId, badgeId);
      return cost;
    },
    onSuccess: (cost) => {
      if (user) {
        setUser({ ...user, coins: user.coins - cost });
      }
      toast({ title: "Badge gifted!", description: `You gifted ${selectedBadge?.name} to this user` });
      setSelectedBadge(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to gift badge", description: error.message, variant: "destructive" });
    },
  });

  if (!badges || badges.length === 0) return null;

  const sizeClasses = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-2xl",
  };

  const handleBadgeClick = (badge: { id: string; name: string; icon: string; coinCost: number }) => {
    if (allowGifting && user && user.id !== userId) {
      setSelectedBadge(badge);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1 flex-wrap" data-testid="badges-display">
        {badges.slice(0, 5).map((ub) => (
          <span
            key={ub.id}
            onClick={() => handleBadgeClick({ 
              id: ub.badge.id, 
              name: ub.badge.name, 
              icon: ub.badge.icon,
              coinCost: ub.badge.coinCost || 500
            })}
            className={`${sizeClasses[size]} ${allowGifting && user && user.id !== userId ? 'cursor-pointer hover:scale-125 transition-transform' : 'cursor-default'}`}
            title={`${ub.badge.name}: ${ub.badge.description || ''}`}
            data-testid={`badge-${ub.badge.id}`}
          >
            {ub.badge.icon}
          </span>
        ))}
        {badges.length > 5 && (
          <span className="text-xs text-white/50">+{badges.length - 5}</span>
        )}
      </div>

      <AnimatePresence>
        {selectedBadge && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedBadge(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-[#1a1a1a] rounded-2xl p-6 w-full max-w-sm border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">Gift Badge</h3>
                <button onClick={() => setSelectedBadge(null)} className="text-white/50 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="text-center py-6">
                <span className="text-6xl mb-4 block">{selectedBadge.icon}</span>
                <h4 className="text-white font-bold text-lg">{selectedBadge.name}</h4>
                <p className="text-yellow-400 font-bold mt-2">{selectedBadge.coinCost} coins</p>
              </div>

              <button
                onClick={() => giftBadgeMutation.mutate(selectedBadge.id)}
                disabled={giftBadgeMutation.isPending || (user?.coins || 0) < selectedBadge.coinCost}
                className="w-full py-3 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity"
                data-testid="button-gift-badge"
              >
                <Gift className="w-5 h-5" />
                {giftBadgeMutation.isPending ? "Gifting..." : "Gift This Badge"}
              </button>

              {user && user.coins < selectedBadge.coinCost && (
                <p className="text-red-400 text-sm text-center mt-2">Not enough coins</p>
              )}

              <p className="text-white/50 text-xs text-center mt-3">
                Your balance: {user?.coins?.toLocaleString() || 0} coins
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
