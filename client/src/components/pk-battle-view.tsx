import { Swords, Trophy } from "lucide-react";
import { motion } from "framer-motion";

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

const MOCK_PK_OPPONENT: PKOpponent = {
  username: "StarGamer",
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=StarGamer",
  score: 12500,
  winStreak: 3,
};

export default function PKBattleView({ streamer, currentScore }: { streamer: PKUser, currentScore: number }) {
  const opponent = MOCK_PK_OPPONENT;
  const totalScore = currentScore + opponent.score;
  const myPercentage = (currentScore / totalScore) * 100;

  return (
    <div className="absolute inset-0 flex flex-col z-0 pt-20">
      {/* VS Badge */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20">
        <div className="relative">
            <div className="absolute inset-0 bg-red-600 blur-lg animate-pulse" />
            <div className="relative bg-gradient-to-b from-yellow-400 to-orange-600 w-16 h-16 rounded-full flex items-center justify-center border-4 border-white shadow-xl transform scale-110">
                <span className="font-black text-white text-2xl italic drop-shadow-md">VS</span>
            </div>
        </div>
      </div>

      {/* Progress Bar */}
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
        {/* Center Divider */}
        <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-white transform -skew-x-12 z-10" />
      </div>

      {/* Timer */}
      <div className="absolute top-28 left-1/2 -translate-x-1/2 z-10 bg-black/60 px-3 py-1 rounded-full border border-white/10">
        <span className="font-mono font-bold text-white text-sm">02:45</span>
      </div>

      {/* Split Screen Video */}
      <div className="flex-1 flex relative">
        {/* My Stream */}
        <div className="flex-1 relative border-r-2 border-white/10">
           <img 
             src={streamer.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${streamer.username}`} 
             className="w-full h-full object-cover" 
           />
           <div className="absolute bottom-4 left-4 bg-black/40 px-2 py-1 rounded text-white text-xs">
             <span className="text-cyan-400 font-bold">{streamer.username}</span>
           </div>
        </div>
        
        {/* Opponent Stream */}
        <div className="flex-1 relative">
            <img src={opponent.avatar} className="w-full h-full object-cover" />
             {/* Opponent Info Overlay */}
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
      
      {/* Punishment Text */}
      <div className="absolute bottom-1/2 translate-y-20 left-0 right-0 text-center z-10">
         <span className="text-white/60 text-xs uppercase tracking-widest font-bold bg-black/20 px-4 py-1 rounded-full backdrop-blur-sm">
            Loser Punishment: 50 Squats
         </span>
      </div>
    </div>
  );
}
