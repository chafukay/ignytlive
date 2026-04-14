import { isNative, getPlatform } from "./capacitor";

let isInitialized = false;

export async function initRevenueCat(userId?: string): Promise<void> {
  if (!isNative() || isInitialized) return;

  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");

    const platform = getPlatform();
    const apiKey =
      platform === "ios"
        ? import.meta.env.VITE_REVENUECAT_IOS_KEY
        : import.meta.env.VITE_REVENUECAT_ANDROID_KEY;

    if (!apiKey) {
      console.warn("[RevenueCat] No API key configured for platform:", platform);
      return;
    }

    await Purchases.configure({
      apiKey,
      appUserID: userId || undefined,
    });

    isInitialized = true;
    console.log("[RevenueCat] Initialized for", platform);
  } catch (e) {
    console.error("[RevenueCat] Init failed:", e);
  }
}

export async function identifyUser(userId: string): Promise<void> {
  if (!isNative() || !isInitialized) return;
  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    await Purchases.logIn({ appUserID: userId });
  } catch (e) {
    console.error("[RevenueCat] Identify failed:", e);
  }
}

export async function logoutRevenueCat(): Promise<void> {
  if (!isNative() || !isInitialized) return;
  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    await Purchases.logOut();
  } catch (e) {
    console.error("[RevenueCat] Logout failed:", e);
  }
}

export interface NativeCoinPackage {
  identifier: string;
  localizedPriceString: string;
  price: number;
  currencyCode: string;
  coins: number;
  label: string | null;
  rcPackage: any;
}

export async function getOfferings(): Promise<NativeCoinPackage[]> {
  if (!isNative() || !isInitialized) return [];

  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    const offerings = await Purchases.getOfferings();

    if (!offerings.current || !offerings.current.availablePackages) {
      console.warn("[RevenueCat] No current offering found");
      return [];
    }

    return offerings.current.availablePackages.map((pkg: any) => {
      const product = pkg.product;
      const identifier = product.identifier || "";
      const coinsMatch = identifier.match(/(\d+)_coins/);
      const coins = coinsMatch ? parseInt(coinsMatch[1]) : 0;

      return {
        identifier,
        localizedPriceString: product.priceString || `$${product.price}`,
        price: product.price || 0,
        currencyCode: product.currencyCode || "USD",
        coins,
        label: null,
        rcPackage: pkg,
      };
    });
  } catch (e) {
    console.error("[RevenueCat] Failed to get offerings:", e);
    return [];
  }
}

export interface PurchaseResult {
  success: boolean;
  transactionId?: string;
  productId?: string;
  error?: string;
  userCancelled?: boolean;
}

export async function purchasePackage(
  rcPackage: any
): Promise<PurchaseResult> {
  if (!isNative() || !isInitialized) {
    return { success: false, error: "RevenueCat not initialized" };
  }

  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    const result = await Purchases.purchasePackage({ aPackage: rcPackage });

    const targetProductId = rcPackage.product?.identifier;
    const nonSubTransactions = result.customerInfo?.nonSubscriptionTransactions || [];
    const matchingTxn = nonSubTransactions
      .filter((t: any) => t.productIdentifier === targetProductId)
      .sort((a: any, b: any) => {
        const dateA = a.purchaseDate ? new Date(a.purchaseDate).getTime() : 0;
        const dateB = b.purchaseDate ? new Date(b.purchaseDate).getTime() : 0;
        return dateB - dateA;
      })[0];

    const transactionId = matchingTxn?.transactionIdentifier;
    if (!transactionId) {
      console.error("[RevenueCat] Purchase succeeded but no transaction ID found");
      return { success: false, error: "Purchase completed but verification failed. Contact support." };
    }

    return {
      success: true,
      transactionId,
      productId: targetProductId,
    };
  } catch (e: any) {
    if (e?.code === "1" || e?.userCancelled || e?.message?.includes("cancelled") || e?.message?.includes("canceled")) {
      return { success: false, userCancelled: true, error: "Purchase cancelled" };
    }
    console.error("[RevenueCat] Purchase failed:", e);
    return { success: false, error: e?.message || "Purchase failed" };
  }
}

export function isRevenueCatAvailable(): boolean {
  return isNative() && isInitialized;
}
