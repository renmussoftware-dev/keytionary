/**
 * Keytionary — Meta app-events wrapper.
 *
 * Sits between the rest of the app and `react-native-fbsdk-next`. Two jobs:
 *   1. Handle SDK initialization, including the iOS App Tracking
 *      Transparency prompt that must precede any IDFA-using SDK.
 *   2. Provide a small set of typed event helpers for the conversion
 *      funnel we care about: onboarding completion, paywall view,
 *      checkout initiation, Pro-lock taps.
 *
 * Every helper is a no-op when the SDK isn't configured (placeholder
 * credentials in src/constants/facebook.ts) so the app builds and runs
 * clean without Meta credentials in place.
 *
 * Purchase events deliberately are NOT fired from here — RevenueCat's
 * Meta integration sends them server-side via the Conversions API, which
 * is both more reliable (independent of client-side network conditions)
 * and automatically deduplicated against any client-side events.
 */

import { Platform } from 'react-native';
import { Settings, AppEventsLogger } from 'react-native-fbsdk-next';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import { isFbSdkConfigured } from '../constants/facebook';

let initialized = false;

/**
 * Initialize the Facebook SDK and (on iOS) request App Tracking
 * Transparency permission. Safe to call multiple times — subsequent calls
 * are no-ops. Should fire after the user has experienced enough of the
 * app to give the ATT prompt context (e.g. after onboarding completes).
 */
export async function initAnalytics(): Promise<void> {
  if (initialized) return;
  if (!isFbSdkConfigured()) {
    if (__DEV__) {
      console.warn('[Analytics] Facebook SDK not configured — skipping init.');
    }
    return;
  }

  try {
    // iOS: defer advertiser tracking until we have the user's ATT response.
    // Starting with tracking off prevents the SDK from collecting IDFA on
    // its own before we've asked.
    if (Platform.OS === 'ios') {
      await Settings.setAdvertiserTrackingEnabled(false);
    }

    Settings.initializeSDK();

    if (Platform.OS === 'ios') {
      // Show the ATT prompt and enable tracking based on the response.
      // Denied responses still let the SDK fire events — they just can't
      // be cross-app-attributed via IDFA. SKAdNetwork still attributes
      // installs and purchases in that case.
      const { status } = await requestTrackingPermissionsAsync();
      const granted = status === 'granted';
      await Settings.setAdvertiserTrackingEnabled(granted);
    }

    // Enable auto-logging of session start, app launch, and similar
    // baseline events after init so they don't fire pre-ATT on iOS.
    Settings.setAutoLogAppEventsEnabled(true);

    initialized = true;
  } catch (e) {
    if (__DEV__) console.warn('[Analytics] init failed:', e);
  }
}

// ── Funnel event helpers ──────────────────────────────────────────────────
//
// All helpers are fire-and-forget — they swallow errors so a flaky network
// or SDK glitch never breaks the calling UI code. They no-op if the SDK
// hasn't initialized successfully.

function safeLog(eventName: string, params?: Record<string, string | number>) {
  if (!initialized) return;
  try {
    if (params) AppEventsLogger.logEvent(eventName, params as any);
    else AppEventsLogger.logEvent(eventName);
  } catch (e) {
    if (__DEV__) console.warn(`[Analytics] event "${eventName}" failed:`, e);
  }
}

/**
 * Fired when a new user finishes the onboarding carousel. Maps to Meta's
 * standard "complete registration" event so it can serve as a
 * conversion optimization goal in Ads Manager.
 */
export function logOnboardingComplete(): void {
  safeLog(AppEventsLogger.AppEvents.CompletedRegistration);
}

/**
 * Fired whenever the paywall screen is presented. Standard "content view"
 * with paywall as the content type — useful for measuring intent and
 * building retargeting audiences (people who saw the paywall but didn't
 * subscribe).
 */
export function logPaywallViewed(): void {
  safeLog(AppEventsLogger.AppEvents.ViewedContent, { fb_content_type: 'paywall' });
}

/**
 * Fired when the user taps "Subscribe" or "Buy Lifetime" — they've
 * committed to attempt a purchase, even if it fails or is cancelled at
 * the App Store / Play sheet. Captures high-intent users for lookalike
 * audiences regardless of completion.
 */
export function logCheckoutInitiated(plan: 'monthly' | 'annual' | 'lifetime', priceUsd: number): void {
  safeLog(AppEventsLogger.AppEvents.InitiatedCheckout, {
    fb_content_type: plan,
    _valueToSum: priceUsd,
    fb_currency: 'USD',
  });
}

/**
 * Custom event — fired when a user taps a Pro-locked feature. Powerful
 * signal: the user actively *wanted* a Pro feature but didn't subscribe.
 * Use for retargeting audiences and to find which locks drive the most
 * conversion intent.
 */
export function logProLockHit(feature: string): void {
  safeLog('pro_lock_hit', { feature });
}
