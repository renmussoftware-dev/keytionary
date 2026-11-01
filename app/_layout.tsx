import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View } from 'react-native';
import { useEffect, useState } from 'react';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useFonts,
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import Onboarding from '../src/components/Onboarding';
import ProPromptSheet from '../src/components/ProPromptSheet';
import { initAnalytics, logOnboardingComplete } from '../src/lib/analytics';
import { useStore } from '../src/store/useStore';
import { maybeRequestPushPermission, scheduleStreakReminder } from '../src/utils/notifications';

const ONBOARDING_KEY = 'keytionary_onboarded_v1';

// Positive actions (favorites, finished practice sessions) before we ask
// for notification permission — early enough to protect a young streak,
// late enough that the user has seen what the reminder would be for.
const PUSH_ASK_MIN_ACTIONS = 3;

export default function RootLayout() {
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const recordActivity = useStore(s => s.recordActivity);
  const recordOnboardingComplete = useStore(s => s.recordOnboardingComplete);
  const currentStreak = useStore(s => s.currentStreak);
  const positiveActionCount = useStore(s => s.positiveActionCount);
  const [fontsLoaded] = useFonts({
    // Map all four weights to a single family alias matching FONT_FAMILY.mono
    // in theme.ts. RN picks the right weight via the `fontWeight` style.
    JetBrainsMono: JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
    JetBrainsMono_700Bold,
  });

  useEffect(() => {
    // Set audio mode at app root so it's active before any tab loads
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    }).catch(() => {});

    // Check if onboarding has been completed
    AsyncStorage.getItem(ONBOARDING_KEY).then(val => {
      setShowOnboarding(val === null);
    }).catch(() => setShowOnboarding(false));
  }, []);

  async function finishOnboarding() {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'done').catch(() => {});
    setShowOnboarding(false);
    // Kick off init (this also runs from the useEffect below; calls are
    // idempotent). Once the SDK is up — including the iOS ATT prompt
    // resolving — fire the standard "complete registration" event so it
    // doesn't get dropped by being logged pre-init.
    initAnalytics().then(() => logOnboardingComplete());
    // Fire the onboarding Pro prompt after a short delay so the user sees
    // the app land (tabs render, daily card visible) before the prompt
    // slides up — avoids "onboarding → paywall" feeling like bait and
    // switch. The store action is a no-op if the user is already Pro or
    // has seen this prompt before, so this is safe to call every time.
    setTimeout(() => recordOnboardingComplete(), 800);
  }

  // Initialize the Meta SDK + iOS ATT prompt once onboarding is out of the
  // way. Fires for both new users (after onboarding) and returning users
  // (immediately on mount). initAnalytics is idempotent and the ATT prompt
  // only ever shows once per install, so subsequent app opens are silent.
  useEffect(() => {
    if (showOnboarding === false) initAnalytics();
  }, [showOnboarding]);

  // Credit the streak once per calendar day. recordActivity is a no-op if
  // already counted today, so this is safe to fire on every launch (and on
  // re-runs of this effect during onboarding transitions).
  useEffect(() => {
    if (showOnboarding === false) recordActivity();
  }, [showOnboarding, recordActivity]);

  // Push permission ask — gated on engagement. Single-shot via an
  // AsyncStorage flag inside the util, so this can fire freely.
  useEffect(() => {
    if (showOnboarding !== false) return;
    if (positiveActionCount < PUSH_ASK_MIN_ACTIONS) return;
    maybeRequestPushPermission().then(granted => {
      if (granted) scheduleStreakReminder(useStore.getState().currentStreak);
    });
  }, [showOnboarding, positiveActionCount]);

  // Streak reminder — reschedule for tomorrow at 6pm whenever the streak
  // count is known. The util cancels any stale reminder first and no-ops
  // without permission.
  useEffect(() => {
    if (showOnboarding !== false) return;
    if (currentStreak < 1) return;
    scheduleStreakReminder(currentStreak);
  }, [showOnboarding, currentStreak]);

  // Wait until we know whether to show onboarding AND fonts have loaded
  if (showOnboarding === null || !fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" />
      {showOnboarding ? (
        <Onboarding onDone={finishOnboarding} />
      ) : (
        <>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="paywall"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
          </Stack>
          {/* Proactive Pro prompt — fires at engagement moments (voicing
              threshold reached, first favorite added). Modal-based so it
              overlays any tab. */}
          <ProPromptSheet />
        </>
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
