import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

const DAY_MS = 24 * 60 * 60 * 1000;
const REVIEW_MIN_ACTIONS = 3;
const REVIEW_MIN_DAYS_INSTALLED = 2;
const REVIEW_MIN_DAYS_SINCE_LAST = 60;

export type AppMode = 'scales' | 'chords';
export type LabelMode = 'name' | 'degree' | 'interval' | 'none';

export type SavedItem =
  | { kind: 'scale';       root: number; scaleKey: string;                          addedAt: number }
  | { kind: 'chord';       root: number; chordKey: string; inversion?: number;      addedAt: number }
  | { kind: 'progression'; root: number; progName: string;                          addedAt: number };

type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;
export type SavedItemInput = DistributiveOmit<SavedItem, 'addedAt'>;

const RECENTS_MAX = 20;

// ── Streak helpers ──────────────────────────────────────────────────────────
// Date keys are local-time YYYY-MM-DD strings so day boundaries match the
// user's wall clock (a New Yorker and a Tokyoite both get credit at their
// own midnight, not UTC's). Compare strings == strings — no timezone math
// once you're in the YYYY-MM-DD format.
function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function todayKey(): string { return dateKey(new Date()); }
function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateKey(d);
}

// Proactive Pro-prompt triggers — see recordVoicingPlay / recordFavoriteAdded
// / recordOnboardingComplete. Catches users at peak intent (heard a beautiful
// voicing, committed to a favorite, just finished onboarding) instead of only
// at peak frustration (tapped a locked thing).
//
// Threshold tuned from funnel analysis: 6 was leaving too many users below
// the prompt firing point before they dropped the app entirely. 4 gets the
// prompt in front of them earlier without feeling nagged.
const VOICING_PROMPT_THRESHOLD = 4;

export interface ProPromptSpec {
  source: 'voicings' | 'favorite' | 'onboarding';
  title: string;
  subtitle: string;
}

function itemKey(it: SavedItemInput): string {
  switch (it.kind) {
    case 'scale':       return `s:${it.root}:${it.scaleKey}`;
    // Inversion is part of identity — favoriting C Major root and C/E are
    // two distinct entries. Missing inversion field (old saved data) reads
    // as 0 / root position.
    case 'chord':       return `c:${it.root}:${it.chordKey}:${it.inversion ?? 0}`;
    case 'progression': return `p:${it.root}:${it.progName}`;
  }
}

interface AppState {
  root: number;
  scaleKey: string;
  chordKey: string;
  mode: AppMode;
  labelMode: LabelMode;
  isPro: boolean;

  favorites: SavedItem[];
  recents: SavedItem[];

  installedAt: number;
  positiveActionCount: number;
  lastPromptedAt: number | null;
  recordPositiveAction: () => void;

  // ── Streak state ──────────────────────────────────────────────────────────
  // Counts consecutive days of app activity. lastActivityDate is the YYYY-MM-DD
  // of the last day we credited; if today == that, no-op; if today ==
  // yesterday+1, carry the streak forward; else reset to 1. Driven by
  // recordActivity(), called from app/_layout.tsx on app launch.
  lastActivityDate: string | null;
  currentStreak: number;
  longestStreak: number;
  recordActivity: () => void;

  // ── Proactive Pro-prompt state ─────────────────────────────────────────────
  sessionVoicingPlays: number;        // resets on cold start (not persisted)
  sessionPromptFired: boolean;        // at most one Pro prompt per session
  firstFavoritePromptShown: boolean;  // persisted — favorite prompt fires once ever
  onboardingPromptShown: boolean;     // persisted — onboarding prompt fires once ever
  proPrompt: ProPromptSpec | null;    // when set, ProPromptSheet renders
  recordVoicingPlay: () => void;
  recordFavoriteAdded: () => void;
  recordOnboardingComplete: () => void;
  dismissProPrompt: () => void;

  pendingNav: SavedItem | null;
  setPendingNav: (item: SavedItem | null) => void;

  setRoot: (r: number) => void;
  setScaleKey: (k: string) => void;
  setChordKey: (k: string) => void;
  setMode: (m: AppMode) => void;
  setLabelMode: (l: LabelMode) => void;
  setIsPro: (v: boolean) => void;

  toggleFavorite: (item: SavedItemInput) => void;
  isFavorite: (item: SavedItemInput) => boolean;
  addRecent: (item: SavedItemInput) => void;
  clearRecents: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      root: 0,
      scaleKey: 'Major',
      chordKey: 'Major',
      mode: 'scales',
      labelMode: 'name',
      isPro: false,

      favorites: [],
      recents: [],
      installedAt: 0,
      positiveActionCount: 0,
      lastPromptedAt: null,

      lastActivityDate: null,
      currentStreak: 0,
      longestStreak: 0,

      sessionVoicingPlays: 0,
      sessionPromptFired: false,
      firstFavoritePromptShown: false,
      onboardingPromptShown: false,
      proPrompt: null,

      pendingNav: null,

      setPendingNav: (pendingNav) => set({ pendingNav }),

      // Fires the Pro prompt the first time a non-Pro user has played enough
      // free voicings in a session to feel the value — the "this finally
      // exists" moment. Once per session (sessionPromptFired prevents
      // repeats). The counter resets on cold start.
      recordVoicingPlay: () => {
        const s = get();
        if (s.isPro || s.sessionPromptFired) return;
        const next = s.sessionVoicingPlays + 1;
        set({ sessionVoicingPlays: next });
        if (next < VOICING_PROMPT_THRESHOLD) return;
        set({
          sessionPromptFired: true,
          proPrompt: {
            source: 'voicings',
            title: "Like what you're hearing?",
            subtitle:
              'Unlock every voicing — drop-2, drop-3, shell, rootless, quartal, upper-structure — and swap what your left hand plays under any of them.',
          },
        });
      },

      // Fires the Pro prompt the first ever time a non-Pro user adds a
      // favorite. Persisted (firstFavoritePromptShown) so it never fires
      // again on this install, and gated by sessionPromptFired so it can't
      // pile onto a voicing prompt that already fired this session.
      recordFavoriteAdded: () => {
        const s = get();
        if (s.isPro || s.firstFavoritePromptShown || s.sessionPromptFired) return;
        set({
          firstFavoritePromptShown: true,
          sessionPromptFired: true,
          proPrompt: {
            source: 'favorite',
            title: 'Save it forever.',
            subtitle:
              'You just saved your first favorite. Go Pro to unlock the full library — every chord, every scale, every progression — to favorite anything.',
          },
        });
      },

      // Fires the Pro prompt once ever, the first time the user finishes
      // onboarding. Addresses the funnel-reach leak — under the old flow
      // most users never hit any Pro trigger before dropping. Persisted
      // so it never fires again on this install. Guarded by
      // sessionPromptFired so it can't pile onto another prompt.
      recordOnboardingComplete: () => {
        const s = get();
        if (s.isPro || s.onboardingPromptShown || s.sessionPromptFired) return;
        set({
          onboardingPromptShown: true,
          sessionPromptFired: true,
          proPrompt: {
            source: 'onboarding',
            title: "You're in.",
            subtitle:
              'The free tier covers the basics. Pro unlocks the full library — every voicing, chord, scale, progression — plus voice-led playback and the Chord Identifier.',
          },
        });
      },

      dismissProPrompt: () => set({ proPrompt: null }),

      // Called on every app launch (after onboarding). No-op if already
      // counted today; otherwise carries the streak forward when yesterday
      // was also active, or resets to 1 when the chain was broken.
      recordActivity: () => {
        const today = todayKey();
        const state = get();
        if (state.lastActivityDate === today) return;
        const newStreak = state.lastActivityDate === yesterdayKey()
          ? state.currentStreak + 1
          : 1;
        const newLongest = Math.max(state.longestStreak, newStreak);
        set({
          lastActivityDate: today,
          currentStreak: newStreak,
          longestStreak: newLongest,
        });
      },

      recordPositiveAction: () => {
        const now = Date.now();
        const state = get();
        const installedAt = state.installedAt || now;
        if (state.installedAt === 0) set({ installedAt: now });
        const nextCount = state.positiveActionCount + 1;
        set({ positiveActionCount: nextCount });

        const enoughActions = nextCount >= REVIEW_MIN_ACTIONS;
        const enoughInstalled = (now - installedAt) >= REVIEW_MIN_DAYS_INSTALLED * DAY_MS;
        const enoughSinceLast =
          state.lastPromptedAt === null ||
          (now - state.lastPromptedAt) >= REVIEW_MIN_DAYS_SINCE_LAST * DAY_MS;
        if (!enoughActions || !enoughInstalled || !enoughSinceLast) return;

        StoreReview.isAvailableAsync()
          .then(available => {
            if (!available) return;
            return StoreReview.requestReview();
          })
          .catch(() => {})
          .finally(() => {
            set({ lastPromptedAt: now });
          });
      },

      setRoot: (root) => set({ root }),
      setScaleKey: (scaleKey) => set({ scaleKey }),
      setChordKey: (chordKey) => set({ chordKey }),
      setMode: (mode) => set({ mode }),
      setLabelMode: (labelMode) => set({ labelMode }),
      setIsPro: (isPro) => set({ isPro }),

      toggleFavorite: (item) => {
        const k = itemKey(item);
        const current = get().favorites;
        const exists = current.some(f => itemKey(f) === k);
        if (exists) {
          set({ favorites: current.filter(f => itemKey(f) !== k) });
        } else {
          set({ favorites: [{ ...item, addedAt: Date.now() } as SavedItem, ...current] });
          get().recordPositiveAction();
          get().recordFavoriteAdded();
        }
      },

      isFavorite: (item) => {
        const k = itemKey(item);
        return get().favorites.some(f => itemKey(f) === k);
      },

      addRecent: (item) => {
        const k = itemKey(item);
        const filtered = get().recents.filter(r => itemKey(r) !== k);
        const next = [{ ...item, addedAt: Date.now() } as SavedItem, ...filtered].slice(0, RECENTS_MAX);
        set({ recents: next });
      },

      clearRecents: () => set({ recents: [] }),
    }),
    {
      name: 'keytionary-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        favorites: s.favorites,
        recents: s.recents,
        installedAt: s.installedAt,
        positiveActionCount: s.positiveActionCount,
        lastPromptedAt: s.lastPromptedAt,
        firstFavoritePromptShown: s.firstFavoritePromptShown,
        onboardingPromptShown: s.onboardingPromptShown,
        lastActivityDate: s.lastActivityDate,
        currentStreak: s.currentStreak,
        longestStreak: s.longestStreak,
      }),
    },
  ),
);
