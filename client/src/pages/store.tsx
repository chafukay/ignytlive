import Layout from "@/components/layout";
import { GuestGate } from "@/components/guest-gate";
import { ChevronRight, ShoppingBag, Coins, Loader2, Check } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useState } from "react";
import type { StoreItem } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const itemTypeLabels: Record<string, string> = {
  frame: "Profile Frames",
  entrance: "Entrance Effects",
  badge: "Badges",
  chat_bubble: "Chat Bubbles",
  effect: "Visual Effects",
  vehicle: "Vehicles",
};

const itemTypeIcons: Record<string, string> = {
  frame: "\u{1F5BC}\u{FE0F}",
  entrance: "\u{1F680}",
  badge: "\u{1F3C5}",
  chat_bubble: "\u{1F4AC}",
  effect: "\u{2728}",
  vehicle: "\u{1F697}",
};

const itemTypes = ["frame", "entrance", "badge", "chat_bubble", "effect", "vehicle"];

const frameStyles: Record<string, { border: string; shadow: string; bg: string; inner: string }> = {
  "Golden Frame": {
    border: "border-[3px] border-yellow-400",
    shadow: "shadow-[0_0_15px_rgba(250,204,21,0.5),inset_0_0_10px_rgba(250,204,21,0.2)]",
    bg: "bg-gradient-to-br from-yellow-400/20 via-yellow-600/10 to-amber-500/20",
    inner: "ring-2 ring-yellow-300/50",
  },
  "Silver Frame": {
    border: "border-[3px] border-gray-300",
    shadow: "shadow-[0_0_15px_rgba(209,213,219,0.4),inset_0_0_10px_rgba(209,213,219,0.15)]",
    bg: "bg-gradient-to-br from-gray-300/20 via-gray-400/10 to-gray-200/20",
    inner: "ring-2 ring-gray-200/50",
  },
  "Diamond Frame": {
    border: "border-[3px] border-cyan-300",
    shadow: "shadow-[0_0_20px_rgba(103,232,249,0.5),inset_0_0_12px_rgba(103,232,249,0.2)]",
    bg: "bg-gradient-to-br from-cyan-300/20 via-blue-400/15 to-purple-400/20",
    inner: "ring-2 ring-cyan-200/60",
  },
  "Neon Frame": {
    border: "border-[3px] border-green-400",
    shadow: "shadow-[0_0_20px_rgba(74,222,128,0.6),inset_0_0_12px_rgba(74,222,128,0.2)]",
    bg: "bg-gradient-to-br from-green-400/20 via-emerald-500/10 to-teal-400/20",
    inner: "ring-2 ring-green-300/50",
  },
  "Rose Frame": {
    border: "border-[3px] border-pink-400",
    shadow: "shadow-[0_0_18px_rgba(244,114,182,0.5),inset_0_0_10px_rgba(244,114,182,0.2)]",
    bg: "bg-gradient-to-br from-pink-400/20 via-rose-500/10 to-red-400/20",
    inner: "ring-2 ring-pink-300/50",
  },
  "Royal Frame": {
    border: "border-[3px] border-purple-400",
    shadow: "shadow-[0_0_20px_rgba(192,132,252,0.5),inset_0_0_12px_rgba(192,132,252,0.2)]",
    bg: "bg-gradient-to-br from-purple-400/20 via-violet-500/10 to-indigo-400/20",
    inner: "ring-2 ring-purple-300/50",
  },
  "Flame Frame": {
    border: "border-[3px] border-orange-500",
    shadow: "shadow-[0_0_20px_rgba(249,115,22,0.5),inset_0_0_12px_rgba(249,115,22,0.2)]",
    bg: "bg-gradient-to-br from-orange-500/20 via-red-500/15 to-yellow-500/20",
    inner: "ring-2 ring-orange-400/50",
  },
};

const defaultFrameStyle = {
  border: "border-[3px] border-blue-400",
  shadow: "shadow-[0_0_15px_rgba(96,165,250,0.4)]",
  bg: "bg-gradient-to-br from-blue-400/20 via-indigo-400/10 to-blue-500/20",
  inner: "ring-2 ring-blue-300/40",
};

const entranceColors: Record<string, string> = {
  "Fire Entrance": "from-orange-500 via-red-500 to-yellow-500",
  "Lightning Entrance": "from-yellow-300 via-amber-400 to-yellow-500",
  "Sparkle Entrance": "from-purple-400 via-pink-400 to-blue-400",
  "Ice Entrance": "from-cyan-300 via-blue-300 to-teal-200",
  "Galaxy Entrance": "from-indigo-600 via-purple-600 to-pink-600",
};

const badgeColors: Record<string, { bg: string; text: string; icon: string }> = {
  "VIP Badge": { bg: "from-yellow-500 to-amber-600", text: "text-white", icon: "\u{1F451}" },
  "Heart Badge": { bg: "from-pink-500 to-red-500", text: "text-white", icon: "\u{2764}\u{FE0F}" },
  "Star Badge": { bg: "from-blue-500 to-indigo-600", text: "text-white", icon: "\u{2B50}" },
  "Diamond Badge": { bg: "from-cyan-400 to-blue-500", text: "text-white", icon: "\u{1F48E}" },
  "Flame Badge": { bg: "from-orange-500 to-red-600", text: "text-white", icon: "\u{1F525}" },
};

function ItemPreview({ item, size = "normal" }: { item: StoreItem; size?: "normal" | "small" }) {
  const dim = size === "small" ? "w-16 h-16" : "w-full aspect-square";

  if (item.type === "frame") {
    const style = frameStyles[item.name] || defaultFrameStyle;
    return (
      <div className={`${dim} rounded-xl ${style.bg} flex items-center justify-center p-3`}>
        <div className={`w-full h-full rounded-full ${style.border} ${style.shadow} ${style.inner} flex items-center justify-center overflow-hidden`}>
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-white/60 text-xs">{"\u{1F464}"}</span>
          </div>
        </div>
      </div>
    );
  }

  if (item.type === "entrance") {
    const gradient = entranceColors[item.name] || "from-blue-500 via-purple-500 to-pink-500";
    return (
      <div className={`${dim} rounded-xl bg-white/5 flex items-center justify-center overflow-hidden relative`}>
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-20`} />
        <div className="relative flex flex-col items-center gap-1">
          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
            <span className="text-lg">{item.emoji || "\u{1F680}"}</span>
          </div>
          <div className={`h-1 w-16 rounded-full bg-gradient-to-r ${gradient} opacity-60`} />
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`w-1 h-1 rounded-full bg-gradient-to-r ${gradient} opacity-${60 - i * 10}`} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (item.type === "badge") {
    const badge = badgeColors[item.name] || { bg: "from-gray-500 to-gray-600", text: "text-white", icon: "\u{1F3C5}" };
    return (
      <div className={`${dim} rounded-xl bg-white/5 flex items-center justify-center`}>
        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${badge.bg} flex items-center justify-center shadow-lg transform rotate-3`}>
          <span className="text-2xl">{badge.icon}</span>
        </div>
      </div>
    );
  }

  if (item.type === "chat_bubble") {
    const isRoyal = item.name.includes("Royal");
    const bgColor = isRoyal ? "from-purple-500/30 to-indigo-500/30 border-purple-400/50" : "from-cyan-500/30 to-blue-500/30 border-cyan-400/50";
    return (
      <div className={`${dim} rounded-xl bg-white/5 flex items-center justify-center`}>
        <div className={`relative bg-gradient-to-br ${bgColor} border rounded-2xl rounded-bl-sm px-3 py-2 max-w-[90%]`}>
          <span className="text-white text-xs font-medium">Hello!</span>
          <div className={`absolute -bottom-1 -left-0.5 w-3 h-3 bg-gradient-to-br ${bgColor} border-b border-l rounded-bl-lg ${isRoyal ? 'border-purple-400/50' : 'border-cyan-400/50'}`} />
        </div>
      </div>
    );
  }

  if (item.type === "effect") {
    const isGalaxy = item.name.includes("Galaxy");
    return (
      <div className={`${dim} rounded-xl bg-white/5 flex items-center justify-center overflow-hidden relative`}>
        {isGalaxy ? (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/50 via-purple-900/50 to-black/50" />
            {[...Array(8)].map((_, i) => (
              <div key={i} className="absolute w-1 h-1 bg-white rounded-full animate-pulse" style={{
                top: `${15 + Math.random() * 70}%`,
                left: `${15 + Math.random() * 70}%`,
                animationDelay: `${i * 0.3}s`,
              }} />
            ))}
            <span className="text-3xl relative z-10">{"\u{1F30C}"}</span>
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-green-500/10 to-blue-500/10" />
            <span className="text-3xl relative z-10">{"\u{1F308}"}</span>
          </>
        )}
      </div>
    );
  }

  if (item.type === "vehicle") {
    const isCar = item.name.includes("Car");
    return (
      <div className={`${dim} rounded-xl bg-white/5 flex items-center justify-center overflow-hidden relative`}>
        <div className={`absolute inset-0 bg-gradient-to-t ${isCar ? 'from-red-500/10 to-transparent' : 'from-blue-500/10 to-transparent'}`} />
        <span className="text-4xl relative z-10">{isCar ? "\u{1F3CE}\u{FE0F}" : "\u{1F680}"}</span>
      </div>
    );
  }

  return (
    <div className={`${dim} rounded-xl bg-white/10 flex items-center justify-center text-4xl`}>
      {item.imageUrl ? (
        <img src={item.imageUrl} alt={item.name} className="w-16 h-16 object-contain" />
      ) : (
        item.emoji || itemTypeIcons[item.type] || "\u{1F4E6}"
      )}
    </div>
  );
}

export default function Store() {
  const [, setLocation] = useLocation();
  const { user, setUser } = useAuth();
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery<StoreItem[]>({
    queryKey: ["store-items", selectedType],
    queryFn: () => api.getStoreItems(selectedType || undefined),
  });

  const { data: userItems = [] } = useQuery({
    queryKey: ["user-items", user?.id],
    queryFn: () => api.getUserItems(user!.id),
    enabled: !!user,
  });

  const ownedItemIds = new Set(userItems.map((ui: any) => ui.itemId));

  const purchaseMutation = useMutation({
    mutationFn: ({ userId, itemId }: { userId: string; itemId: string }) => 
      api.purchaseItem(userId, itemId),
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user-items", user?.id] });
      if (user) {
        try {
          const updatedUser = await api.getUser(user.id);
          setUser(updatedUser);
        } catch {}
      }
      setPurchaseSuccess(variables.itemId);
      setTimeout(() => setPurchaseSuccess(null), 2000);
    },
    onError: (error: Error) => {
      setPurchaseError(error.message || "Failed to purchase item");
      setTimeout(() => setPurchaseError(null), 3000);
    },
  });

  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [confirmItem, setConfirmItem] = useState<StoreItem | null>(null);

  const handlePurchaseClick = (item: StoreItem) => {
    if (!user) return;
    if (user.coins < item.coinCost) {
      setPurchaseError("Not enough coins!");
      setTimeout(() => setPurchaseError(null), 3000);
      return;
    }
    setConfirmItem(item);
  };

  const confirmPurchase = () => {
    if (!user || !confirmItem) return;
    purchaseMutation.mutate({ userId: user.id, itemId: confirmItem.id });
    setConfirmItem(null);
  };

  const groupedItems = itemTypes.reduce((acc, type) => {
    acc[type] = items.filter(item => item.type === type);
    return acc;
  }, {} as Record<string, StoreItem[]>);

  return (
    <GuestGate>
    <Layout>
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-lg border-b border-white/10 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setLocation("/item-bag")} className="text-white" data-testid="back-button">
                <ChevronRight className="w-6 h-6 rotate-180" />
              </button>
              <h1 className="text-xl font-bold text-white">Store</h1>
            </div>
            <div className="flex items-center gap-2 bg-yellow-500/20 px-4 py-2 rounded-full">
              <Coins className="w-5 h-5 text-yellow-400" />
              <span className="text-yellow-400 font-bold" data-testid="coin-balance">{user?.coins || 0}</span>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedType(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                selectedType === null
                  ? 'bg-primary text-white'
                  : 'bg-white/10 text-white/70'
              }`}
              data-testid="filter-all"
            >
              All
            </button>
            {itemTypes.map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                  selectedType === type
                    ? 'bg-primary text-white'
                    : 'bg-white/10 text-white/70'
                }`}
                data-testid={`filter-${type}`}
              >
                {itemTypeIcons[type]} {itemTypeLabels[type]}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          {purchaseError && (
            <div className="mb-4 bg-red-500/20 border border-red-500/50 rounded-xl p-3 text-red-400 text-sm" data-testid="purchase-error">
              {purchaseError}
            </div>
          )}
          
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-white/50" />
            </div>
          ) : selectedType ? (
            <div className="grid grid-cols-2 gap-3">
              {items.map(item => (
                <ItemCard 
                  key={item.id} 
                  item={item} 
                  onPurchase={handlePurchaseClick}
                  isPurchasing={purchaseMutation.isPending}
                  purchaseSuccess={purchaseSuccess === item.id}
                  userCoins={user?.coins || 0}
                  isOwned={ownedItemIds.has(item.id)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {itemTypes.map(type => {
                const typeItems = groupedItems[type];
                if (typeItems.length === 0) return null;
                
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-white font-bold flex items-center gap-2">
                        <span>{itemTypeIcons[type]}</span>
                        {itemTypeLabels[type]}
                      </h2>
                      <button 
                        onClick={() => setSelectedType(type)}
                        className="text-primary text-sm"
                        data-testid={`see-all-${type}`}
                      >
                        See All
                      </button>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                      {typeItems.slice(0, 4).map(item => (
                        <div key={item.id} className="flex-shrink-0 w-40">
                          <ItemCard 
                            item={item} 
                            onPurchase={handlePurchaseClick}
                            isPurchasing={purchaseMutation.isPending}
                            purchaseSuccess={purchaseSuccess === item.id}
                            userCoins={user?.coins || 0}
                            isOwned={ownedItemIds.has(item.id)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!isLoading && items.length === 0 && (
            <div className="text-center py-12">
              <ShoppingBag className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <p className="text-white/50">No items available</p>
              <p className="text-white/30 text-sm">Check back later for new items!</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!confirmItem} onOpenChange={(open) => !open && setConfirmItem(null)}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to buy this item?
            </DialogDescription>
          </DialogHeader>
          
          {confirmItem && (
            <div className="py-4">
              <div className="flex items-center gap-4 bg-white/5 rounded-xl p-4">
                <ItemPreview item={confirmItem} size="small" />
                <div className="flex-1">
                  <h3 className="text-white font-bold">{confirmItem.name}</h3>
                  <p className="text-white/50 text-sm">{confirmItem.description}</p>
                  {confirmItem.durationDays && (
                    <p className="text-yellow-400 text-xs mt-1">{confirmItem.durationDays} days</p>
                  )}
                </div>
              </div>
              
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-gray-400">Cost</span>
                <span className="text-yellow-400 flex items-center gap-1 font-bold">
                  <Coins className="w-4 h-4" />
                  {confirmItem.coinCost}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-400">Your Balance</span>
                <span className="text-white flex items-center gap-1">
                  <Coins className="w-4 h-4" />
                  {user?.coins || 0}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t border-white/10">
                <span className="text-gray-400">After Purchase</span>
                <span className="text-green-400 flex items-center gap-1 font-bold">
                  <Coins className="w-4 h-4" />
                  {(user?.coins || 0) - confirmItem.coinCost}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmItem(null)} className="border-gray-700">
              Cancel
            </Button>
            <Button 
              onClick={confirmPurchase}
              className="bg-primary hover:bg-primary/90"
              disabled={purchaseMutation.isPending}
              data-testid="confirm-purchase-button"
            >
              {purchaseMutation.isPending ? "Purchasing..." : "Confirm Purchase"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
    </GuestGate>
  );
}

function ItemCard({ 
  item, 
  onPurchase, 
  isPurchasing,
  purchaseSuccess,
  userCoins,
  isOwned
}: { 
  item: StoreItem; 
  onPurchase: (item: StoreItem) => void;
  isPurchasing: boolean;
  purchaseSuccess: boolean;
  userCoins: number;
  isOwned: boolean;
}) {
  const canAfford = userCoins >= item.coinCost;
  
  return (
    <div 
      className={`bg-white/5 rounded-2xl p-3 border h-full flex flex-col ${
        isOwned ? 'border-green-500/50 bg-green-500/5' : item.isFeatured ? 'border-primary/50' : 'border-white/10'
      }`}
      data-testid={`store-item-${item.id}`}
    >
      <div className="h-6 mb-2">
        {isOwned ? (
          <div className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full inline-block">
            Owned
          </div>
        ) : item.isFeatured && (
          <div className="bg-primary text-white text-xs px-2 py-0.5 rounded-full inline-block">
            Featured
          </div>
        )}
      </div>
      
      <div className="mb-3">
        <ItemPreview item={item} />
      </div>
      
      <h3 className="text-white font-bold text-sm truncate">{item.name}</h3>
      <p className="text-white/50 text-xs mb-2 truncate">{item.description}</p>
      
      <div className="h-5 mb-2">
        {item.durationDays && (
          <p className="text-yellow-400 text-xs">{item.durationDays} days</p>
        )}
      </div>
      
      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-1">
          <Coins className="w-4 h-4 text-yellow-400" />
          <span className="text-yellow-400 font-bold text-sm">{item.coinCost}</span>
        </div>
        
        {isOwned ? (
          <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-500/20 text-green-400">
            <Check className="w-4 h-4" />
          </span>
        ) : (
          <button
            onClick={() => onPurchase(item)}
            disabled={isPurchasing || !canAfford || purchaseSuccess}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
              purchaseSuccess
                ? 'bg-green-500 text-white'
                : canAfford
                  ? 'bg-primary text-white'
                  : 'bg-white/10 text-white/30'
            }`}
            data-testid={`buy-button-${item.id}`}
          >
            {purchaseSuccess ? (
              <Check className="w-4 h-4" />
            ) : isPurchasing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Buy'
            )}
          </button>
        )}
      </div>
    </div>
  );
}
