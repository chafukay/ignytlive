import Layout from "@/components/layout";
import { GuestGate } from "@/components/guest-gate";
import { ChevronRight, Crown, Check, Star, Zap, Shield, Gift, MessageSquare, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";

const VIP_TIERS = [
  {
    tier: 1,
    name: "Bronze",
    price: 500,
    color: "from-amber-700 to-amber-900",
    borderColor: "border-amber-600",
    icon: "🥉",
    benefits: [
      "Bronze profile badge",
      "Exclusive chat color",
      "5% bonus on coin purchases",
      "Ad-free experience",
    ],
  },
  {
    tier: 2,
    name: "Silver",
    price: 1500,
    color: "from-gray-400 to-gray-600",
    borderColor: "border-gray-400",
    icon: "🥈",
    benefits: [
      "Silver profile badge",
      "Custom entrance effect",
      "10% bonus on coin purchases",
      "Priority customer support",
      "All Bronze benefits",
    ],
  },
  {
    tier: 3,
    name: "Gold",
    price: 5000,
    color: "from-yellow-500 to-yellow-700",
    borderColor: "border-yellow-500",
    icon: "🥇",
    benefits: [
      "Gold profile badge",
      "Animated profile frame",
      "15% bonus on coin purchases",
      "Exclusive Gold gifts",
      "Featured on leaderboard",
      "All Silver benefits",
    ],
  },
  {
    tier: 4,
    name: "Platinum",
    price: 15000,
    color: "from-cyan-400 to-cyan-600",
    borderColor: "border-cyan-400",
    icon: "💎",
    benefits: [
      "Platinum profile badge",
      "VIP entrance animation",
      "20% bonus on coin purchases",
      "Private messaging priority",
      "Custom chat bubbles",
      "Monthly diamond bonus",
      "All Gold benefits",
    ],
  },
  {
    tier: 5,
    name: "Millionaire",
    price: 50000,
    color: "from-purple-500 via-pink-500 to-red-500",
    borderColor: "border-purple-500",
    icon: "👑",
    benefits: [
      "Millionaire crown badge",
      "Legendary entrance effects",
      "25% bonus on all purchases",
      "Exclusive Millionaire gifts",
      "Personal account manager",
      "Weekly diamond bonus",
      "VIP-only events access",
      "Custom profile effects",
      "All Platinum benefits",
    ],
  },
];

export default function VIPPlans() {
  const [, setLocation] = useLocation();
  const { user, refreshUser } = useAuth();
  const currentTier = user?.vipTier || 0;
  const [selectedTier, setSelectedTier] = useState<number | null>(null);

  const upgradeMutation = useMutation({
    mutationFn: async (tier: number) => {
      const plan = VIP_TIERS.find(p => p.tier === tier);
      if (!plan) throw new Error("Invalid tier");
      
      const response = await apiRequest("POST", `/api/users/${user?.id}/upgrade-vip`, {
        tier,
        cost: plan.price,
      });
      return response.json();
    },
    onSuccess: () => {
      refreshUser();
      setSelectedTier(null);
    },
  });

  const getCurrentTierInfo = () => {
    if (currentTier === 0) return { name: "Free", icon: "🆓", color: "text-gray-400" };
    const tier = VIP_TIERS.find(t => t.tier === currentTier);
    return tier || { name: "Free", icon: "🆓", color: "text-gray-400" };
  };

  const currentTierInfo = getCurrentTierInfo();

  return (
    <GuestGate>
    <Layout>
      <div className="min-h-screen bg-background p-4 pb-24">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setLocation("/profile")} className="text-foreground">
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <h1 className="text-xl font-bold text-foreground">VIP Plans</h1>
        </div>

        <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-2xl p-6 mb-6 border border-purple-500/30">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-3xl">
              {currentTierInfo.icon}
            </div>
            <div className="flex-1">
              <p className="text-muted-foreground text-sm">Current Status</p>
              <p className="text-2xl font-bold text-foreground">{currentTierInfo.name}</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground text-sm">Your Balance</p>
              <p className="text-xl font-bold text-yellow-400">{(user?.coins || 0).toLocaleString()} 🪙</p>
            </div>
          </div>
        </div>

        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Crown className="w-5 h-5 text-yellow-400" />
          Upgrade Your Status
        </h2>

        <div className="space-y-4">
          {VIP_TIERS.map((plan) => {
            const isOwned = currentTier >= plan.tier;
            const canAfford = (user?.coins || 0) >= plan.price;
            const isUpgrade = plan.tier === currentTier + 1;

            return (
              <div
                key={plan.tier}
                className={`relative rounded-2xl border-2 overflow-hidden transition-all ${
                  isOwned
                    ? "border-green-500/50 bg-green-500/5"
                    : isUpgrade
                    ? `${plan.borderColor} bg-gradient-to-r ${plan.color} bg-opacity-10`
                    : "border-border bg-card"
                }`}
                data-testid={`vip-plan-${plan.name.toLowerCase()}`}
              >
                <div className={`bg-gradient-to-r ${plan.color} px-4 py-2 flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{plan.icon}</span>
                    <span className="text-white font-bold text-lg">{plan.name}</span>
                  </div>
                  {isOwned && (
                    <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3" /> OWNED
                    </span>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-muted-foreground text-sm">One-time upgrade</p>
                      <p className="text-2xl font-bold text-yellow-400">{plan.price.toLocaleString()} 🪙</p>
                    </div>
                    {!isOwned && (
                      <button
                        onClick={() => {
                          if (canAfford && isUpgrade) {
                            upgradeMutation.mutate(plan.tier);
                          } else if (!isUpgrade) {
                            setSelectedTier(plan.tier);
                          }
                        }}
                        disabled={!canAfford || upgradeMutation.isPending || (!isUpgrade && plan.tier > currentTier + 1)}
                        className={`px-6 py-2 rounded-full font-bold transition ${
                          !canAfford
                            ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                            : isUpgrade
                            ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-black hover:from-yellow-400 hover:to-orange-400"
                            : plan.tier > currentTier + 1
                            ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                            : "bg-primary text-primary-foreground"
                        }`}
                        data-testid={`upgrade-${plan.name.toLowerCase()}`}
                      >
                        {upgradeMutation.isPending ? "..." : !canAfford ? "Not enough coins" : isUpgrade ? "Upgrade Now" : plan.tier > currentTier + 1 ? "Unlock previous first" : "Select"}
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {plan.benefits.map((benefit, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <Check className={`w-4 h-4 ${isOwned ? "text-green-400" : "text-primary"}`} />
                        <span className={isOwned ? "text-muted-foreground" : "text-foreground"}>{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 p-4 bg-muted/30 rounded-xl border border-border">
          <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            VIP Benefits Overview
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="w-4 h-4 text-blue-400" />
              Exclusive badges
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Zap className="w-4 h-4 text-yellow-400" />
              Bonus coins
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Gift className="w-4 h-4 text-pink-400" />
              Special gifts
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MessageSquare className="w-4 h-4 text-green-400" />
              Chat perks
            </div>
          </div>
        </div>
      </div>
    </Layout>
    </GuestGate>
  );
}
