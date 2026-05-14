# Keytionary — Google Play Store Listing

Source of truth for the Play Store metadata. Copy fields into Play Console
→ your app → Store presence. Character counts are Google's hard limits.

---

## App name (50 chars)

```
Keytionary
```

10 chars.

---

## Short description (80 chars)

```
Piano theory visualized. Scales, chords, progressions on an interactive keyboard.
```

80 chars exactly.

---

## Full description (4000 chars)

```
Keytionary — the piano dictionary. Every scale, chord, and progression, visualized right on the keys.

Whether you're learning your first scale or trying to wrap your head around 13th chords, Keytionary lights up the patterns. Every highlighted note is color-coded by its role — root, third, fifth, extension — so you stop memorizing isolated notes and start seeing relationships.

WHAT'S INSIDE

• 14 Scales & Modes — Major, all 7 modes, pentatonic major/minor, blues, harmonic minor, melodic minor, whole tone, and diminished. Each shows its formula, degrees, and full layout across the keyboard.

• 35 Chord Types — From basic triads through extended jazz voicings: 7ths, 9ths, 11ths, 13ths, sus chords, altered dominants. Every chord highlights with root/3rd/5th/extension color-coding.

• Chord Inversions — Cycle through root position, 1st, 2nd, and 3rd inversions. The keyboard reflects each voicing exactly, with slash-chord notation (C/E, Cmaj7/B) to reinforce the theory.

• 22 Chord Progressions — Named progressions across pop, rock, blues, jazz, R&B, folk, and modal styles. Hit Play and hear real piano audio at your BPM. Build your own custom progressions with per-step inversions too.

• Real Piano Audio — Tap any chord to hear it. Sampled piano notes attack as a clean block chord, with previous notes ringing out naturally over their fade-out tail.

• Built-in Metronome — BPM 40–240, six time signatures, accent + offbeat clicks, tap-tempo.

• Smart Resolution Hints — Every chord shows where it commonly resolves to with the voice-leading reason.

• Favorites & Recents — Heart any chord, scale, or progression to save it. Recents auto-track the last 20 you've explored.

FREE vs PRO

Free tier: interactive keyboard, 4 core scales, 8 core chord types, 4 starter progressions, smart resolution hints, favorites & recents. Use it as long as you want — no account required.

Pro: all 14 scales, full chord library, all 22 progressions, real piano audio, built-in metronome.

Monthly: $5.99
Annual: $29.99 (save 58% vs monthly)
Lifetime: $44.99 one-time

DESIGNED FOR EVERY LEVEL

If you're new, the color system trains your eye to recognize chord shapes the way trained pianists hear them — as relationships, not isolated notes. If you're experienced, it's a fast reference for the entire chord vocabulary, from "what's the iii chord in F# minor?" to "show me every voicing of Maj7♯11" — without flipping through theory books.

PRIVACY

Keytionary works entirely on your device. No accounts, no tracking, no data sold.

Made by Renmus Software LLC, also makers of Fretionary (guitar). Questions? hello@keytionary.com
```

~2,950 chars. Cleaner than the App Store version (no "WHAT'S NEW" duplication since Google handles that on the release notes side).

---

## Release notes for first version (500 chars max per Google)

```
Welcome to Keytionary v1.0 — the piano dictionary.

• 14 scales and modes
• 35 chord types from triads to 13ths
• Chord inversions with slash-chord notation
• 22 named chord progressions + custom builder
• Real piano audio with per-step voicing controls
• Built-in metronome
• Smart resolution hints

Start free, no account needed. Feedback: hello@keytionary.com
```

---

## Category

- **App category**: Music & Audio
- **Tags** (up to 5): piano, music theory, chords, scales, learn music

---

## Contact details

- **Email**: hello@keytionary.com
- **Website**: https://keytionary.com
- **Privacy Policy**: https://keytionary.com/privacy

---

## Data safety form

Answer "**No, we don't collect any user data**" to the top-level question.
Keytionary stores only local preferences (favorite chord/scale/recent
selections) on the device — never transmitted anywhere. RevenueCat is used
for subscription verification with anonymous identifiers only. Both should
be disclosed if Google's form asks specifically about purchase data.

---

## Content rating questionnaire

Answer "**No**" to every category — Keytionary contains no objectionable
content. The IARC questionnaire will issue Everyone / 3+ rating. Suitable
for all ages.

---

## Subscriptions & in-app products

Set up in Play Console → Monetize → Products. Google's model is different
from Apple's (one Subscription product with multiple Base Plans, vs.
Apple's Subscription Group with multiple Auto-Renewable Subscriptions).

**Subscription**: `keytionary_pro`
- Base plan: `monthly` — auto-renewing, 1 month, $5.99 USD
- Base plan: `annual` — auto-renewing, 1 year, $29.99 USD

**In-app product** (one-time, non-consumable): `keytionary_lifetime` — $44.99 USD

Localize prices per region or use Google's auto-conversion. Same display
prices as App Store keeps the cross-platform story consistent.

Tax & financial requirements: the merchant account on the Renmus Software
LLC Play developer account should already cover this from Fretionary's
launch. If not — Settings → Payments profile.

---

## Service account for `eas submit`

Already wired in `eas.json` at `submit.production.android.serviceAccountKeyPath`
pointing to `./google-play-service-account.json` (gitignored).

To create:

1. Google Cloud Console → Service Accounts (https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Create service account named something like `keytionary-eas-submit`.
3. Skip the optional permission steps in the create flow — we grant
   permissions on the Play side, not Cloud side.
4. Open the new service account → Keys → Add Key → JSON. Download the
   file. Save it to the project root as `google-play-service-account.json`
   (the path `eas.json` references).
5. Play Console → Settings → API access → Link the Google Cloud project,
   then grant the service account "Release Manager" permission for the
   Keytionary app.

The JSON is gitignored — never commit it. If you already have one for
Fretionary on the same Renmus Software LLC GCP project, you can reuse it
(just grant it Keytionary release manager permission too).

---

## RevenueCat — Android side

In the existing Keytionary RevenueCat project:

1. Add Android app with package `com.renmussoftware.keytionary`.
2. Upload the Play service account JSON (RevenueCat needs it for
   subscription state verification on Google's side).
3. Sync products: `keytionary_pro:monthly`, `keytionary_pro:annual`,
   `keytionary_lifetime`. RevenueCat treats base plans as their own
   products.
4. Attach all three to the existing `Keytionary Pro` entitlement.
5. Add the Android packages to the existing offering — RevenueCat will
   serve the right product per platform automatically when the iOS or
   Android app fetches the offering.
6. Copy the Android public API key (`goog_…`) from RC → Project Settings
   → API Keys → "Public app-specific API keys" for the Android app.

---

## Code change once Android RC key is in hand

Edit `src/constants/revenuecat.ts`:

```ts
androidApiKey: 'goog_THE_KEY',
```

That's it. The hook is platform-aware — Android paywall lights up
automatically once the key is no longer a placeholder.

---

## Build + submit flow

```bash
# Dev build for sandbox-testing the purchase
eas build --profile development --platform android

# Production AAB for Play submission
eas build --profile production --platform android

# Submit to internal track (eas.json track is already "internal", draft)
eas submit --platform android
```

Internal testing track → closed testing → open testing → production. Move
testers up as confidence grows. Google requires at least 14 days of closed
testing with 12+ testers before promoting to production for new developer
accounts. If the Renmus Software account is already established (Fretionary
shipped), the closed-testing requirement is waived.

---

## Screenshots

Play Store screenshot requirements are different from App Store:
- 16:9 or 9:16 aspect ratio (Apple uses ~9:19.5)
- Min 320 px on short side, max 3840 px on long side
- JPEG or 24-bit PNG (no alpha)
- 2–8 screenshots required

Reference 9:16 sizes:
- 1080 × 1920 (1080p portrait)
- 1440 × 2560 (1440p portrait)

The iOS screenshots (1320 × 2868) are not 9:16, so they need to be
re-rendered. Source HTML at `assets/marketing/paywall.html` and
`pricing.html` will need a width/height tweak then re-render via the
same Chrome-headless command, swapping `--window-size=1440,2560`.

**Feature graphic** (required for Play Store listing): 1024 × 500
banner, JPEG or 24-bit PNG. No transparency.

Both still TODO.

---

## Permissions

Already cleaned in `app.json`:
- `permissions: []` (no special permissions requested)
- `blockedPermissions: ["android.permission.RECORD_AUDIO"]` (Expo modules
  may include this by default; we explicitly disable since the app only
  plays back audio, never records)

The Play Console "App access" section will ask if any features require
sign-in. Answer "All functionality is available without special access."
