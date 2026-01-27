import Layout from "@/components/layout";
import { ChevronRight, Gift, Crown, Sparkles, Car, Heart } from "lucide-react";
import { useLocation } from "wouter";

export default function Store() {
  const [, setLocation] = useLocation();

  const storeItems = [
    { icon: "🌹", name: "Rose Bundle", price: 99, coins: 100, popular: false },
    { icon: "💎", name: "Diamond Pack", price: 499, coins: 600, popular: true },
    { icon: "🚀", name: "Rocket Set", price: 999, coins: 1500, popular: false },
    { icon: "👑", name: "Crown Collection", price: 1999, coins: 3500, popular: true },
    { icon: "🏰", name: "Castle Bundle", price: 4999, coins: 10000, popular: false },
    { icon: "🦄", name: "Unicorn Pack", price: 9999, coins: 25000, popular: false },
  ];

  const specialItems = [
    { icon: Crown, name: "VIP Badge", description: "Show your VIP status", price: 2999 },
    { icon: Sparkles, name: "Profile Glow", description: "Stand out from the crowd", price: 1499 },
    { icon: Car, name: "Entrance Effect", description: "Grand entry animation", price: 4999 },
    { icon: Heart, name: "Special Frame", description: "Exclusive profile frame", price: 999 },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-background p-4">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setLocation("/profile")} className="text-white">
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <h1 className="text-xl font-bold text-white">Store</h1>
        </div>

        <h2 className="text-white font-bold mb-4">Gift Bundles</h2>
        <div className="grid grid-cols-2 gap-3 mb-8">
          {storeItems.map((item) => (
            <div key={item.name} className="bg-white/5 rounded-2xl p-4 border border-white/10 relative">
              {item.popular && (
                <span className="absolute -top-2 -right-2 bg-pink-500 text-white text-xs px-2 py-0.5 rounded-full">
                  Popular
                </span>
              )}
              <div className="text-4xl mb-2">{item.icon}</div>
              <h3 className="text-white font-bold text-sm">{item.name}</h3>
              <p className="text-yellow-400 text-xs mb-2">{item.coins.toLocaleString()} coins</p>
              <button className="w-full bg-primary text-white text-sm font-bold py-2 rounded-xl">
                ${(item.price / 100).toFixed(2)}
              </button>
            </div>
          ))}
        </div>

        <h2 className="text-white font-bold mb-4">Special Items</h2>
        <div className="space-y-3">
          {specialItems.map((item) => (
            <div key={item.name} className="flex items-center gap-4 bg-white/5 rounded-2xl p-4 border border-white/10">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <item.icon className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold">{item.name}</h3>
                <p className="text-white/50 text-sm">{item.description}</p>
              </div>
              <button className="bg-primary text-white text-sm font-bold px-4 py-2 rounded-xl">
                ${(item.price / 100).toFixed(2)}
              </button>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
