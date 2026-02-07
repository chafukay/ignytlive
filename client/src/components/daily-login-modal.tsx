import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { api, DailyLoginResult, DailyReward } from "@/lib/api";
import { X, Gift, Coins, Sparkles, Check } from "lucide-react";

const DEFAULT_REWARDS: DailyReward[] = [
  { day: 1, coins: 50, xpMultiplier: 1, emoji: "🎁" },
  { day: 2, coins: 75, xpMultiplier: 1, emoji: "💰" },
  { day: 3, coins: 100, xpMultiplier: 1.5, emoji: "🔥" },
  { day: 4, coins: 150, xpMultiplier: 1.5, emoji: "⭐" },
  { day: 5, coins: 200, xpMultiplier: 2, emoji: "💎" },
  { day: 6, coins: 300, xpMultiplier: 2, emoji: "👑" },
  { day: 7, coins: 500, xpMultiplier: 3, emoji: "🏆" },
];

export default function DailyLoginModal() {
  const { user, isAuthenticated, refreshUser } = useAuth();
  const [show, setShow] = useState(false);
  const [result, setResult] = useState<DailyLoginResult | null>(null);
  const [claimed, setClaimed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user || user.isGuest) return;

    const sessionKey = `daily_login_checked_${user.id}`;
    if (sessionStorage.getItem(sessionKey)) return;

    sessionStorage.setItem(sessionKey, "1");

    api.claimDailyLogin(user.id).then((res) => {
      setResult(res);
      if (res.eligible) {
        setClaimed(true);
        setShow(true);
        refreshUser();
      }
    }).catch(() => {});
  }, [isAuthenticated, user?.id]);

  if (!show || !result) return null;

  const rewards = result.rewards || DEFAULT_REWARDS;
  const currentDay = result.day || 1;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShow(false)}
          data-testid="daily-login-overlay"
        >
          <motion.div
            className="relative w-full max-w-sm bg-gradient-to-b from-purple-900 via-purple-800 to-indigo-900 rounded-2xl overflow-hidden shadow-2xl"
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 50 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            data-testid="daily-login-modal"
          >
            <button
              onClick={() => setShow(false)}
              className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              data-testid="close-daily-login"
            >
              <X className="w-4 h-4 text-white" />
            </button>

            <div className="text-center pt-6 pb-3 px-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 mb-3 shadow-lg"
              >
                <Gift className="w-8 h-8 text-white" />
              </motion.div>
              <h2 className="text-xl font-bold text-white" data-testid="text-daily-title">Daily Login Reward</h2>
              <p className="text-purple-200 text-sm mt-1">Day {currentDay} of 7</p>
            </div>

            <div className="grid grid-cols-7 gap-1.5 px-4 pb-3">
              {rewards.map((reward, i) => {
                const dayNum = i + 1;
                const isCurrentDay = dayNum === currentDay;
                const isPast = dayNum < currentDay;

                return (
                  <motion.div
                    key={dayNum}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.05 }}
                    className={`relative flex flex-col items-center rounded-xl p-1.5 transition-all ${
                      isCurrentDay
                        ? "bg-gradient-to-b from-yellow-400/30 to-orange-500/30 ring-2 ring-yellow-400 shadow-lg shadow-yellow-400/20"
                        : isPast
                          ? "bg-white/10"
                          : "bg-white/5"
                    }`}
                    data-testid={`reward-day-${dayNum}`}
                  >
                    <span className="text-[10px] text-purple-200 font-medium">D{dayNum}</span>
                    <span className="text-lg my-0.5">{reward.emoji}</span>
                    <span className="text-[9px] text-yellow-300 font-bold">{reward.coins}</span>
                    {isPast && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl">
                        <Check className="w-4 h-4 text-green-400" />
                      </div>
                    )}
                    {isCurrentDay && claimed && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.5, type: "spring" }}
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center"
                      >
                        <Check className="w-2.5 h-2.5 text-white" />
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {claimed && result.eligible && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mx-4 mb-4 p-3 rounded-xl bg-white/10 backdrop-blur-sm"
              >
                <p className="text-center text-white font-semibold mb-2" data-testid="text-reward-claimed">Today's Reward Claimed!</p>
                <div className="flex items-center justify-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-yellow-400" />
                    <span className="text-yellow-300 font-bold" data-testid="text-coins-awarded">+{result.coinsAwarded}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    <span className="text-blue-300 font-bold" data-testid="text-xp-awarded">+{result.xpAwarded} XP</span>
                  </div>
                </div>
                {rewards[currentDay - 1]?.xpMultiplier > 1 && (
                  <p className="text-center text-purple-200 text-xs mt-1">
                    {rewards[currentDay - 1].xpMultiplier}x XP Bonus!
                  </p>
                )}
              </motion.div>
            )}

            <div className="px-4 pb-4">
              <button
                onClick={() => setShow(false)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold text-sm hover:from-yellow-500 hover:to-orange-600 transition-all shadow-lg"
                data-testid="button-collect-daily"
              >
                {claimed ? "Awesome!" : "Close"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
