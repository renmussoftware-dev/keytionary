/**
 * Keytionary — Facebook SDK configuration
 *
 * Powers Meta Ads attribution and audience-building so we can optimize
 * Instagram/Facebook ad campaigns and see the full install → paywall →
 * subscribe funnel.
 *
 * Fill in the values below once you have a Meta Developer app created.
 * Until then, src/lib/analytics.ts skips SDK init entirely and every
 * event-firing helper is a no-op.
 *
 * Setup checklist (https://developers.facebook.com):
 *   1. Create a new app of type "Consumer" or "Business".
 *      Add the "App Events" / "Marketing API" product.
 *   2. Add iOS platform — bundle ID com.renmussoftware.keytionary.
 *      Add Android platform — package com.renmussoftware.keytionary, plus
 *      the keyhash from your Play Console upload certificate.
 *   3. Settings → Basic → copy the App ID and generate a Client Token.
 *   4. Paste both below AND into the react-native-fbsdk-next plugin
 *      config in app.json (the native modules read from app.json, the JS
 *      code from this file — they need to agree).
 *   5. RevenueCat → Integrations → Meta → connect, paste the same App ID
 *      and a Conversions API access token. RC will fire purchase events
 *      server-side via CAPI, deduplicated against the client SDK's.
 */

export const FACEBOOK = {
  appId:       'PLACEHOLDER',
  clientToken: 'PLACEHOLDER',
} as const;

export function isFbSdkConfigured(): boolean {
  return FACEBOOK.appId !== 'PLACEHOLDER' && FACEBOOK.clientToken !== 'PLACEHOLDER';
}
