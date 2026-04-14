declare module "@revenuecat/purchases-capacitor" {
  interface PurchasesStatic {
    configure(config: { apiKey: string; appUserID?: string }): Promise<void>;
    logIn(config: { appUserID: string }): Promise<void>;
    logOut(): Promise<void>;
    getOfferings(): Promise<{
      current: {
        availablePackages: Array<{
          identifier: string;
          product: {
            identifier: string;
            title: string;
            description: string;
            priceString: string;
            price: number;
          };
        }>;
      } | null;
    }>;
    purchasePackage(config: {
      aPackage: {
        identifier: string;
        product: {
          identifier: string;
          title: string;
          description: string;
          priceString: string;
          price: number;
        };
      };
    }): Promise<{
      customerInfo: {
        originalAppUserId: string;
        allPurchaseDates: Record<string, string>;
        nonSubscriptionTransactions: Array<{
          transactionIdentifier: string;
          productIdentifier: string;
          purchaseDate: string;
        }>;
      };
    }>;
  }

  export const Purchases: PurchasesStatic;
}
