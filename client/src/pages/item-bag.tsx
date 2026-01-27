import Layout from "@/components/layout";
import { ChevronRight, Package, Sparkles } from "lucide-react";
import { useLocation } from "wouter";

export default function ItemBag() {
  const [, setLocation] = useLocation();

  const items = [
    { id: 1, name: "Golden Frame", emoji: "🖼️", type: "frame", expiresIn: "30 days", equipped: true },
    { id: 2, name: "Fire Entrance", emoji: "🔥", type: "entrance", expiresIn: "15 days", equipped: false },
    { id: 3, name: "VIP Badge", emoji: "👑", type: "badge", expiresIn: "Permanent", equipped: true },
    { id: 4, name: "Sparkle Effect", emoji: "✨", type: "effect", expiresIn: "7 days", equipped: false },
    { id: 5, name: "Neon Glow", emoji: "💫", type: "glow", expiresIn: "3 days", equipped: false },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-background p-4">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setLocation("/profile")} className="text-white">
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <h1 className="text-xl font-bold text-white">Item Bag</h1>
        </div>

        <div className="bg-gradient-to-r from-orange-500/20 to-yellow-500/20 rounded-2xl p-4 mb-6 border border-orange-500/30">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-orange-400" />
            <div>
              <p className="text-white font-bold">{items.length} Items</p>
              <p className="text-white/50 text-sm">Frames, badges, effects & more</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {items.map((item) => (
            <div 
              key={item.id}
              className={`flex items-center gap-4 rounded-2xl p-4 border ${
                item.equipped 
                  ? 'bg-primary/10 border-primary/30' 
                  : 'bg-white/5 border-white/10'
              }`}
            >
              <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center text-3xl">
                {item.emoji}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-bold">{item.name}</h3>
                  {item.equipped && (
                    <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full">
                      Equipped
                    </span>
                  )}
                </div>
                <p className="text-white/50 text-sm capitalize">{item.type}</p>
                <p className={`text-xs ${item.expiresIn === 'Permanent' ? 'text-green-400' : 'text-yellow-400'}`}>
                  {item.expiresIn === 'Permanent' ? '∞ Permanent' : `Expires: ${item.expiresIn}`}
                </p>
              </div>
              <button className={`text-sm font-bold px-4 py-2 rounded-xl ${
                item.equipped 
                  ? 'bg-white/10 text-white/50' 
                  : 'bg-primary text-white'
              }`}>
                {item.equipped ? 'Unequip' : 'Equip'}
              </button>
            </div>
          ))}
        </div>

        {items.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/50">No items yet</p>
            <p className="text-white/30 text-sm">Visit the store to get items!</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
