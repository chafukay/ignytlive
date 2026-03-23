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
import ItemPreview, { itemTypeIcons } from "@/components/item-preview";

const itemTypeLabels: Record<string, string> = {
  frame: "Profile Frames",
  entrance: "Entrance Effects",
  badge: "Badges",
  chat_bubble: "Chat Bubbles",
  effect: "Visual Effects",
  vehicle: "Vehicles",
};

const itemTypes = ["frame", "entrance", "badge", "chat_bubble", "effect", "vehicle"];

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
