import { router } from 'expo-router';
import { useStore } from '../store/useStore';
import { useRevenueCat } from './useRevenueCat';
import { logProLockHit } from '../lib/analytics';

export function useProGate() {
  const isPro = useStore(s => s.isPro);       // global — updates instantly on purchase
  const { isLoading } = useRevenueCat();

  // Optional `feature` tags the lock-hit event with what the user tried to
  // access (e.g. 'metronome', 'chord:Maj9'). Lets us see in Ads Manager
  // which Pro features are the strongest conversion drivers.
  function requirePro(action: () => void, feature?: string) {
    if (isPro) {
      action();
    } else {
      logProLockHit(feature ?? 'unknown');
      router.push('/paywall');
    }
  }

  return { isPro, isLoading, requirePro };
}
