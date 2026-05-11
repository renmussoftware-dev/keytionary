import { router } from 'expo-router';
import Paywall from '../src/components/Paywall';

export default function PaywallScreen() {
  return (
    <Paywall
      onClose={() => router.back()}
      onSuccess={() => router.back()}
    />
  );
}
