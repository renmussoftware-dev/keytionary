/**
 * Local notification helpers — no remote push infrastructure (no APNs/FCM
 * server, no remote push entitlements). Just scheduled local notifications
 * that fire on the device.
 *
 * Currently powers the streak-protection reminder: each time the app
 * launches, we cancel any pending reminder and schedule a new one for
 * the next day at REMINDER_HOUR (local time). If the user opens the app
 * before then, we cancel + reschedule with the latest streak count. If
 * they don't, the notification fires and nudges them not to break their
 * streak.
 *
 * Permission flow: requestPushPermission() is the manual ask. It returns
 * true if the user granted (or had previously granted). We gate the ask
 * on engagement (called from app/_layout.tsx once the user has racked up a
 * few positive actions — favorites, finished practice sessions) so it
 * doesn't fire on cold launch.
 */

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDailyPick } from './dailyPick';

const STREAK_REMINDER_ID = 'keytionary-streak-protection';
const PUSH_ASKED_KEY = 'keytionary_push_asked_v1';
const REMINDER_HOUR = 18; // 6pm local time

// Configure foreground notification display once at module load so a streak
// reminder that lands while the app is foregrounded is still visible.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function currentPermissionGranted(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/**
 * Single-shot push-permission ask. Persists a flag in AsyncStorage so we
 * never present the OS dialog twice (iOS only shows it once per install
 * anyway, but the flag also lets us skip our own re-asking logic). Safe
 * to call on every launch — only the first call actually prompts.
 *
 * Returns true if notifications are currently granted (whether they were
 * just granted or were already granted from a prior session).
 */
export async function maybeRequestPushPermission(): Promise<boolean> {
  try {
    const asked = await AsyncStorage.getItem(PUSH_ASKED_KEY);
    if (asked) return currentPermissionGranted();

    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted' || existing === 'denied') {
      // Already settled (e.g., from a prior install of the same iOS app) —
      // don't re-prompt. Persist the flag so we never enter this branch again.
      await AsyncStorage.setItem(PUSH_ASKED_KEY, '1');
      return existing === 'granted';
    }

    const { status } = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: false, allowBadge: false },
    });
    await AsyncStorage.setItem(PUSH_ASKED_KEY, '1');
    return status === 'granted';
  } catch (e) {
    if (__DEV__) console.warn('[notifications] permission error', e);
    return false;
  }
}

/**
 * Compute the next reminder slot: tomorrow at REMINDER_HOUR local time.
 * We always look at *tomorrow* because recordActivity has already credited
 * today by the time this is called — there's nothing to remind about today.
 */
function nextReminderDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(REMINDER_HOUR, 0, 0, 0);
  return d;
}

/**
 * Cancel any pending reminder and schedule a fresh one for tomorrow at 6pm.
 * If the user has no streak yet (currentStreak < 1) we don't schedule —
 * there's nothing to protect, and a "start a streak!" cold-prompt would
 * feel pushy. Notifications also need permission; we silently no-op if
 * the user denied or hasn't been asked.
 */
export async function scheduleStreakReminder(currentStreak: number): Promise<void> {
  try {
    // Always cancel a stale reminder first so we don't double-schedule when
    // the user opens the app multiple times in a day.
    await Notifications.cancelScheduledNotificationAsync(STREAK_REMINDER_ID).catch(() => {});

    if (currentStreak < 1) return;
    if (!(await currentPermissionGranted())) return;

    // Compute tomorrow's daily pick so the notification body lands on a
    // specific piece of content — much higher tap-through than a generic
    // "open the app" reminder. By the time the notification fires (6pm
    // tomorrow), the daily pick will have rolled over to the next day's.
    const reminderDate = nextReminderDate();
    const pick = getDailyPick(reminderDate);

    const title = currentStreak === 1
      ? `Today's ${pick.type}: ${pick.fullName}`
      : `Don't break your ${currentStreak}-day streak`;
    // Tomorrow's practice session is the strongest hook once someone has a
    // streak to protect; the daily pick still opens the 1-day case.
    const body = currentStreak === 1
      ? `Tap to see ${pick.fullName} on the keys — and start your practice habit.`
      : `Today's ${pick.type}: ${pick.fullName}, plus a new practice session. Keep your ${currentStreak}-day streak alive.`;

    await Notifications.scheduleNotificationAsync({
      identifier: STREAK_REMINDER_ID,
      content: { title, body },
      // Cast through unknown because expo-notifications trigger types have
      // shifted across versions — { date: Date } is accepted in the runtime
      // across SDK 50–54 even when the strictest types disagree.
      trigger: { date: reminderDate } as unknown as Notifications.NotificationTriggerInput,
    });
  } catch (e) {
    if (__DEV__) console.warn('[notifications] schedule error', e);
  }
}

export async function cancelStreakReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(STREAK_REMINDER_ID);
  } catch {
    // ignore
  }
}
