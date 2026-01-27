import { useEffect, useState, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { MOCK_STREAMERS, MOCK_COMMENTS } from "@/lib/mock-data";
import { X, Heart, Gift, Send, Share2, Swords, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import PKBattleView from "@/components/pk-battle-view";

interface Comment {
  id: number;
  user: string;
  text: string;
  color?: string;
  isGift?: boolean;
  gift?: string;
}

export default function LiveRoom() {
  const [, params] = useRoute("/live/:id");
  const [, setLocation] = useLocation();
  const streamer = MOCK_STREAMERS.find(s => s.id === params?.id) || MOCK_STREAMERS[0];
  
  const [comments, setComments] = useState<Comment[]>(MOCK_COMMENTS);
  const [inputValue, setInputValue] = useState("");
  const [likes, setLikes] = useState(0);
  const [showGiftMenu, setShowGiftMenu] = useState(false);
  const [isPKMode, setIsPKMode] = useState(false);
  const [pkScore, setPkScore] = useState(15000);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Simulate incoming comments
  useEffect(() => {
    const interval = setInterval(() => {
      const randomComment = MOCK_COMMENTS[Math.floor(Math.random() * MOCK_COMMENTS.length)];
      setComments(prev => [...prev.slice(-20), { ...randomComment, id: Date.now() }]);
      
      // Simulate PK Score updates
      if (isPKMode) {
        setPkScore(prev => prev + Math.floor(Math.random() * 100));
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [isPKMode]);

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    setComments(prev => [...prev, { id: Date.now(), user: 'Me', text: inputValue, color: 'text-white' }]);
    setInputValue("");
  };

  const handleLike = () => {
    setLikes(prev => prev + 1);
    // Add floating heart animation logic here (simplified for now)
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Background Video / PK View */}
      {isPKMode ? (
        <PKBattleView streamer={streamer} currentScore={pkScore} />
      ) : (
        <div className="absolute inset-0 z-0">
            <img 
            src={streamer.avatar} 
            alt="Stream" 
            className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/90" />
        </div>
      )}

      {/* Header */}
      <div className="relative z-10 p-4 pt-6 flex justify-between items-start">
        {/* Streamer Profile */}
        <div className="glass rounded-full p-1 pr-4 flex items-center gap-2">
          <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-primary">
            <img src={streamer.avatar} className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-xs font-bold text-white">{streamer.username}</h3>
            <span className="text-[10px] text-white/80">{streamer.viewers} viewers</span>
          </div>
          <button className="bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-full ml-1 hover:bg-primary/90 transition-colors">
            Follow
          </button>
        </div>

        {/* Viewer List & Close */}
        <div className="flex items-center gap-3">
            {/* PK Toggle Button (Demo Feature) */}
            <button 
                onClick={() => setIsPKMode(!isPKMode)}
                className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-colors",
                    isPKMode ? "bg-red-600 text-white animate-pulse" : "bg-white/10 text-white hover:bg-white/20"
                )}
            >
                <Swords className="w-3 h-3" />
                {isPKMode ? "PK LIVE" : "PK Mode"}
            </button>

          <div className="flex -space-x-2">
            {[1,2,3].map(i => (
              <div key={i} className="w-8 h-8 rounded-full border border-white/20 bg-white/10 backdrop-blur-md overflow-hidden">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} className="w-full h-full" />
              </div>
            ))}
          </div>
          <button 
            onClick={() => setLocation("/")}
            className="w-8 h-8 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area (Empty for video visibility) */}
      <div className="flex-1" onClick={handleLike}>
        {/* Floating Likes Overlay would go here */}
      </div>

      {/* Bottom Interface */}
      <div className="relative z-10 p-4 pb-6">
        {/* Chat Area */}
        <div className="h-48 overflow-y-auto no-scrollbar mb-4 mask-image-gradient">
          <div className="flex flex-col gap-2 justify-end min-h-full">
            {comments.map((msg) => (
              <div key={msg.id} className="flex items-start gap-2 animate-in slide-in-from-left-5 duration-300">
                <div className={cn(
                  "px-3 py-1.5 rounded-2xl backdrop-blur-sm text-sm max-w-[80%]",
                  msg.isGift ? "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50" : "bg-black/20"
                )}>
                  <span className="font-bold text-white/90 mr-2 opacity-75">{msg.user}:</span>
                  <span className={msg.color || "text-white"}>{msg.text}</span>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center gap-3">
          <form onSubmit={handleSend} className="flex-1 relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Say something..."
              className="w-full bg-black/40 backdrop-blur-md border border-white/10 rounded-full py-2.5 pl-4 pr-10 text-white text-sm focus:outline-none focus:border-primary/50 transition-colors placeholder:text-white/50"
            />
            <button type="submit" className="absolute right-1 top-1 p-1.5 rounded-full bg-white/10 hover:bg-primary transition-colors">
              <Send className="w-4 h-4 text-white" />
            </button>
          </form>

          <button className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all">
            <Share2 className="w-5 h-5 text-white" />
          </button>

          <button 
            onClick={() => setShowGiftMenu(!showGiftMenu)}
            className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 to-orange-500 flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg shadow-orange-500/30"
          >
            <Gift className="w-5 h-5 text-white" />
          </button>

          <button 
            onClick={handleLike}
            className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-pink-500/20 active:scale-95 transition-all"
          >
            <Heart className="w-5 h-5 text-pink-500 fill-pink-500" />
          </button>
        </div>
      </div>

      {/* Gift Sheet (Simple Overlay) */}
      <AnimatePresence>
        {showGiftMenu && (
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="absolute bottom-0 left-0 right-0 bg-[#1a1a1a] rounded-t-3xl p-4 z-50 border-t border-white/10"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-white">Send Gift</h3>
              <button onClick={() => setShowGiftMenu(false)}><X className="w-5 h-5 text-white/50" /></button>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {['🌹', '🍫', '💎', '🚀', '🏎️', '🏰', '🦄', '👑'].map((emoji, i) => (
                <button key={i} className="flex flex-col items-center gap-1 p-2 hover:bg-white/5 rounded-xl transition-colors">
                  <span className="text-3xl">{emoji}</span>
                  <span className="text-[10px] text-yellow-500 font-bold">{10 * (i + 1)} coins</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
