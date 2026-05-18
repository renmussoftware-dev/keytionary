import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Linking, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { PACKAGE_TYPE } from 'react-native-purchases';
import type { PurchasesPackage } from 'react-native-purchases';
import { COLORS, SPACE, RADIUS } from '../constants/theme';
import { useRevenueCat } from '../hooks/useRevenueCat';
import { logPaywallViewed, logCheckoutInitiated } from '../lib/analytics';

interface Props {
  onClose?: () => void;
  onSuccess?: () => void;
}

export default function Paywall({ onClose, onSuccess }: Props) {
  const { isLoading, isPro, packages, purchasePackage, restorePurchases } = useRevenueCat();
  const [purchasing, setPurchasing] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(1); // Default to annual

  // Fire the Meta "viewed content" event the first time the paywall mounts.
  // Captures intent — every user who got far enough to see the paywall —
  // for retargeting audiences in Ads Manager.
  useEffect(() => {
    logPaywallViewed();
  }, []);

  // Sort packages: monthly, annual, lifetime
  const sorted = [...packages].sort((a, b) => {
    const order = [PACKAGE_TYPE.MONTHLY, PACKAGE_TYPE.ANNUAL, PACKAGE_TYPE.LIFETIME];
    return order.indexOf(a.packageType) - order.indexOf(b.packageType);
  });

  async function handlePurchase(pkg: PurchasesPackage) {
    // Fire "initiated checkout" the moment the user commits to attempting
    // the purchase — captures high-intent regardless of whether the
    // platform purchase sheet ultimately succeeds or gets cancelled. The
    // successful-purchase event itself comes from RevenueCat's Meta
    // integration (CAPI, server-side) so we don't fire it here.
    const planKey =
      pkg.packageType === PACKAGE_TYPE.MONTHLY  ? 'monthly'  :
      pkg.packageType === PACKAGE_TYPE.ANNUAL   ? 'annual'   :
      pkg.packageType === PACKAGE_TYPE.LIFETIME ? 'lifetime' : 'monthly';
    logCheckoutInitiated(planKey, pkg.product.price);

    setPurchasing(true);
    const success = await purchasePackage(pkg);
    setPurchasing(false);
    if (success) {
      Alert.alert(
        'Welcome to Keytionary Pro! 🎹',
        'You now have full access to all features.',
        [{ text: 'Let\'s go!', onPress: () => {
          onSuccess?.();
          router.back(); // dismiss paywall — global isPro already updated
        }}]
      );
    }
  }

  async function handleRestore() {
    setPurchasing(true);
    const success = await restorePurchases();
    setPurchasing(false);
    if (success) {
      Alert.alert(
        'Purchases Restored',
        'Your Pro access has been restored.',
        [{ text: 'Let\'s go!', onPress: () => {
          onSuccess?.();
          router.back();
        }}]
      );
    } else {
      const account = Platform.OS === 'ios' ? 'Apple ID' : 'Google account';
      Alert.alert('No Purchases Found', `No previous purchases were found for this ${account}.`);
    }
  }

  function getPackageLabel(pkg: PurchasesPackage) {
    switch (pkg.packageType) {
      case PACKAGE_TYPE.MONTHLY:  return { title: 'Monthly', badge: null, highlight: false };
      case PACKAGE_TYPE.ANNUAL:   return { title: 'Annual', badge: 'BEST VALUE', highlight: true };
      case PACKAGE_TYPE.LIFETIME: return { title: 'Lifetime', badge: 'ONE TIME', highlight: false };
      default:                    return { title: pkg.identifier, badge: null, highlight: false };
    }
  }

  function getFeatures(pkg: PurchasesPackage): string[] {
    switch (pkg.packageType) {
      case PACKAGE_TYPE.MONTHLY:
        return ['All 14 scales & modes', 'Full chord library (35 types)', 'All progressions', 'Real piano audio'];
      case PACKAGE_TYPE.ANNUAL:
        return ['Everything in Monthly', 'Save 48% vs monthly', 'Diatonic chord explorer', 'Custom progression builder'];
      case PACKAGE_TYPE.LIFETIME:
        return ['Everything in Annual', 'Pay once, own forever', 'All future updates', 'No recurring charge'];
      default:
        return [];
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.accent} size="large" />
          <Text style={styles.loadingText}>Loading offers...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isPro) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.proWrap}>
          <Text style={styles.proEmoji}>🎹</Text>
          <Text style={styles.proTitle}>You're on Pro!</Text>
          <Text style={styles.proSub}>Full access to all Keytionary features.</Text>
          {onClose && (
            <TouchableOpacity style={styles.closeBtnPro} onPress={onClose}>
              <Text style={styles.closeBtnProText}>Continue</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headline}>Unlock the full keyboard.</Text>
        <Text style={styles.subheadline}>All scales. All chords. Real piano audio.</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Package cards */}
        {sorted.length === 0 ? (
          <Text style={styles.noPackages}>No packages available. Check your RevenueCat configuration.</Text>
        ) : (
          sorted.map((pkg, i) => {
            const { title, badge, highlight } = getPackageLabel(pkg);
            const features = getFeatures(pkg);
            const selected = selectedIdx === i;

            return (
              <TouchableOpacity
                key={pkg.identifier}
                style={[styles.card, highlight && styles.cardHighlight, selected && styles.cardSelected]}
                onPress={() => setSelectedIdx(i)}
                activeOpacity={0.8}
              >
                {badge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{badge}</Text>
                  </View>
                )}
                <View style={styles.cardTop}>
                  <Text style={[styles.cardTitle, highlight && styles.cardTitleHighlight]}>{title}</Text>
                  <View style={styles.priceWrap}>
                    <Text style={[styles.price, highlight && styles.priceHighlight]}>
                      {pkg.product.priceString}
                    </Text>
                    <Text style={styles.pricePer}>
                      {pkg.packageType === PACKAGE_TYPE.MONTHLY ? '/month'
                        : pkg.packageType === PACKAGE_TYPE.ANNUAL ? '/year'
                        : ' one time'}
                    </Text>
                  </View>
                </View>
                <View style={styles.divider} />
                {features.map((f, fi) => (
                  <View key={fi} style={styles.featureRow}>
                    <Text style={[styles.check, highlight && styles.checkHighlight]}>✓</Text>
                    <Text style={styles.featureText}>{f}</Text>
                  </View>
                ))}
                {selected && (
                  <View style={styles.selectedDot} />
                )}
              </TouchableOpacity>
            );
          })
        )}

        {/* Free tier note */}
        <View style={styles.freeNote}>
          <Text style={styles.freeNoteText}>✓  Free tier always available — no credit card required</Text>
        </View>

        {/* CTA button */}
        <TouchableOpacity
          style={[styles.ctaBtn, purchasing && styles.ctaBtnDisabled]}
          onPress={() => sorted[selectedIdx] && handlePurchase(sorted[selectedIdx])}
          disabled={purchasing || sorted.length === 0}
          activeOpacity={0.85}
        >
          {purchasing
            ? <ActivityIndicator color="#1a1400" />
            : <Text style={styles.ctaText}>
                {sorted[selectedIdx]?.packageType === PACKAGE_TYPE.LIFETIME
                  ? 'Buy Lifetime Access'
                  : sorted[selectedIdx]?.packageType === PACKAGE_TYPE.MONTHLY
                  ? 'Subscribe Monthly'
                  : 'Subscribe Annually'}
              </Text>
          }
        </TouchableOpacity>

        {/* Restore + legal */}
        <TouchableOpacity onPress={handleRestore} style={styles.restoreBtn} disabled={purchasing}>
          <Text style={styles.restoreText}>Restore Purchases</Text>
        </TouchableOpacity>

        <Text style={styles.legal}>
          {Platform.OS === 'ios'
            ? 'Keytionary Pro — Monthly or Annual auto-renewable subscription. Payment will be charged to your Apple ID at confirmation of purchase. Subscriptions automatically renew unless auto-renew is turned off at least 24 hours before the end of the current period. Your account will be charged for renewal within 24 hours prior to the end of the current period. Manage or cancel subscriptions in your App Store account settings after purchase.'
            : 'Keytionary Pro — Monthly or Annual auto-renewing subscription. Payment will be charged to your Google account at confirmation of purchase. Subscriptions automatically renew unless cancelled at least 24 hours before the end of the current period. Manage or cancel subscriptions in the Google Play Store under Subscriptions after purchase.'}
        </Text>

        <View style={styles.legalLinks}>
          <TouchableOpacity onPress={() => Linking.openURL('https://keytionary.com/privacy')}>
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.legalDot}> · </Text>
          <TouchableOpacity onPress={() => Linking.openURL(
            Platform.OS === 'ios'
              ? 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/'
              : 'https://keytionary.com/terms'
          )}>
            <Text style={styles.legalLink}>Terms of Use</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: SPACE.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: COLORS.bg },
  loadingWrap:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText:      { color: COLORS.textMuted, fontSize: 14 },
  proWrap:          { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: SPACE.xl },
  proEmoji:         { fontSize: 64 },
  proTitle:         { fontSize: 28, fontWeight: '700', color: COLORS.text },
  proSub:           { fontSize: 15, color: COLORS.textMuted, textAlign: 'center' },
  closeBtnPro:      { marginTop: SPACE.xl, backgroundColor: COLORS.accent, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 100 },
  closeBtnProText:  { color: '#1a1400', fontWeight: '700', fontSize: 15 },

  header:           { padding: SPACE.lg, paddingBottom: SPACE.md, alignItems: 'center', position: 'relative' },
  closeBtn:         { position: 'absolute', right: SPACE.lg, top: SPACE.lg, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  closeBtnText:     { color: COLORS.textMuted, fontSize: 18 },
  headline:         { fontSize: 28, fontWeight: '700', color: COLORS.text, textAlign: 'center', marginBottom: 6 },
  subheadline:      { fontSize: 14, color: COLORS.textMuted, textAlign: 'center' },

  scroll:           { padding: SPACE.lg },

  noPackages:       { color: COLORS.textMuted, textAlign: 'center', padding: SPACE.xl, lineHeight: 22 },

  card:             { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, padding: SPACE.lg, marginBottom: SPACE.md, position: 'relative' },
  cardHighlight:    { borderColor: COLORS.accent, backgroundColor: '#18160a' },
  cardSelected:     { borderWidth: 2 },

  badge:            { position: 'absolute', top: -14, alignSelf: 'center', backgroundColor: COLORS.accent, paddingHorizontal: 12, paddingVertical: 3, borderRadius: 100 },
  badgeText:        { fontSize: 10, fontWeight: '800', color: '#1a1400', letterSpacing: 1 },

  cardTop:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACE.md },
  cardTitle:        { fontSize: 18, fontWeight: '700', color: COLORS.text },
  cardTitleHighlight: { color: COLORS.accent },
  priceWrap:        { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  price:            { fontSize: 24, fontWeight: '800', color: COLORS.text },
  priceHighlight:   { color: COLORS.accent },
  pricePer:         { fontSize: 12, color: COLORS.textMuted },

  divider:          { height: 1, backgroundColor: COLORS.border, marginBottom: SPACE.md },

  featureRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  check:            { color: COLORS.textMuted, fontWeight: '700', fontSize: 13 },
  checkHighlight:   { color: COLORS.accent },
  featureText:      { fontSize: 13, color: COLORS.textMuted, flex: 1 },

  selectedDot:      { position: 'absolute', top: 12, right: 12, width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.accent },

  freeNote:         { alignItems: 'center', paddingVertical: SPACE.md },
  freeNoteText:     { fontSize: 12, color: COLORS.textMuted },

  ctaBtn:           { backgroundColor: COLORS.accent, borderRadius: 100, paddingVertical: 16, alignItems: 'center', marginBottom: SPACE.md },
  ctaBtnDisabled:   { opacity: 0.6 },
  ctaText:          { color: '#1a1400', fontWeight: '700', fontSize: 16 },

  restoreBtn:       { alignItems: 'center', paddingVertical: SPACE.sm },
  restoreText:      { color: COLORS.textMuted, fontSize: 13 },

  legal:            { fontSize: 10, color: COLORS.textFaint, textAlign: 'center', lineHeight: 15, marginTop: SPACE.lg, paddingHorizontal: SPACE.md },
  legalLinks:       { flexDirection: 'row', justifyContent: 'center', marginTop: SPACE.sm },
  legalLink:        { fontSize: 11, color: COLORS.textMuted },
  legalDot:         { fontSize: 11, color: COLORS.textFaint },
});
