import Layout from "@/components/layout";
import { X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";

const coinPackages = [
  { coins: 3875, price: 24.99, originalPrice: 38.99, image: "💰" },
  { coins: 5100, price: 29.99, originalPrice: 50.99, image: "🏆", tag: "Popular" },
  { coins: 8750, price: 49.99, originalPrice: 87.49, image: "📦", tag: "Popular" },
  { coins: 14400, price: 79.99, originalPrice: 144.99, image: "🧱" },
  { coins: 18500, price: 99.99, originalPrice: 184.99, image: "🧱🧱", tag: "Hot" },
  { coins: 57000, price: 299.99, originalPrice: 569.99, image: "📦📦" },
];

const bestOffers = [
  { coins: 380, price: 1.99, originalPrice: 3.79, image: "💰", tag: "Popular" },
  { coins: 975, price: 4.99, originalPrice: 9.74, image: "💰💰", tag: "Hot" },
  { coins: 2000, price: 9.99, originalPrice: 19.99, image: "💰💰💰", tag: "Best Value" },
];

export default function Coins() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white dark:from-gray-900 dark:to-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 bg-yellow-100 dark:bg-yellow-900/30 px-4 py-2 rounded-full">
            <span className="text-yellow-600 dark:text-yellow-400 text-lg">💰</span>
            <span className="font-bold text-gray-900 dark:text-white">{user?.coins?.toLocaleString() || 0}</span>
          </div>
          <button 
            onClick={() => setLocation("/")}
            className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        <div className="p-4 space-y-8">
          {/* Best Offers */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Best Offers</h2>
            <div className="grid grid-cols-3 gap-3">
              {coinPackages.slice(0, 3).map((pkg, i) => (
                <div 
                  key={i}
                  className="bg-gradient-to-b from-pink-100 to-white dark:from-pink-900/20 dark:to-gray-800 rounded-2xl p-4 text-center relative border border-pink-200 dark:border-pink-800 hover:scale-105 transition-transform cursor-pointer"
                >
                  {pkg.tag && (
                    <span className="absolute -top-2 right-2 bg-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {pkg.tag}
                    </span>
                  )}
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <span className="text-yellow-500">💰</span>
                    <span className="font-bold text-gray-900 dark:text-white">{pkg.coins.toLocaleString()}</span>
                  </div>
                  <div className="text-4xl mb-2">{pkg.image}</div>
                  <div className="font-bold text-gray-900 dark:text-white">${pkg.price}</div>
                  <div className="text-sm text-gray-400 line-through">${pkg.originalPrice}</div>
                </div>
              ))}
            </div>
          </section>

          {/* More Packages */}
          <section>
            <div className="grid grid-cols-3 gap-3">
              {coinPackages.slice(3).map((pkg, i) => (
                <div 
                  key={i}
                  className="bg-gradient-to-b from-pink-100 to-white dark:from-pink-900/20 dark:to-gray-800 rounded-2xl p-4 text-center relative border border-pink-200 dark:border-pink-800 hover:scale-105 transition-transform cursor-pointer"
                >
                  {pkg.tag && (
                    <span className="absolute -top-2 right-2 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {pkg.tag}
                    </span>
                  )}
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <span className="text-yellow-500">💰</span>
                    <span className="font-bold text-gray-900 dark:text-white">{pkg.coins.toLocaleString()}</span>
                  </div>
                  <div className="text-4xl mb-2">{pkg.image}</div>
                  <div className="font-bold text-gray-900 dark:text-white">${pkg.price}</div>
                  <div className="text-sm text-gray-400 line-through">${pkg.originalPrice}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Best Offer For You */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Best Offer For You</h2>
            <div className="grid grid-cols-3 gap-3">
              {bestOffers.map((pkg, i) => (
                <div 
                  key={i}
                  className="bg-gradient-to-b from-pink-100 to-white dark:from-pink-900/20 dark:to-gray-800 rounded-2xl p-4 text-center relative border border-pink-200 dark:border-pink-800 hover:scale-105 transition-transform cursor-pointer"
                >
                  <span className={`absolute -top-2 right-2 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    pkg.tag === 'Popular' ? 'bg-pink-500' :
                    pkg.tag === 'Hot' ? 'bg-orange-500' : 'bg-blue-500'
                  }`}>
                    {pkg.tag}
                  </span>
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <span className="text-yellow-500">💰</span>
                    <span className="font-bold text-gray-900 dark:text-white">{pkg.coins}</span>
                  </div>
                  <div className="text-4xl mb-2">{pkg.image}</div>
                  <div className="font-bold text-gray-900 dark:text-white">${pkg.price}</div>
                  <div className="text-sm text-gray-400 line-through">${pkg.originalPrice}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Best Deals */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Best Deals</h2>
            <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl p-6 text-center">
              <p className="text-white font-bold text-xl mb-2">First Purchase Bonus!</p>
              <p className="text-white/90">Get 50% extra coins on your first purchase</p>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}
