// services/backgroundSync.ts
// Periodic SMS reconciliation while the app is backgrounded or fully killed.
//
// What this is, and isn't:
//   - It is NOT real-time SMS reception while the app is dead. That requires
//     a static AndroidManifest BroadcastReceiver registered at install time
//     — outside the scope of `expo-transaction-sms-reader` (the package
//     intentionally registers its receiver at runtime to avoid Play Store's
//     default-handler-only review for statically-declared SMS receivers).
//   - It IS a safety net: every ~15 minutes (Android) / ~30 minutes (iOS,
//     when the OS feels like it), the JS engine wakes for a few seconds,
//     reads any SMS that arrived since the last sync, and writes the
//     resulting transactions into the store. So a user who killed the app
//     yesterday will see today's transactions populated when the OS schedules
//     the next fetch — they just won't see them at the *moment* they happen.
//
// Lifecycle ownership:
//   - The task definition (`TaskManager.defineTask`) MUST live at module
//     scope so the OS can re-invoke it after the app is killed and Metro
//     reloads us cold. Defining inside a component would re-register on
//     every mount and lose the persisted task identity.
//   - Register/unregister calls live next to the SMS permission flag in
//     app/_layout.tsx — when the flag flips off (user revoked), the task
//     is unregistered to avoid burning cycles on a no-op fetch.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { Transaction } from '../types/transaction';
import { useAppStore } from '../store/useAppStore';
import { notifyTransactionDetected } from './notificationService';
import { checkSmsPermission, isSmsReadingSupported, readSmsSince } from './smsReader';

export const SMS_SYNC_TASK = 'flowmoney-sms-sync-v1';
const LAST_SYNC_KEY = 'flowmoney:lastSmsSyncTimestamp';

// Smallest interval the OS will honour. Android usually delivers ~15 min;
// iOS treats this as a hint and may fire much less often based on usage
// patterns — there is no way around the platform's discretion here.
const FETCH_INTERVAL_SECONDS = 15 * 60;

// ─── Task body ──────────────────────────────────────────────────────────────
// Defined at module scope. Re-evaluated on every cold start of the JS bundle
// (which is exactly when the OS hands us back the registered task name), so
// it must never close over component state.
TaskManager.defineTask(SMS_SYNC_TASK, async () => {
  try {
    if (!isSmsReadingSupported()) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
    if (!(await checkSmsPermission())) {
      // Permission revoked while we were idle — nothing to do, and the
      // _layout.tsx hook will unregister us on next foreground.
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const since = await getLastSyncTimestamp();
    const txs = await readSmsSince(since);
    if (txs.length === 0) {
      // Bump the cursor anyway so we don't re-scan the same window forever
      // if the inbox is quiet — keeps the next fetch fast.
      await setLastSyncTimestamp(Date.now());
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // `addTransactions` returns the subset that was actually added (id-unique
    // and not a soft-duplicate). Anything already present from a prior live
    // delivery gets filtered here, so we never double-notify.
    const added = useAppStore.getState().addTransactions(txs);
    await setLastSyncTimestamp(Date.now());

    if (added.length === 0) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    await notifyForAddedTransactions(added);
    console.log(`[BackgroundSync] Reconciled ${added.length} transaction(s)`);
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (err) {
    console.warn('[BackgroundSync] Task failed:', err);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// ─── Sync cursor ────────────────────────────────────────────────────────────

async function getLastSyncTimestamp(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(LAST_SYNC_KEY);
    const parsed = raw ? parseInt(raw, 10) : NaN;
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  } catch {
    /* fall through */
  }
  // First-run fallback: look back 24h. The 30-day backfill from Profile
  // already covers historical inbox; we only need to fill the gap from "last
  // time the app was alive" to now.
  return Date.now() - 24 * 60 * 60 * 1000;
}

async function setLastSyncTimestamp(ms: number): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_SYNC_KEY, String(ms));
  } catch (err) {
    console.warn('[BackgroundSync] Failed to persist last sync timestamp:', err);
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Register the periodic background fetch task. Idempotent — calling twice
 * does not duplicate. iOS-only `startOnBoot` / `stopOnTerminate` are no-ops
 * on Android.
 */
export async function registerSmsSyncTask(): Promise<void> {
  // Background SMS only makes sense on Android; iOS can't read SMS at all.
  if (Platform.OS !== 'android') return;
  if (!isSmsReadingSupported()) return;

  try {
    const status = await BackgroundFetch.getStatusAsync();
    if (
      status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
      status === BackgroundFetch.BackgroundFetchStatus.Denied
    ) {
      console.log('[BackgroundSync] Background fetch not allowed:', status);
      return;
    }

    const isRegistered = await TaskManager.isTaskRegisteredAsync(SMS_SYNC_TASK);
    if (isRegistered) return;

    await BackgroundFetch.registerTaskAsync(SMS_SYNC_TASK, {
      minimumInterval: FETCH_INTERVAL_SECONDS,
      stopOnTerminate: false,
      startOnBoot: true,
    });
    console.log('[BackgroundSync] Task registered');
  } catch (err) {
    console.warn('[BackgroundSync] Register failed:', err);
  }
}

export async function unregisterSmsSyncTask(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(SMS_SYNC_TASK);
    if (!isRegistered) return;
    await BackgroundFetch.unregisterTaskAsync(SMS_SYNC_TASK);
    console.log('[BackgroundSync] Task unregistered');
  } catch (err) {
    console.warn('[BackgroundSync] Unregister failed:', err);
  }
}

/**
 * Foreground reconciliation — call on app start (or when the app comes to
 * the foreground) to pull in anything the background task missed since the
 * last sync. Guards on permission and platform.
 */
export async function reconcileSmsForeground(): Promise<void> {
  if (!isSmsReadingSupported()) return;
  if (!(await checkSmsPermission())) return;

  try {
    const since = await getLastSyncTimestamp();
    const txs = await readSmsSince(since);
    if (txs.length > 0) {
      const added = useAppStore.getState().addTransactions(txs);
      await setLastSyncTimestamp(Date.now());
      if (added.length > 0) {
        await notifyForAddedTransactions(added);
        console.log(`[BackgroundSync] Foreground reconciled ${added.length} transaction(s)`);
      }
      return;
    }
    await setLastSyncTimestamp(Date.now());
  } catch (err) {
    console.warn('[BackgroundSync] Foreground reconcile failed:', err);
  }
}

// ─── Notification fan-out ───────────────────────────────────────────────────
//
// Fires one notification per genuinely-new transaction, gated on the user's
// notifications preference. The OS coalesces these into a single stack on
// Android — much more useful than a single batched summary, since each
// notification is tappable and points at a specific transaction id.
//
// Errors from `scheduleNotificationAsync` are caught per-transaction so one
// bad notification can't poison the rest of the batch.
async function notifyForAddedTransactions(added: Transaction[]): Promise<void> {
  const enabled = useAppStore.getState().preferences.notificationsEnabled;
  if (!enabled) return;
  for (const tx of added) {
    try {
      await notifyTransactionDetected(tx);
    } catch (err) {
      console.warn('[BackgroundSync] notifyTransactionDetected failed:', err);
    }
  }
}
