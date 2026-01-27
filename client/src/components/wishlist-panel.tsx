import { motion, AnimatePresence } from "framer-motion";
import { X, Gift, Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";

interface WishlistPanelProps {
  isOpen: boolean;
  onClose: () => void;
  streamerId: string;
}

export default function WishlistPanel({ isOpen, onClose, streamerId }: WishlistPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: wishlist } = useQuery({
    queryKey: ['wishlist', streamerId],
    queryFn: () => api.getWishlist(streamerId),
    enabled: isOpen,
  });

  const contributeMutation = useMutation({
    mutationFn: ({ itemId, amount }: { itemId: string; amount: number }) =>
      api.contributeToWishlist(itemId, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist', streamerId] });
      toast({ title: "Contribution sent!" });
    },
    onError: () => {
      toast({ title: "Failed to contribute", variant: "destructive" });
    },
  });

  const handleContribute = (itemId: string, amount: number) => {
    if (!user) {
      toast({ title: "Please log in", variant: "destructive" });
      return;
    }
    contributeMutation.mutate({ itemId, amount });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl p-4 z-50 max-h-[60vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            Wishlist
          </h3>
          <button onClick={onClose} data-testid="button-close-wishlist">
            <X className="w-5 h-5 text-white/50" />
          </button>
        </div>

        {wishlist && wishlist.length > 0 ? (
          <div className="space-y-3">
            {wishlist.map((item) => {
              const progress = Math.min((item.currentAmount / item.targetAmount) * 100, 100);
              return (
                <div key={item.id} className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} className="w-12 h-12 rounded-lg object-cover" alt={item.name} />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Gift className="w-6 h-6 text-primary" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h4 className="font-bold text-white">{item.name}</h4>
                      {item.description && (
                        <p className="text-xs text-white/50">{item.description}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="mb-2">
                    <div className="flex justify-between text-xs text-white/60 mb-1">
                      <span>{item.currentAmount.toLocaleString()} / {item.targetAmount.toLocaleString()}</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-pink-500 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {[100, 500, 1000].map((amount) => (
                      <button
                        key={amount}
                        onClick={() => handleContribute(item.id, amount)}
                        className="flex-1 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold text-white transition-colors"
                        data-testid={`button-contribute-${amount}`}
                      >
                        +{amount}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-white/50">
            <Gift className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No wishlist items yet</p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
