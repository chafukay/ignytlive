import Layout from "@/components/layout";
import { Settings, Edit2, User, Wallet, Award, ChevronRight } from "lucide-react";

export default function Profile() {
  return (
    <Layout>
      <div className="p-4 pb-24 max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-xl font-bold text-white">Profile</h1>
            <Settings className="w-6 h-6 text-white" />
        </div>

        {/* Profile Header */}
        <div className="flex items-center gap-4 mb-8">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent p-1">
                <img 
                    src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" 
                    alt="Me" 
                    className="w-full h-full rounded-full bg-background object-cover"
                />
            </div>
            <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-1">Felix_Vibes</h2>
                <p className="text-white/60 text-sm mb-3">ID: 8392012 • Lv. 15</p>
                <div className="flex gap-6 text-center">
                    <div>
                        <div className="font-bold text-white">1.2k</div>
                        <div className="text-xs text-white/50">Following</div>
                    </div>
                    <div>
                        <div className="font-bold text-white">8.5k</div>
                        <div className="text-xs text-white/50">Followers</div>
                    </div>
                    <div>
                        <div className="font-bold text-white">45k</div>
                        <div className="text-xs text-white/50">Likes</div>
                    </div>
                </div>
            </div>
        </div>

        {/* Wallet Card */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-6 mb-6 border border-white/10 relative overflow-hidden">
            <div className="relative z-10 flex justify-between items-center">
                <div>
                    <p className="text-white/60 text-sm mb-1">My Balance</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-white">12,450</span>
                        <span className="text-yellow-500 font-bold">Coins</span>
                    </div>
                </div>
                <button className="bg-yellow-500 text-black font-bold px-4 py-2 rounded-full hover:scale-105 transition-transform">
                    Top Up
                </button>
            </div>
            <div className="absolute right-0 bottom-0 opacity-10">
                <Wallet className="w-32 h-32 text-white" />
            </div>
        </div>

        {/* Menu Items */}
        <div className="space-y-2">
            {[
                { icon: User, label: "Edit Profile", color: "text-blue-400" },
                { icon: Award, label: "My Level", color: "text-purple-400" },
                { icon: Wallet, label: "My Wallet", color: "text-green-400" },
                { icon: Settings, label: "Settings", color: "text-gray-400" },
            ].map((item) => (
                <div key={item.label} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 cursor-pointer transition-colors">
                    <div className={`w-10 h-10 rounded-full bg-white/5 flex items-center justify-center ${item.color}`}>
                        <item.icon className="w-5 h-5" />
                    </div>
                    <span className="flex-1 text-white font-medium">{item.label}</span>
                    <ChevronRight className="w-5 h-5 text-white/30" />
                </div>
            ))}
        </div>
      </div>
    </Layout>
  );
}
