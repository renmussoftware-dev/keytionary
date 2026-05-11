import { useEffect, useState } from 'react';
import Purchases, { LOG_LEVEL, PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import { Platform } from 'react-native';
import { useStore } from '../store/useStore';
import { REVENUECAT, isRevenueCatConfigured } from '../constants/revenuecat';

export interface PurchaseState {
  isLoading: boolean;
  isPro: boolean;
  packages: PurchasesPackage[];
  customerInfo: CustomerInfo | null;
}

export function useRevenueCat() {
  const setIsPro = useStore(s => s.setIsPro);
  const [state, setState] = useState<PurchaseState>({
    isLoading: true,
    isPro: false,
    packages: [],
    customerInfo: null,
  });

  function updatePro(isPro: boolean, customerInfo: CustomerInfo) {
    setIsPro(isPro); // sync to global store immediately
    setState(s => ({ ...s, isPro, customerInfo }));
  }

  useEffect(() => {
    async function init() {
      // Key still a placeholder for this platform → skip RC entirely. The
      // app runs free, the paywall shows "no packages", nothing crashes.
      // Lets us ship iOS before Android is configured.
      if (!isRevenueCatConfigured(Platform.OS)) {
        if (__DEV__) {
          console.warn(`[RevenueCat] Not configured for ${Platform.OS} — skipping init. See src/constants/revenuecat.ts.`);
        }
        setState(s => ({ ...s, isLoading: false }));
        return;
      }

      try {
        if (__DEV__) {
          Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        }

        if (Platform.OS === 'ios') {
          Purchases.configure({ apiKey: REVENUECAT.iosApiKey });
        } else if (Platform.OS === 'android') {
          Purchases.configure({ apiKey: REVENUECAT.androidApiKey });
        }

        const customerInfo = await Purchases.getCustomerInfo();
        const isPro = customerInfo.entitlements.active[REVENUECAT.entitlementId] !== undefined;
        const offerings = await Purchases.getOfferings();
        const packages = offerings.current?.availablePackages ?? [];

        setIsPro(isPro);
        setState({ isLoading: false, isPro, packages, customerInfo });
      } catch (e) {
        console.warn('RevenueCat init error:', e);
        setState(s => ({ ...s, isLoading: false }));
      }
    }

    init();
  }, []);

  async function purchasePackage(pkg: PurchasesPackage): Promise<boolean> {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const isPro = customerInfo.entitlements.active[REVENUECAT.entitlementId] !== undefined;
      updatePro(isPro, customerInfo);
      return isPro;
    } catch (e: any) {
      if (!e.userCancelled) {
        console.warn('Purchase error:', e);
      }
      return false;
    }
  }

  async function restorePurchases(): Promise<boolean> {
    try {
      const customerInfo = await Purchases.restorePurchases();
      const isPro = customerInfo.entitlements.active[REVENUECAT.entitlementId] !== undefined;
      updatePro(isPro, customerInfo);
      return isPro;
    } catch (e) {
      console.warn('Restore error:', e);
      return false;
    }
  }

  return { ...state, purchasePackage, restorePurchases };
}
