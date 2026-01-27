import { Settings, Camera, X } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function GoLive() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Chat");
  const [isStarting, setIsStarting] = useState(false);
  const { toast } = useToast();

  const handleGoLive = async () => {
    if (!user) {
      toast({ title: "Please log in to go live", variant: "destructive" });
      return;
    }
    
    if (!title.trim()) {
      toast({ title: "Please add a title", variant: "destructive" });
      return;
    }
    
    setIsStarting(true);
    try {
      const stream = await api.createStream({
        userId: user.id,
        title: title.trim(),
        category,
      });
      
      toast({ title: "You're now live!" });
      setLocation(`/live/${stream.id}`);
    } catch (error) {
      toast({ title: "Failed to start stream", description: "Please try again", variant: "destructive" });
      setIsStarting(false);
    }
  };

  const categories = ['Chat', 'Music', 'Gaming', 'Dance', 'Talent', 'Chill'];

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Camera Preview (Simulated) */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 to-black">
        <div className="flex items-center justify-center h-full">
          <div className="w-32 h-32 rounded-full bg-white/5 border-2 border-white/10 flex items-center justify-center animate-pulse">
            <Camera className="w-12 h-12 text-white/20" />
          </div>
        </div>
      </div>

      {/* Controls Overlay */}
      <div className="relative z-10 h-full flex flex-col justify-between p-6">
        <div className="flex justify-between items-start">
          <button 
            onClick={() => setLocation("/")} 
            className="p-2 rounded-full bg-black/20 backdrop-blur-md text-white hover:bg-white/10"
            data-testid="button-close"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="flex gap-4">
            <button className="p-2 rounded-full bg-black/20 backdrop-blur-md text-white hover:bg-white/10">
              <Camera className="w-6 h-6" />
            </button>
            <button className="p-2 rounded-full bg-black/20 backdrop-blur-md text-white hover:bg-white/10">
              <Settings className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="bg-black/40 backdrop-blur-xl rounded-3xl p-6 border border-white/10">
          <input 
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a title to your stream..." 
            className="w-full bg-transparent text-2xl font-bold text-white placeholder:text-white/30 focus:outline-none mb-6 text-center"
            data-testid="input-title"
          />
          
          {/* Category Selection */}
          <div className="mb-6">
            <p className="text-white/50 text-sm text-center mb-3">Select Category</p>
            <div className="flex flex-wrap justify-center gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    category === cat
                      ? 'bg-primary text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                  data-testid={`button-category-${cat.toLowerCase()}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex justify-center gap-4 mb-8">
            {['Beauty', 'Effects', 'Flip', 'Share'].map(action => (
              <div key={action} className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors">
                  <div className="w-6 h-6 bg-white/50 rounded-sm" />
                </div>
                <span className="text-xs text-white/70">{action}</span>
              </div>
            ))}
          </div>

          <button 
            onClick={handleGoLive}
            disabled={!title.trim() || isStarting || !user}
            className="w-full py-4 rounded-full bg-gradient-to-r from-primary to-accent text-white font-bold text-lg shadow-lg shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            data-testid="button-go-live"
          >
            {isStarting ? 'Starting...' : 'Go Live'}
          </button>
          
          {!user && (
            <p className="text-center text-white/50 text-sm mt-3">
              Please log in to start streaming
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
