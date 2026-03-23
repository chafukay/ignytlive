import Layout from "@/components/layout";
import { GuestGate } from "@/components/guest-gate";
import { ChevronRight, Package, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useState } from "react";
import type { UserItem, StoreItem } from "@shared/schema";
import ItemPreview from "@/components/item-preview";

type UserItemWithItem = UserItem & { item: StoreItem };

function formatExpiration(expiresAt: Date | null): string {
  if (!expiresAt) return "Permanent";
  const now = new Date();
  const exp = new Date(expiresAt);
  const diff = exp.getTime() - now.getTime();
  if (diff <= 0) return "Expired";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 30) return `${Math.floor(days / 30)} months`;
  if (days > 0) return `${days} days`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  return `${hours} hours`;
}

export default function ItemBag() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery<UserItemWithItem[]>({
    queryKey: ["user-items", user?.id],
    queryFn: () => api.getUserItems(user!.id),
    enabled: !!user,
  });

  const [equipError, setEquipError] = useState<string | null>(null);

  const equipMutation = useMutation({
    mutationFn: (userItemId: string) => api.equipItem(userItemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-items", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["equipped-items", user?.id] });
    },
    onError: (error: Error) => {
      setEquipError(error.message || "Failed to equip item");
      setTimeout(() => setEquipError(null), 3000);
    },
  });

  const unequipMutation = useMutation({
    mutationFn: (userItemId: string) => api.unequipItem(userItemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-items", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["equipped-items", user?.id] });
    },
    onError: (error: Error) => {
      setEquipError(error.message || "Failed to unequip item");
      setTimeout(() => setEquipError(null), 3000);
    },
  });

  const handleToggleEquip = (item: UserItemWithItem) => {
    if (item.isEquipped) {
      unequipMutation.mutate(item.id);
    } else {
      equipMutation.mutate(item.id);
    }
  };

  const activeItems = items.filter(item => {
    if (!item.expiresAt) return true;
    return new Date(item.expiresAt) > new Date();
  });

  const expiredItems = items.filter(item => {
    if (!item.expiresAt) return false;
    return new Date(item.expiresAt) <= new Date();
  });

  return (
    <GuestGate>
    <Layout>
      <div className="min-h-screen bg-background p-4">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setLocation("/profile")} className="text-white" data-testid="back-button">
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <h1 className="text-xl font-bold text-white">Item Bag</h1>
        </div>

        <div className="bg-gradient-to-r from-orange-500/20 to-yellow-500/20 rounded-2xl p-4 mb-6 border border-orange-500/30">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-orange-400" />
            <div>
              <p className="text-white font-bold" data-testid="item-count">{activeItems.length} Items{expiredItems.length > 0 ? ` · ${expiredItems.length} Expired` : ''}</p>
              <p className="text-white/50 text-sm">Frames, badges, effects & more</p>
            </div>
            <button 
              onClick={() => setLocation("/store")}
              className="ml-auto bg-primary text-white text-sm px-4 py-2 rounded-xl font-bold"
              data-testid="store-button"
            >
              Store
            </button>
          </div>
        </div>

        {equipError && (
          <div className="mb-4 bg-red-500/20 border border-red-500/50 rounded-xl p-3 text-red-400 text-sm" data-testid="equip-error">
            {equipError}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-white/50" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/50">No items yet</p>
            <p className="text-white/30 text-sm">Visit the store to get items!</p>
            <button 
              onClick={() => setLocation("/store")}
              className="mt-4 bg-primary text-white px-6 py-2 rounded-xl font-bold"
              data-testid="browse-store-button"
            >
              Browse Store
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {activeItems.map((userItem) => (
              <div 
                key={userItem.id}
                className={`flex items-center gap-4 rounded-2xl p-4 border ${
                  userItem.isEquipped 
                    ? 'bg-primary/10 border-primary/30' 
                    : 'bg-white/5 border-white/10'
                }`}
                data-testid={`item-${userItem.id}`}
              >
                <ItemPreview item={userItem.item} size="small" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-bold">{userItem.item.name}</h3>
                    {userItem.isEquipped && (
                      <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full">
                        Equipped
                      </span>
                    )}
                  </div>
                  <p className="text-white/50 text-sm capitalize">{userItem.item.type.replace("_", " ")}</p>
                  <p className={`text-xs ${!userItem.expiresAt ? 'text-green-400' : 'text-yellow-400'}`}>
                    {!userItem.expiresAt ? '∞ Permanent' : `Expires: ${formatExpiration(userItem.expiresAt)}`}
                  </p>
                </div>
                <button 
                  onClick={() => handleToggleEquip(userItem)}
                  disabled={equipMutation.isPending || unequipMutation.isPending}
                  className={`text-sm font-bold px-4 py-2 rounded-xl disabled:opacity-50 ${
                    userItem.isEquipped 
                      ? 'bg-white/10 text-white/50' 
                      : 'bg-primary text-white'
                  }`}
                  data-testid={`equip-button-${userItem.id}`}
                >
                  {userItem.isEquipped ? 'Unequip' : 'Equip'}
                </button>
              </div>
            ))}

            {expiredItems.length > 0 && (
              <>
                <div className="flex items-center gap-2 pt-4 pb-1">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-white/40 text-xs font-medium">Expired Items</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>
                {expiredItems.map((userItem) => (
                  <div 
                    key={userItem.id}
                    className="flex items-center gap-4 rounded-2xl p-4 border border-white/5 bg-white/[0.02] opacity-60"
                    data-testid={`item-expired-${userItem.id}`}
                  >
                    <ItemPreview item={userItem.item} size="small" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-white/70 font-bold">{userItem.item.name}</h3>
                        <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded-full">
                          Expired
                        </span>
                      </div>
                      <p className="text-white/30 text-sm capitalize">{userItem.item.type.replace("_", " ")}</p>
                      <p className="text-xs text-red-400">
                        Expired {formatExpiration(userItem.expiresAt)} ago
                      </p>
                    </div>
                    <button 
                      onClick={() => setLocation("/store")}
                      className="text-sm font-bold px-4 py-2 rounded-xl bg-orange-500/20 text-orange-400"
                      data-testid={`renew-button-${userItem.id}`}
                    >
                      Renew
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </Layout>
    </GuestGate>
  );
}
