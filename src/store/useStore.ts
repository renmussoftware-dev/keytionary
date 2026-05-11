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
  | { kind: 'scale';       root: number; scaleKey: string;     addedAt: number }
  | { kind: 'chord';       root: number; chordKey: string;     addedAt: number }
  | { kind: 'progression'; root: number; progName: string;     addedAt: number };

type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;
export type SavedItemInput = DistributiveOmit<SavedItem, 'addedAt'>;

const RECENTS_MAX = 20;

function itemKey(it: SavedItemInput): string {
  switch (it.kind) {
    case 'scale':       return `s:${it.root}:${it.scaleKey}`;
    case 'chord':       return `c:${it.root}:${it.chordKey}`;
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
      pendingNav: null,

      setPendingNav: (pendingNav) => set({ pendingNav }),

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
      }),
    },
  ),
);
