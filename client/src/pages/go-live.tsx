import Layout from "@/components/layout";
import { Settings, Mic, Video, Camera, X } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function GoLive() {
  const [, setLocation] = useLocation();
  const [title, setTitle] = useState("");

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
          <button onClick={() => setLocation("/")} className="p-2 rounded-full bg-black/20 backdrop-blur-md text-white hover:bg-white/10">
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
          />
          
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

          <button className="w-full py-4 rounded-full bg-gradient-to-r from-primary to-accent text-white font-bold text-lg shadow-lg shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all">
            Go Live
          </button>
        </div>
      </div>
    </div>
  );
}
