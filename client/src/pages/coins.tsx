import Layout from "@/components/layout";
import { GuestGate } from "@/components/guest-gate";
import { X, Check, Sparkles, Gift, CreditCard, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
const coinPackages = [
  { coins: 3875, price: 24.99, originalPrice: 38.99, image: "\u{1F4B0}" },
  { coins: 5100, price: 29.99, originalPrice: 50.99, image: "\u{1F3C6}", tag: "Popular" },
  { coins: 8750, price: 49.99, originalPrice: 87.49, image: "\u{1F4E6}", tag: "Popular" },
  { coins: 14400, price: 79.99, originalPrice: 144.99, image: "\u{1F9F1}" },
  { coins: 18500, price: 99.99, originalPrice: 184.99, image: "\u{1F9F1}\u{1F9F1}", tag: "Hot" },
  { coins: 57000, price: 299.99, originalPrice: 569.99, image: "\u{1F4E6}\u{1F4E6}" },
];

const bestOffers = [
  { coins: 380, price: 1.99, originalPrice: 3.79, image: "\u{1F4B0}", tag: "Popular" },
  { coins: 975, price: 4.99, originalPrice: 9.74, image: "\u{1F4B0}\u{1F4B0}", tag: "Hot" },
  { coins: 2000, price: 9.99, originalPrice: 19.99, image: "\u{1F4B0}\u{1F4B0}\u{1F4B0}", tag: "Best Value" },
];

type CoinPackage = { coins: number; price: number; originalPrice: number; image: string; tag?: string };

export default function Coins() {
  const { user, login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPackage, setSelectedPackage] = useState<CoinPackage | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastPurchase, setLastPurchase] = useState<{ totalCoins: number; bonusCoins: number } | null>(null);
  const [verifyingSession, setVerifyingSession] = useState(false);

  const { data: firstPurchaseData } = useQuery({
    queryKey: ['firstPurchase', user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/coins/first-purchase/${user!.id}`);
      if (!res.ok) throw new Error("Failed to check");
      return res.json() as Promise<{ isFirstPurchase: boolean }>;
    },
    enabled: !!user?.id,
  });

  const isFirstPurchase = firstPurchaseData?.isFirstPurchase ?? false;

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && user?.id) {
        fetch(`/api/users/${user.id}`)
          .then((res) => res.ok ? res.json() : null)
          .then((data) => {
            if (data && data.coins !== user.coins) {
              login(data);
              queryClient.invalidateQueries({ queryKey: ['firstPurchase'] });
            }
          })
          .catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [user?.id, user?.coins]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (sessionId && user?.id && !verifyingSession) {
      setVerifyingSession(true);
      window.history.replaceState({}, "", "/coins");

      fetch(`/api/coins/verify-session/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user!.id }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.user) {
            login(data.user);
          }
          if (data.alreadyCredited) {
            toast({ title: "Coins already credited", description: "This payment was already processed." });
          } else if (data.purchase) {
            setLastPurchase({
              totalCoins: data.purchase.totalCoins,
              bonusCoins: data.purchase.bonusCoins || 0,
            });
            setShowSuccess(true);
            queryClient.invalidateQueries({ queryKey: ['firstPurchase'] });
            setTimeout(() => setShowSuccess(false), 4000);
          }
        })
        .catch(() => {
          toast({ title: "Verification failed", description: "We couldn't verify your payment. If charged, coins will be credited shortly.", variant: "destructive" });
        })
        .finally(() => setVerifyingSession(false));
    }
  }, [user?.id]);

  const checkoutMutation = useMutation({
    mutationFn: async (pkg: CoinPackage) => {
      const res = await fetch('/api/coins/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user!.id,
          packageCoins: pkg.coins,
          priceUsd: pkg.price,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<{ sessionId: string; url: string }>;
    },
    onSuccess: async (data) => {
      if (data.url) {
        window.open(data.url, "_blank");
        setSelectedPackage(null);
        toast({ title: "Payment opened", description: "Complete your payment in the new tab. Your coins will appear once payment is confirmed." });
      }
    },
    onError: () => {
      toast({ title: "Checkout failed", description: "Something went wrong. Please try again.", variant: "destructive" });
      setSelectedPackage(null);
    },
  });

  const handleBuy = (pkg: CoinPackage) => {
    setSelectedPackage(pkg);
  };

  const confirmPurchase = () => {
    if (selectedPackage) {
      checkoutMutation.mutate(selectedPackage);
    }
  };

  const bonusCoins = selectedPackage ? Math.floor(selectedPackage.coins * 0.5) : 0;

  const renderPackageCard = (pkg: CoinPackage, tagColor: string = "bg-pink-500") => (
    <div
      onClick={() => handleBuy(pkg)}
      className="bg-gradient-to-b from-pink-100 to-white dark:from-pink-900/20 dark:to-gray-800 rounded-2xl p-4 text-center relative border border-pink-200 dark:border-pink-800 hover:scale-105 transition-transform cursor-pointer active:scale-95"
      data-testid={`package-${pkg.coins}`}
    >
      {pkg.tag && (
        <span className={`absolute -top-2 right-2 ${tagColor} text-white text-[10px] font-bold px-2 py-0.5 rounded-full`}>
          {pkg.tag}
        </span>
      )}
      {isFirstPurchase && (
        <span className="absolute -top-2 left-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          +50%
        </span>
      )}
      <div className="flex items-center justify-center gap-1 mb-2">
        <span className="text-yellow-500">{"\u{1F4B0}"}</span>
        <span className="font-bold text-gray-900 dark:text-white">{pkg.coins.toLocaleString()}</span>
      </div>
      <div className="text-4xl mb-2">{pkg.image}</div>
      <div className="font-bold text-gray-900 dark:text-white">${pkg.price}</div>
      <div className="text-sm text-gray-400 line-through">${pkg.originalPrice}</div>
    </div>
  );

  return (
    <GuestGate>
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 bg-yellow-100 dark:bg-yellow-900/30 px-4 py-2 rounded-full">
            <span className="text-yellow-600 dark:text-yellow-400 text-lg">{"\u{1F4B0}"}</span>
            <span className="font-bold text-gray-900 dark:text-white" data-testid="text-coin-balance">{user?.coins?.toLocaleString() || 0}</span>
          </div>
          <button
            onClick={() => setLocation("/")}
            className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
            data-testid="button-close-coins"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {verifyingSession && (
          <div className="p-6 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-pink-500 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400 font-medium">Verifying your payment...</p>
          </div>
        )}

        <div className="p-4 space-y-8">
          {isFirstPurchase && (
            <section>
              <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl p-6 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-white/10 animate-pulse" />
                <div className="relative z-10">
                  <Gift className="w-8 h-8 text-white mx-auto mb-2" />
                  <p className="text-white font-bold text-xl mb-1">First Purchase Bonus!</p>
                  <p className="text-white/90">Get <span className="font-bold text-white">50% extra coins</span> on your first purchase</p>
                </div>
              </div>
            </section>
          )}

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Best Offers</h2>
            <div className="grid grid-cols-3 gap-3">
              {coinPackages.slice(0, 3).map((pkg, i) => (
                <div key={i}>{renderPackageCard(pkg)}</div>
              ))}
            </div>
          </section>

          <section>
            <div className="grid grid-cols-3 gap-3">
              {coinPackages.slice(3).map((pkg, i) => (
                <div key={i}>{renderPackageCard(pkg, "bg-orange-500")}</div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Best Offer For You</h2>
            <div className="grid grid-cols-3 gap-3">
              {bestOffers.map((pkg, i) => (
                <div key={i}>{renderPackageCard(pkg, pkg.tag === 'Popular' ? 'bg-pink-500' : pkg.tag === 'Hot' ? 'bg-orange-500' : 'bg-blue-500')}</div>
              ))}
            </div>
          </section>

          {!isFirstPurchase && (
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Best Deals</h2>
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-6 text-center">
                <Sparkles className="w-8 h-8 text-white mx-auto mb-2" />
                <p className="text-white font-bold text-xl mb-1">Keep the streak going!</p>
                <p className="text-white/90">Purchase coins to send gifts and support your favorite streamers</p>
              </div>
            </section>
          )}

          <section className="pb-4">
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-gray-500">
              <CreditCard className="w-4 h-4" />
              <span>Secure payments powered by Stripe</span>
            </div>
          </section>
        </div>
      </div>

      {selectedPackage && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => !checkoutMutation.isPending && setSelectedPackage(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-4">Confirm Purchase</h3>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4 mb-4 text-center">
              <div className="text-5xl mb-3">{selectedPackage.image}</div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-yellow-500 text-lg">{"\u{1F4B0}"}</span>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{selectedPackage.coins.toLocaleString()}</span>
              </div>
              {isFirstPurchase && (
                <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg px-3 py-1.5 mt-2 text-sm font-semibold inline-flex items-center gap-1">
                  <Gift className="w-4 h-4" />
                  +{bonusCoins.toLocaleString()} bonus coins (50% first purchase bonus)
                </div>
              )}
              <div className="mt-3 text-sm text-muted-foreground">
                Total: <span className="font-bold text-foreground">{(selectedPackage.coins + (isFirstPurchase ? bonusCoins : 0)).toLocaleString()} coins</span>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4 px-2">
              <span className="text-gray-500 dark:text-gray-400">Price</span>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">${selectedPackage.price}</span>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 mb-4 flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
              <CreditCard className="w-4 h-4 shrink-0" />
              <span>You'll be redirected to Stripe for secure payment</span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedPackage(null)}
                disabled={checkoutMutation.isPending}
                className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                data-testid="button-cancel-purchase"
              >
                Cancel
              </button>
              <button
                onClick={confirmPurchase}
                disabled={checkoutMutation.isPending}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                data-testid="button-confirm-purchase"
              >
                {checkoutMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>Pay ${selectedPackage.price}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccess && lastPurchase && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowSuccess(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center animate-in zoom-in-95">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Purchase Successful!</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-1">
              You received <span className="font-bold text-yellow-600">{lastPurchase.totalCoins.toLocaleString()}</span> coins
            </p>
            {lastPurchase.bonusCoins > 0 && (
              <p className="text-green-600 dark:text-green-400 text-sm font-semibold">
                Includes {lastPurchase.bonusCoins.toLocaleString()} bonus coins!
              </p>
            )}
          </div>
        </div>
      )}
    </Layout>
    </GuestGate>
  );
}
