import { isNative, getPlatform } from "./capacitor";

let isInitialized = false;
let initPromise: Promise<void> | null = null;

interface PurchasesAPI {
  configure(config: { apiKey: string; appUserID?: string }): Promise<void>;
  logIn(config: { appUserID: string }): Promise<void>;
  logOut(): Promise<void>;
  getOfferings(): Promise<RevenueCatOfferings>;
  purchasePackage(config: { aPackage: RevenueCatPackage }): Promise<{ customerInfo: RevenueCatCustomerInfo }>;
}

let PurchasesModule: PurchasesAPI | null = null;

export interface RevenueCatTransaction {
  transactionIdentifier: string;
  productIdentifier: string;
  purchaseDate: string;
}

export interface RevenueCatCustomerInfo {
  originalAppUserId: string;
  nonSubscriptionTransactions: RevenueCatTransaction[];
}

export interface RevenueCatProduct {
  identifier: string;
  priceString: string;
  price: number;
  currencyCode: string;
}

export interface RevenueCatPackage {
  identifier: string;
  product: RevenueCatProduct;
  packageType: string;
}

export interface RevenueCatOfferings {
  current?: {
    identifier: string;
    availablePackages: RevenueCatPackage[];
  } | null;
}

async function loadPurchasesModule(): Promise<boolean> {
  if (PurchasesModule) return true;
  try {
    // @revenuecat/purchases-capacitor is installed as part of the native build process
    // (npm install --legacy-peer-deps in the local Android/iOS build environment).
    // On web, this import fails gracefully — native IAP is only available on device.
    const mod = await import("@revenuecat/purchases-capacitor");
    PurchasesModule = mod.Purchases as unknown as PurchasesAPI;
    return true;
  } catch {
    console.warn("[RevenueCat] Plugin not available (expected on web)");
    return false;
  }
}

export async function initRevenueCat(userId?: string): Promise<void> {
  if (!isNative()) return;
  if (isInitialized) return;
  if (initPromise) {
    await initPromise;
    return;
  }

  initPromise = (async () => {
    const loaded = await loadPurchasesModule();
    if (!loaded) return;

    try {
      const platform = getPlatform();
      const apiKey =
        platform === "ios"
          ? import.meta.env.VITE_REVENUECAT_IOS_KEY
          : import.meta.env.VITE_REVENUECAT_ANDROID_KEY;

      if (!apiKey) {
        console.warn("[RevenueCat] No API key configured for platform:", platform);
        return;
      }

      await PurchasesModule!.configure({
        apiKey,
        appUserID: userId || undefined,
      });

      isInitialized = true;
      console.log("[RevenueCat] Initialized for", platform);
    } catch (e) {
      console.error("[RevenueCat] Init failed:", e);
    }
  })();

  await initPromise;
}

export async function waitForInit(): Promise<void> {
  if (initPromise) await initPromise;
}

export async function identifyUser(userId: string): Promise<void> {
  if (!isNative() || !isInitialized || !PurchasesModule) return;
  try {
    await PurchasesModule.logIn({ appUserID: userId });
  } catch (e) {
    console.error("[RevenueCat] Identify failed:", e);
  }
}

export async function logoutRevenueCat(): Promise<void> {
  if (!isNative() || !isInitialized || !PurchasesModule) return;
  try {
    await PurchasesModule.logOut();
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
  rcPackage: RevenueCatPackage;
}

export async function getOfferings(): Promise<NativeCoinPackage[]> {
  if (!isNative()) return [];

  await waitForInit();

  if (!isInitialized || !PurchasesModule) return [];

  try {
    const offerings: RevenueCatOfferings = await PurchasesModule.getOfferings();

    if (!offerings.current || !offerings.current.availablePackages) {
      console.warn("[RevenueCat] No current offering found");
      return [];
    }

    return offerings.current.availablePackages.map((pkg: RevenueCatPackage) => {
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
  rcPackage: RevenueCatPackage
): Promise<PurchaseResult> {
  if (!isNative()) {
    return { success: false, error: "Not on native platform" };
  }

  await waitForInit();

  if (!isInitialized || !PurchasesModule) {
    return { success: false, error: "RevenueCat not initialized" };
  }

  try {
    const result: { customerInfo: RevenueCatCustomerInfo } =
      await PurchasesModule.purchasePackage({ aPackage: rcPackage });

    const targetProductId = rcPackage.product?.identifier;
    const nonSubTransactions = result.customerInfo?.nonSubscriptionTransactions || [];
    const matchingTxn = nonSubTransactions
      .filter((t: RevenueCatTransaction) => t.productIdentifier === targetProductId)
      .sort((a: RevenueCatTransaction, b: RevenueCatTransaction) => {
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
  } catch (e: unknown) {
    const err = e as { code?: string; userCancelled?: boolean; message?: string };
    if (err?.code === "1" || err?.userCancelled || err?.message?.includes("cancelled") || err?.message?.includes("canceled")) {
      return { success: false, userCancelled: true, error: "Purchase cancelled" };
    }
    console.error("[RevenueCat] Purchase failed:", e);
    return { success: false, error: err?.message || "Purchase failed" };
  }
}

export function isRevenueCatAvailable(): boolean {
  return isNative() && isInitialized && PurchasesModule !== null;
}
