/**
 * Keytionary — RevenueCat configuration
 *
 * Fill in the three values below with your Keytionary RevenueCat project.
 * Until then, the app runs with Pro = false and the paywall shows "no
 * packages available" instead of crashing.
 *
 * Setup checklist (RevenueCat dashboard at https://app.revenuecat.com):
 *   1. Create a new Project named "Keytionary" (or add apps to an existing
 *      project — best practice is one project per app for clean analytics).
 *   2. Add an iOS app with bundle ID com.renmussoftware.keytionary.
 *      Upload the App Store Connect shared secret + in-app-purchase key.
 *   3. Add an Android app with package com.renmussoftware.keytionary.
 *      Upload the Google Play service-account JSON.
 *   4. Define an Entitlement (e.g. "pro" or "Keytionary Pro") and attach the
 *      products that grant it.
 *   5. Define an Offering with Monthly, Annual, and Lifetime packages.
 *   6. Configure App Store Connect (auto-renewable subscriptions + non-
 *      consumable for Lifetime) and Google Play (subscriptions + one-time
 *      product). Product IDs must match what you wired into RC step 4.
 *   7. Copy the iOS / Android public API keys from RC → Project Settings →
 *      API Keys, paste below, and replace the entitlement ID with whatever
 *      name you chose in step 4.
 */

export const REVENUECAT = {
  iosApiKey:     'appl_KEmbhloMThUmrIscCgooEEvCDKY',
  androidApiKey: 'goog_GgQfsCDbLMYvpQhjNVGxWChDKmW',
  entitlementId: 'Keytionary Pro',
} as const;

// Treat the config as unconfigured for the *current* platform only. iOS can
// ship before Android is set up; a placeholder Android key won't block iOS RC
// init. The audio playback features all work without Pro — only the paywall
// and pro-locked items care, and they gracefully fall back to free behavior.
export function isRevenueCatConfigured(platform: 'ios' | 'android' | string): boolean {
  if (platform === 'ios') return !REVENUECAT.iosApiKey.endsWith('_PLACEHOLDER');
  if (platform === 'android') return !REVENUECAT.androidApiKey.endsWith('_PLACEHOLDER');
  return false;
}
