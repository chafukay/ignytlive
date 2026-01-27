import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";

interface SpinWheelProps {
  isOpen: boolean;
  onClose: () => void;
  streamId?: string;
}

export default function SpinWheel({ isOpen, onClose, streamId }: SpinWheelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<{ emoji: string; name: string; coins: number } | null>(null);

  const { data: prizes } = useQuery({
    queryKey: ['wheel-prizes'],
    queryFn: () => api.getWheelPrizes(),
    enabled: isOpen,
  });

  const spinMutation = useMutation({
    mutationFn: () => api.spinWheel(user!.id, streamId),
    onSuccess: (data) => {
      const prizeIndex = prizes?.findIndex(p => p.id === data.prizeId) || 0;
      const segmentAngle = 360 / (prizes?.length || 7);
      const targetRotation = 360 * 5 + (360 - prizeIndex * segmentAngle - segmentAngle / 2);
      
      setRotation(targetRotation);
      
      setTimeout(() => {
        setIsSpinning(false);
        setResult({
          emoji: data.prize.emoji,
          name: data.prize.name,
          coins: data.coinsWon,
        });
        toast({ title: `You won ${data.coinsWon} coins!` });
      }, 4000);
    },
    onError: () => {
      setIsSpinning(false);
      toast({ title: "Spin failed", variant: "destructive" });
    },
  });

  const handleSpin = () => {
    if (!user || isSpinning) return;
    setIsSpinning(true);
    setResult(null);
    spinMutation.mutate();
  };

  const handleClose = () => {
    setResult(null);
    setRotation(0);
    onClose();
  };

  if (!isOpen) return null;

  const segmentAngle = 360 / (prizes?.length || 7);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card rounded-3xl p-6 w-full max-w-sm"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-display font-bold text-white">Spin & Win!</h2>
            <button onClick={handleClose} data-testid="button-close-wheel">
              <X className="w-6 h-6 text-white/50" />
            </button>
          </div>

          <div className="relative w-64 h-64 mx-auto mb-6">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
              <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-primary" />
            </div>
            
            <motion.div
              className="w-full h-full rounded-full relative overflow-hidden border-4 border-primary"
              style={{ rotate: rotation }}
              animate={{ rotate: rotation }}
              transition={{ duration: 4, ease: [0.17, 0.67, 0.12, 0.99] }}
            >
              {prizes?.map((prize, i) => (
                <div
                  key={prize.id}
                  className="absolute w-full h-full"
                  style={{
                    transform: `rotate(${i * segmentAngle}deg)`,
                    clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.tan((segmentAngle * Math.PI) / 360)}% 0%)`,
                  }}
                >
                  <div
                    className="w-full h-full flex items-start justify-center pt-4"
                    style={{ backgroundColor: prize.color }}
                  >
                    <span className="text-2xl" style={{ transform: `rotate(${segmentAngle / 2}deg)` }}>
                      {prize.emoji}
                    </span>
                  </div>
                </div>
              ))}
              
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-2xl">🎰</span>
                </div>
              </div>
            </motion.div>
          </div>

          {result ? (
            <div className="text-center mb-4">
              <p className="text-4xl mb-2">{result.emoji}</p>
              <p className="text-xl font-bold text-white">{result.name}</p>
              <p className="text-yellow-500 font-bold">+{result.coins} coins!</p>
            </div>
          ) : (
            <p className="text-center text-white/60 text-sm mb-4">
              Spin the wheel to win coins!
            </p>
          )}

          <button
            onClick={handleSpin}
            disabled={isSpinning || !user}
            className="w-full py-3 bg-gradient-to-r from-primary to-pink-500 rounded-xl font-bold text-white disabled:opacity-50"
            data-testid="button-spin"
          >
            {isSpinning ? "Spinning..." : result ? "Spin Again" : "SPIN!"}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
