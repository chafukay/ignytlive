import Layout from "@/components/layout";
import { MOCK_STREAMERS } from "@/lib/mock-data";
import { MessageCircle, MoreHorizontal, Search } from "lucide-react";

export default function Chat() {
  return (
    <Layout>
      <div className="p-4 max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-display font-bold text-white">Messages</h1>
          <MoreHorizontal className="text-white/50" />
        </div>

        <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search messages" 
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-primary/50 transition-all"
            />
        </div>

        <div className="space-y-1">
            {MOCK_STREAMERS.map((user, i) => (
                <div key={user.id} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 cursor-pointer transition-colors">
                    <div className="relative">
                        <img src={user.avatar} className="w-14 h-14 rounded-full object-cover" />
                        {user.isLive && (
                            <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-background rounded-full" />
                        )}
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                            <h3 className="font-bold text-white">{user.username}</h3>
                            <span className="text-xs text-white/40">2m ago</span>
                        </div>
                        <p className="text-white/60 text-sm truncate">
                            {i % 2 === 0 ? "Thanks for the gift! 🎁" : "Are you going live today?"}
                        </p>
                    </div>
                </div>
            ))}
            {/* System Messages */}
            <div className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 cursor-pointer transition-colors">
                <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-primary" />
                </div>
                 <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                        <h3 className="font-bold text-white">Team Ignyt</h3>
                        <span className="text-xs text-white/40">1d ago</span>
                    </div>
                    <p className="text-white/60 text-sm truncate">Welcome to Ignyt Live! Here are some tips...</p>
                </div>
            </div>
        </div>
      </div>
    </Layout>
  );
}
