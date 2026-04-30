// store/useAppStore.ts
// Central Zustand store backed by AsyncStorage persistence.
//
// Persisted slices: transactions, subscriptions, insights, notifications,
// budget, preferences. Derived (summary) and ephemeral (isLoading) state
// is intentionally not persisted — it is recomputed on rehydrate.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { Budget } from '../types/budget';
import { Insight } from '../types/insight';
import { Notification } from '../types/notification';
import {
  SpendingSummary,
  Transaction,
  TransactionCategory,
} from '../types/transaction';
import { Subscription } from '../types/subscription';
import { OnboardingGoal, UserPreferences } from '../types/user';
import { computeSpendingSummary } from '../utils/analytics';

// ─── State shape ─────────────────────────────────────────────────────────────

interface AppState {
  // Data (persisted)
  transactions: Transaction[];
  subscriptions: Subscription[];
  insights: Insight[];
  notifications: Notification[];
  budget: Budget | null;

  // User (persisted)
  preferences: UserPreferences;

  // Derived (not persisted)
  summary: SpendingSummary | null;

  // UI state (not persisted)
  isLoading: boolean;
  hasHydrated: boolean;

  // Actions — Transactions
  // Returns `true` iff the transaction was actually added (i.e. wasn't an
  // id-match or soft-duplicate). Callers use this to gate side-effects that
  // should only fire for genuinely new transactions (e.g. notifications).
  addTransaction: (tx: Transaction) => boolean;
  // Returns the subset of `txs` that were actually added (id-unique and not
  // a soft-duplicate). Empty array if everything was deduped. Same gating
  // rationale as `addTransaction`.
  addTransactions: (txs: Transaction[]) => Transaction[];
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  // Manual entries can be deleted from the detail sheet. SMS-sourced
  // transactions are intentionally not deletable here — the SMS is the
  // source of truth, and a deleted-but-still-in-inbox tx would re-appear
  // on the next backfill, confusing the user.
  deleteTransaction: (id: string) => void;
  toggleImportant: (id: string) => void;
  setCategoryForTransaction: (id: string, category: TransactionCategory) => void;

  // Actions — Preferences
  setGoal: (goal: OnboardingGoal) => void;
  completeOnboarding: () => void;
  setSmsPermission: (granted: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setLanguage: (language: UserPreferences['language']) => void;

  // Actions — Subscriptions
  setSubscriptions: (subs: Subscription[]) => void;

  // Actions — Insights
  setInsights: (insights: Insight[]) => void;
  markInsightRead: (id: string) => void;
  addInsight: (insight: Insight) => void;

  // Actions — Notifications
  addNotification: (n: Notification) => void;
  markNotificationRead: (id: string) => void;

  // Actions — Budget
  setBudget: (budget: Budget) => void;

  // Actions — Analytics
  refreshSummary: () => void;

  // Bootstrap
  hydrate: () => void;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  goal: null,
  currency: 'Rs.',
  onboardingComplete: false,
  notificationsEnabled: false,
  smsPermissionGranted: false,
  theme: 'system',
  language: 'system',
};

// Dedup a transaction by id so SMS re-reads of the same message can't double-add.
function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
  }
  return result;
}

// Soft duplicate: same merchant + amount + type within 90 seconds.
// Catches the case where the SMS shows up again with a slightly different id.
function isLikelyDuplicate(tx: Transaction, existing: Transaction[]): boolean {
  return existing.some(
    (e) =>
      e.merchant === tx.merchant &&
      e.amount === tx.amount &&
      e.type === tx.type &&
      Math.abs(e.timestamp - tx.timestamp) < 90_000
  );
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      transactions: [],
      subscriptions: [],
      insights: [],
      notifications: [],
      budget: null,
      preferences: DEFAULT_PREFERENCES,
      summary: null,
      isLoading: false,
      hasHydrated: false,

      // ─── Transactions ──────────────────────────────────────────
      addTransaction: (tx) => {
        const existing = get().transactions;
        if (existing.some((e) => e.id === tx.id) || isLikelyDuplicate(tx, existing)) {
          return false;
        }
        set({ transactions: [tx, ...existing] });
        get().refreshSummary();
        return true;
      },

      addTransactions: (txs) => {
        if (!txs.length) return [];
        const existing = get().transactions;
        const fresh: Transaction[] = [];
        for (const tx of txs) {
          if (existing.some((e) => e.id === tx.id)) continue;
          if (isLikelyDuplicate(tx, existing)) continue;
          if (fresh.some((f) => f.id === tx.id)) continue;
          fresh.push(tx);
        }
        if (!fresh.length) return [];
        set({
          transactions: uniqueById([...fresh, ...existing]).sort(
            (a, b) => b.timestamp - a.timestamp
          ),
        });
        get().refreshSummary();
        return fresh;
      },

      updateTransaction: (id, updates) => {
        set((s) => ({
          transactions: s.transactions.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        }));
        get().refreshSummary();
      },

      deleteTransaction: (id) => {
        set((s) => ({
          transactions: s.transactions.filter((t) => t.id !== id),
        }));
        get().refreshSummary();
      },

      toggleImportant: (id) => {
        set((s) => ({
          transactions: s.transactions.map((t) =>
            t.id === id ? { ...t, isImportant: !t.isImportant } : t
          ),
        }));
      },

      setCategoryForTransaction: (id, category) => {
        set((s) => ({
          transactions: s.transactions.map((t) =>
            t.id === id ? { ...t, category } : t
          ),
        }));
        get().refreshSummary();
      },

      // ─── Preferences ──────────────────────────────────────────
      setGoal: (goal) => {
        set((s) => ({ preferences: { ...s.preferences, goal } }));
      },

      completeOnboarding: () => {
        set((s) => ({
          preferences: { ...s.preferences, onboardingComplete: true },
        }));
      },

      setSmsPermission: (granted) => {
        set((s) => ({
          preferences: { ...s.preferences, smsPermissionGranted: granted },
        }));
      },

      setNotificationsEnabled: (enabled) => {
        set((s) => ({
          preferences: { ...s.preferences, notificationsEnabled: enabled },
        }));
      },

      setLanguage: (language) => {
        set((s) => ({
          preferences: { ...s.preferences, language },
        }));
      },

      // ─── Subscriptions ────────────────────────────────────────
      setSubscriptions: (subs) => set({ subscriptions: subs }),

      // ─── Insights ──────────────────────────────────────────────
      setInsights: (insights) => set({ insights }),

      markInsightRead: (id) => {
        set((s) => ({
          insights: s.insights.map((i) =>
            i.id === id ? { ...i, isRead: true } : i
          ),
        }));
      },

      addInsight: (insight) => {
        set((s) => ({ insights: [insight, ...s.insights] }));
      },

      // ─── Notifications ────────────────────────────────────────
      addNotification: (n) => {
        set((s) => ({ notifications: [n, ...s.notifications] }));
      },

      markNotificationRead: (id) => {
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.id === id ? { ...n, isRead: true } : n
          ),
        }));
      },

      // ─── Budget ────────────────────────────────────────────────
      setBudget: (budget) => set({ budget }),

      // ─── Analytics ────────────────────────────────────────────
      refreshSummary: () => {
        const summary = computeSpendingSummary(get().transactions);
        set({ summary });
      },

      // ─── Bootstrap ────────────────────────────────────────────
      // Called once after fonts load. Recomputes derived state.
      hydrate: () => {
        const summary = computeSpendingSummary(get().transactions);
        set({ summary, hasHydrated: true });
      },
    }),
    {
      name: 'flowmoney-app-state',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      // Persist only the slices that should survive a relaunch.
      partialize: (state) => ({
        transactions: state.transactions,
        subscriptions: state.subscriptions,
        insights: state.insights,
        notifications: state.notifications,
        budget: state.budget,
        preferences: state.preferences,
      }),
      // Ensure summary is always recomputed from the rehydrated transactions
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.summary = computeSpendingSummary(state.transactions);
        }
      },
    }
  )
);
