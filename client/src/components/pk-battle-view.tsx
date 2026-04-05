import { Swords, Trophy, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";

interface PKUser {
  username: string;
  avatar?: string | null;
}

interface PKOpponent {
  username: string;
  avatar: string;
  score: number;
  winStreak: number;
}

export default function PKBattleView({ streamer, currentScore, opponent, duration = 180, onBattleEnd }: { 
  streamer: PKUser; 
  currentScore: number; 
  opponent?: PKOpponent | null;
  duration?: number;
  onBattleEnd?: (winner: 'streamer' | 'opponent' | 'draw') => void;
}) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    startTimeRef.current = Date.now();
    setTimeLeft(duration);
  }, [duration]);

  useEffect(() => {
    if (!opponent) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const remaining = Math.max(0, duration - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        if (onBattleEnd) {
          if (currentScore > (opponent?.score || 0)) onBattleEnd('streamer');
          else if (currentScore < (opponent?.score || 0)) onBattleEnd('opponent');
          else onBattleEnd('draw');
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [opponent, duration, onBattleEnd, currentScore]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timerText = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  if (!opponent) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center z-0 bg-black/60">
        <Loader2 className="w-10 h-10 text-white animate-spin mb-3" />
        <p className="text-white font-semibold text-lg" data-testid="text-pk-waiting">Waiting for opponent...</p>
        <p className="text-white/60 text-sm mt-1">A challenger will appear soon</p>
      </div>
    );
  }

  const totalScore = currentScore + opponent.score;
  const myPercentage = totalScore > 0 ? (currentScore / totalScore) * 100 : 50;
  const isEnded = timeLeft <= 0;

  return (
    <div className="absolute inset-0 flex flex-col z-0 pt-20">
      <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20">
        <div className="relative">
            <div className="absolute inset-0 bg-red-600 blur-lg animate-pulse" />
            <div className="relative bg-gradient-to-b from-yellow-400 to-orange-600 w-16 h-16 rounded-full flex items-center justify-center border-4 border-white shadow-xl transform scale-110">
                <span className="font-black text-white text-2xl italic drop-shadow-md">VS</span>
            </div>
        </div>
      </div>

      <div className="absolute top-20 left-4 right-4 h-6 bg-black/50 rounded-full overflow-hidden border border-white/20 z-10 flex">
        <motion.div 
            initial={{ width: "50%" }}
            animate={{ width: `${myPercentage}%` }}
            transition={{ type: "spring", stiffness: 100 }}
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 relative"
        >
             <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white whitespace-nowrap">
                {currentScore.toLocaleString()}
             </span>
        </motion.div>
        <div className="flex-1 bg-gradient-to-l from-red-500 to-pink-500 relative">
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white whitespace-nowrap">
                {opponent.score.toLocaleString()}
            </span>
        </div>
        <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-white transform -skew-x-12 z-10" />
      </div>

      <div className={`absolute top-28 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full border border-white/10 ${isEnded ? 'bg-red-600/80' : timeLeft <= 30 ? 'bg-red-600/60 animate-pulse' : 'bg-black/60'}`}>
        <span className="font-mono font-bold text-white text-sm" data-testid="text-pk-timer">
          {isEnded ? "FINISHED" : timerText}
        </span>
      </div>

      {isEnded && (
        <div className="absolute top-36 left-1/2 -translate-x-1/2 z-20 bg-black/80 px-4 py-2 rounded-lg border border-yellow-500/50">
          <span className="text-yellow-400 font-bold text-lg" data-testid="text-pk-result">
            {currentScore > opponent.score ? `${streamer.username} Wins!` : currentScore < opponent.score ? `${opponent.username} Wins!` : "It's a Draw!"}
          </span>
        </div>
      )}

      <div className="flex-1 flex relative">
        <div className="flex-1 relative border-r-2 border-white/10">
           <img 
             src={streamer.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${streamer.username}`} 
             className="w-full h-full object-cover" 
           />
           <div className="absolute bottom-4 left-4 bg-black/40 px-2 py-1 rounded text-white text-xs">
             <span className="text-cyan-400 font-bold">{streamer.username}</span>
           </div>
        </div>
        
        <div className="flex-1 relative">
            <img src={opponent.avatar} className="w-full h-full object-cover" />
             <div className="absolute top-12 right-2 flex flex-col items-end">
                <div className="bg-black/40 px-2 py-1 rounded-lg text-white text-xs mb-1 flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-yellow-400" />
                    <span>Win Streak: {opponent.winStreak}</span>
                </div>
            </div>
             <div className="absolute bottom-4 right-4 bg-black/40 px-2 py-1 rounded text-white text-xs">
                <span className="text-red-400 font-bold">{opponent.username}</span>
             </div>
        </div>
      </div>
    </div>
  );
}
