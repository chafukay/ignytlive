import Layout from "@/components/layout";
import { MOCK_LEADERBOARD } from "@/lib/mock-data";
import { Trophy, Crown, Medal } from "lucide-react";
import { useState } from "react";

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('daily');

  const getRankIcon = (index: number) => {
    switch(index) {
        case 0: return <Crown className="w-6 h-6 text-yellow-400 fill-yellow-400" />;
        case 1: return <Medal className="w-6 h-6 text-gray-300 fill-gray-300" />;
        case 2: return <Medal className="w-6 h-6 text-amber-600 fill-amber-600" />;
        default: return <span className="font-bold text-white/50 w-6 text-center">{index + 1}</span>;
    }
  };

  return (
    <Layout>
      <div className="p-4 max-w-2xl mx-auto pb-24">
        <h1 className="text-3xl font-display font-bold text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
            Leaderboard
        </h1>

        {/* Tabs */}
        <div className="flex justify-center mb-8">
            <div className="bg-white/10 p-1 rounded-full flex">
                {(['daily', 'weekly'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-8 py-2 rounded-full text-sm font-bold transition-all ${
                            activeTab === tab 
                            ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg' 
                            : 'text-white/60 hover:text-white'
                        }`}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>
        </div>

        {/* Top 3 Podium */}
        <div className="flex justify-center items-end gap-4 mb-8 h-48">
            {/* 2nd Place */}
            <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full border-2 border-gray-300 relative mb-2">
                    <img src={MOCK_LEADERBOARD[activeTab][1].avatar} className="w-full h-full rounded-full object-cover" />
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gray-300 text-black text-[10px] font-bold px-2 rounded-full">2</div>
                </div>
                <div className="text-white font-bold text-sm mb-1">{MOCK_LEADERBOARD[activeTab][1].username}</div>
                <div className="text-yellow-400 text-xs font-bold">{MOCK_LEADERBOARD[activeTab][1].score.toLocaleString()}</div>
                <div className="w-16 h-24 bg-gradient-to-t from-gray-800 to-gray-700/50 rounded-t-lg mt-2" />
            </div>

            {/* 1st Place */}
             <div className="flex flex-col items-center z-10">
                <div className="relative mb-2">
                    <Crown className="w-8 h-8 text-yellow-400 fill-yellow-400 absolute -top-6 left-1/2 -translate-x-1/2 animate-bounce" />
                    <div className="w-20 h-20 rounded-full border-2 border-yellow-400 relative">
                        <img src={MOCK_LEADERBOARD[activeTab][0].avatar} className="w-full h-full rounded-full object-cover" />
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-yellow-400 text-black text-[10px] font-bold px-2 rounded-full">1</div>
                    </div>
                </div>
                <div className="text-white font-bold text-sm mb-1">{MOCK_LEADERBOARD[activeTab][0].username}</div>
                <div className="text-yellow-400 text-xs font-bold">{MOCK_LEADERBOARD[activeTab][0].score.toLocaleString()}</div>
                <div className="w-20 h-32 bg-gradient-to-t from-yellow-600/50 to-orange-500/50 rounded-t-lg mt-2 relative overflow-hidden">
                    <div className="absolute inset-0 bg-yellow-400/10 animate-pulse" />
                </div>
            </div>

            {/* 3rd Place */}
            <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full border-2 border-amber-600 relative mb-2">
                    <img src={MOCK_LEADERBOARD[activeTab][2].avatar} className="w-full h-full rounded-full object-cover" />
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-amber-600 text-black text-[10px] font-bold px-2 rounded-full">3</div>
                </div>
                <div className="text-white font-bold text-sm mb-1">{MOCK_LEADERBOARD[activeTab][2].username}</div>
                <div className="text-yellow-400 text-xs font-bold">{MOCK_LEADERBOARD[activeTab][2].score.toLocaleString()}</div>
                <div className="w-16 h-20 bg-gradient-to-t from-amber-900 to-amber-800/50 rounded-t-lg mt-2" />
            </div>
        </div>

        {/* Rest of the List */}
        <div className="bg-white/5 rounded-2xl p-2 border border-white/10">
            {[4, 5, 6, 7, 8].map((rank) => (
                <div key={rank} className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl transition-colors">
                    <span className="text-white/50 w-6 text-center font-bold">{rank}</span>
                    <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden">
                         <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${rank}`} className="w-full h-full" />
                    </div>
                    <div className="flex-1">
                        <div className="text-white font-bold">User_{9928 + rank}</div>
                        <div className="text-xs text-white/40">Lv. {20 - rank}</div>
                    </div>
                    <div className="text-yellow-500 font-bold text-sm">
                        {(50000 - (rank * 1500)).toLocaleString()}
                    </div>
                </div>
            ))}
        </div>
      </div>
    </Layout>
  );
}
