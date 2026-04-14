import Layout from "@/components/layout";
import { GuestGate } from "@/components/guest-gate";
import { X, Check, Sparkles, Gift, CreditCard, Loader2, Smartphone } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getServerUrl, isNative } from "@/lib/capacitor";
import type { NativeCoinPackage } from "@/lib/revenuecat";

interface CoinPackageAPI {
  id: number;
  coins: number;
  priceUsd: number;
  originalPriceUsd: number | null;
  discountPercent: number;
  effectivePriceCents: number;
  label: string | null;
  sortOrder: number;
}

interface DisplayPackage {
  id: number | string;
  coins: number;
  displayPrice: string;
  effectivePriceCents: number;
  priceUsd: number;
  originalPriceUsd: number | null;
  discountPercent: number;
  label: string | null;
  sortOrder: number;
  nativePackage?: NativeCoinPackage;
  apiPackage?: CoinPackageAPI;
}

function getPackageEmoji(coins: number): string {
  if (coins >= 50000) return "\u{1F4E6}\u{1F4E6}";
  if (coins >= 15000) return "\u{1F9F1}\u{1F9F1}";
  if (coins >= 10000) return "\u{1F9F1}";
  if (coins >= 5000) return "\u{1F4E6}";
  if (coins >= 3000) return "\u{1F3C6}";
  if (coins >= 1000) return "\u{1F4B0}\u{1F4B0}\u{1F4B0}";
  if (coins >= 500) return "\u{1F4B0}\u{1F4B0}";
  return "\u{1F4B0}";
}

export default function Coins() {
  const { user, login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPackage, setSelectedPackage] = useState<DisplayPackage | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastPurchase, setLastPurchase] = useState<{ totalCoins: number; bonusCoins: number } | null>(null);
  const [verifyingSession, setVerifyingSession] = useState(false);
  const [nativePurchasing, setNativePurchasing] = useState(false);

  const useNativePurchase = isNative();

  const { data: apiPackages = [], isLoading: packagesLoading } = useQuery<CoinPackageAPI[]>({
    queryKey: ['coin-packages'],
    queryFn: async () => {
      const res = await fetch(`${getServerUrl()}/api/coin-packages`);
      if (!res.ok) throw new Error("Failed to fetch packages");
      return res.json();
    },
  });

  const { data: nativeOfferings = [], isLoading: nativeLoading } = useQuery<NativeCoinPackage[]>({
    queryKey: ['native-offerings'],
    queryFn: async () => {
      const { getOfferings, isRevenueCatAvailable } = await import("@/lib/revenuecat");
      if (!isRevenueCatAvailable()) return [];
      return getOfferings();
    },
    enabled: useNativePurchase,
    retry: false,
  });

  const nativeStoreReady = useNativePurchase && nativeOfferings.length > 0;
  const nativeStoreUnavailable = useNativePurchase && !nativeLoading && nativeOfferings.length === 0;

  const displayPackages: DisplayPackage[] = (() => {
    if (nativeStoreReady) {
      return nativeOfferings
        .filter((np) => np.coins > 0)
        .map((np) => {
          const matchedApi = apiPackages.find((ap) => ap.coins === np.coins);
          return {
            id: np.identifier,
            coins: np.coins,
            displayPrice: np.localizedPriceString,
            effectivePriceCents: Math.round(np.price * 100),
            priceUsd: Math.round(np.price * 100),
            originalPriceUsd: matchedApi?.originalPriceUsd ?? null,
            discountPercent: matchedApi?.discountPercent ?? 0,
            label: matchedApi?.label ?? np.label,
            sortOrder: matchedApi?.sortOrder ?? 0,
            nativePackage: np,
            apiPackage: matchedApi,
          };
        })
        .sort((a, b) => a.sortOrder - b.sortOrder);
    }

    if (useNativePurchase) {
      return [];
    }

    return apiPackages.map((ap) => ({
      id: ap.id,
      coins: ap.coins,
      displayPrice: `$${(ap.effectivePriceCents / 100).toFixed(2)}`,
      effectivePriceCents: ap.effectivePriceCents,
      priceUsd: ap.priceUsd,
      originalPriceUsd: ap.originalPriceUsd,
      discountPercent: ap.discountPercent,
      label: ap.label,
      sortOrder: ap.sortOrder,
      apiPackage: ap,
    }));
  })();

  const { data: firstPurchaseData } = useQuery({
    queryKey: ['firstPurchase', user?.id],
    queryFn: async () => {
      const res = await fetch(`${getServerUrl()}/api/coins/first-purchase/${user!.id}`);
      if (!res.ok) throw new Error("Failed to check");
      return res.json() as Promise<{ isFirstPurchase: boolean }>;
    },
    enabled: !!user?.id,
  });

  const isFirstPurchase = firstPurchaseData?.isFirstPurchase ?? false;

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && user?.id) {
        fetch(`${getServerUrl()}/api/users/${user.id}`)
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

      fetch(`${getServerUrl()}/api/coins/verify-session/${sessionId}`, {
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
    mutationFn: async (pkg: DisplayPackage) => {
      if (!pkg.apiPackage) throw new Error("No API package for Stripe checkout");
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${getServerUrl()}/api/coins/checkout`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId: user!.id,
          packageId: pkg.apiPackage.id,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<{ sessionId: string; url: string }>;
    },
    onSuccess: async (data) => {
      if (data.url) {
        try {
          const { isNative: checkNative } = await import("@/lib/capacitor");
          if (checkNative()) {
            const { Browser } = await import("@capacitor/browser");
            await Browser.open({ url: data.url, presentationStyle: 'popover' });
          } else {
            window.open(data.url, "_blank");
          }
        } catch {
          window.open(data.url, "_blank");
        }
        setSelectedPackage(null);
        toast({ title: "Payment opened", description: "Complete your payment in the new tab. Your coins will appear once payment is confirmed." });
      }
    },
    onError: () => {
      toast({ title: "Checkout failed", description: "Something went wrong. Please try again.", variant: "destructive" });
      setSelectedPackage(null);
    },
  });

  const handleNativePurchase = async (pkg: DisplayPackage) => {
    if (!user?.id || !pkg.nativePackage) return;
    setNativePurchasing(true);

    try {
      const { isRevenueCatAvailable, purchasePackage } = await import("@/lib/revenuecat");

      if (!isRevenueCatAvailable()) {
        toast({ title: "Store not available", description: "In-app purchases are not configured yet. Please try again later.", variant: "destructive" });
        setSelectedPackage(null);
        setNativePurchasing(false);
        return;
      }

      const result = await purchasePackage(pkg.nativePackage.rcPackage);

      if (result.userCancelled) {
        setSelectedPackage(null);
        setNativePurchasing(false);
        return;
      }

      if (!result.success) {
        toast({ title: "Purchase failed", description: result.error || "Something went wrong.", variant: "destructive" });
        setSelectedPackage(null);
        setNativePurchasing(false);
        return;
      }

      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const verifyRes = await fetch(`${getServerUrl()}/api/coins/native-purchase`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId: user.id,
          productId: result.productId,
          transactionId: result.transactionId,
        }),
      });

      if (!verifyRes.ok) {
        throw new Error(await verifyRes.text());
      }

      const data = await verifyRes.json();

      if (data.user) {
        login(data.user);
      }

      if (!data.alreadyCredited && data.purchase) {
        setLastPurchase({
          totalCoins: data.purchase.totalCoins,
          bonusCoins: data.purchase.bonusCoins || 0,
        });
        setShowSuccess(true);
        queryClient.invalidateQueries({ queryKey: ['firstPurchase'] });
        setTimeout(() => setShowSuccess(false), 4000);
      } else if (data.alreadyCredited) {
        toast({ title: "Coins already credited", description: "This purchase was already processed." });
      }

      setSelectedPackage(null);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("[NativePurchase] Error:", errMsg);
      toast({ title: "Purchase failed", description: "Something went wrong. If you were charged, your coins will be credited shortly.", variant: "destructive" });
      setSelectedPackage(null);
    } finally {
      setNativePurchasing(false);
    }
  };

  const handleBuy = (pkg: DisplayPackage) => {
    setSelectedPackage(pkg);
  };

  const confirmPurchase = () => {
    if (!selectedPackage) return;

    if (useNativePurchase) {
      if (!selectedPackage.nativePackage) {
        toast({ title: "Not available", description: "This package is not available in your app store yet. Please try again later.", variant: "destructive" });
        setSelectedPackage(null);
        return;
      }
      handleNativePurchase(selectedPackage);
    } else {
      checkoutMutation.mutate(selectedPackage);
    }
  };

  const isPurchasing = checkoutMutation.isPending || nativePurchasing;

  const bonusCoins = selectedPackage ? Math.floor(selectedPackage.coins * 0.5) : 0;

  const isLoading = packagesLoading || (useNativePurchase && nativeLoading);

  const bestOffers = displayPackages.slice(0, 3);
  const mainPackages = displayPackages.slice(3, 6);
  const morePackages = displayPackages.slice(6);

  const renderPackageCard = (pkg: DisplayPackage, tagColor: string = "bg-pink-500") => {
    const showStrikethrough = pkg.originalPriceUsd || pkg.discountPercent > 0;
    const strikethroughPrice = pkg.originalPriceUsd
      ? `$${(pkg.originalPriceUsd / 100).toFixed(2)}`
      : pkg.discountPercent > 0
        ? `$${(pkg.priceUsd / 100).toFixed(2)}`
        : null;

    return (
      <div
        onClick={() => handleBuy(pkg)}
        className="bg-gradient-to-b from-pink-100 to-white dark:from-pink-900/20 dark:to-gray-800 rounded-2xl pt-5 pb-3 px-2 text-center relative border border-pink-200 dark:border-pink-800 hover:scale-105 transition-transform cursor-pointer active:scale-95 flex flex-col items-center justify-between"
        data-testid={`package-${pkg.coins}`}
      >
        <div className="absolute -top-2 left-0 right-0 flex justify-between px-1">
          <span className={`${pkg.discountPercent > 0 ? 'bg-green-500' : isFirstPurchase ? 'bg-green-500' : 'invisible'} text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap`}>
            {pkg.discountPercent > 0 ? `${pkg.discountPercent}% OFF` : '+50%'}
          </span>
          <span className={`${pkg.label ? tagColor : 'invisible'} text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap`}>
            {pkg.label || '-'}
          </span>
        </div>
        <div className="flex items-center justify-center gap-1 mb-1">
          <span className="text-yellow-500">{"\u{1F4B0}"}</span>
          <span className="font-bold text-sm text-gray-900 dark:text-white">{pkg.coins.toLocaleString()}</span>
        </div>
        <div className="text-3xl mb-1 h-10 flex items-center justify-center">{getPackageEmoji(pkg.coins)}</div>
        <div className="font-bold text-gray-900 dark:text-white text-sm">{pkg.displayPrice}</div>
        <div className="h-4">
          {showStrikethrough && strikethroughPrice ? (
            <span className="text-xs text-gray-400 line-through">{strikethroughPrice}</span>
          ) : null}
        </div>
      </div>
    );
  };

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

        {isLoading ? (
          <div className="p-6 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-pink-500 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400 font-medium">Loading packages...</p>
          </div>
        ) : nativeStoreUnavailable ? (
          <div className="p-6 text-center">
            <Smartphone className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">Store Not Available</p>
            <p className="text-gray-500 dark:text-gray-500 text-sm">In-app purchases are being set up. Please check back soon.</p>
          </div>
        ) : (
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

          {bestOffers.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-5">Best Offers</h2>
              <div className="grid grid-cols-3 gap-3 auto-rows-fr">
                {bestOffers.map((pkg) => (
                  <div key={pkg.id}>{renderPackageCard(pkg)}</div>
                ))}
              </div>
            </section>
          )}

          {mainPackages.length > 0 && (
            <section>
              <div className="grid grid-cols-3 gap-3 auto-rows-fr">
                {mainPackages.map((pkg) => (
                  <div key={pkg.id}>{renderPackageCard(pkg, "bg-orange-500")}</div>
                ))}
              </div>
            </section>
          )}

          {morePackages.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-5">Best Offer For You</h2>
              <div className="grid grid-cols-3 gap-3 auto-rows-fr">
                {morePackages.map((pkg) => (
                  <div key={pkg.id}>{renderPackageCard(pkg, pkg.label === 'Popular' ? 'bg-pink-500' : pkg.label === 'Hot' ? 'bg-orange-500' : 'bg-blue-500')}</div>
                ))}
              </div>
            </section>
          )}

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
              {useNativePurchase ? (
                <>
                  <Smartphone className="w-4 h-4" />
                  <span>Secure in-app purchases</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Secure payments powered by Stripe</span>
                </>
              )}
            </div>
          </section>
        </div>
        )}
      </div>

      {selectedPackage && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => !isPurchasing && setSelectedPackage(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-4">Confirm Purchase</h3>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4 mb-4 text-center">
              <div className="text-5xl mb-3">{getPackageEmoji(selectedPackage.coins)}</div>
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
              <div className="flex items-center gap-2">
                {selectedPackage.discountPercent > 0 && !useNativePurchase && (
                  <span className="text-sm text-gray-400 line-through">${(selectedPackage.priceUsd / 100).toFixed(2)}</span>
                )}
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{selectedPackage.displayPrice}</span>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 mb-4 flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
              {useNativePurchase && selectedPackage.nativePackage ? (
                <>
                  <Smartphone className="w-4 h-4 shrink-0" />
                  <span>Purchase through your device's app store</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 shrink-0" />
                  <span>You'll be redirected to Stripe for secure payment</span>
                </>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedPackage(null)}
                disabled={isPurchasing}
                className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                data-testid="button-cancel-purchase"
              >
                Cancel
              </button>
              <button
                onClick={confirmPurchase}
                disabled={isPurchasing}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                data-testid="button-confirm-purchase"
              >
                {isPurchasing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : useNativePurchase && selectedPackage.nativePackage ? (
                  <>Buy Now</>
                ) : (
                  <>Pay {selectedPackage.displayPrice}</>
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
