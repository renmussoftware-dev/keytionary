import { router } from 'expo-router';
import { useStore } from '../store/useStore';
import { useRevenueCat } from './useRevenueCat';

export function useProGate() {
  const isPro = useStore(s => s.isPro);       // global — updates instantly on purchase
  const { isLoading } = useRevenueCat();

  function requirePro(action: () => void) {
    if (isPro) {
      action();
    } else {
      router.push('/paywall');
    }
  }

  return { isPro, isLoading, requirePro };
}
