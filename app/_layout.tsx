// app/_layout.tsx
// Root layout — owns lifecycle concerns that should outlive any single screen:
//   1. Font loading + splash screen
//   2. Store rehydration from AsyncStorage
//   3. SMS listener (always-on while the app is alive)
//   4. Notification permission + transaction-arrived alerts
//   5. Subscription/insight regeneration on new transactions

import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { detectSubscriptions } from '../services/subscriptionDetector';
import { generateInsights } from '../services/insightEngine';
import {
  notifyTransactionDetected,
  requestNotificationPermissions,
} from '../services/notificationService';
import {
  checkSmsPermission,
  isSmsReadingSupported,
  startSmsListener,
} from '../services/smsReader';
import { useAppStore } from '../store/useAppStore';

// Keep the native splash up until our JS root is ready to lay out.
// Catch the rejection: on Fast Refresh the splash may already be unregistered
// for this view controller, and the resulting unhandled promise spams the
// console with "No native splash screen registered for given view controller".
SplashScreen.preventAutoHideAsync().catch(() => {
  /* already prevented or VC not registered — safe to ignore */
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const hydrate = useAppStore((s) => s.hydrate);

  const [fontsLoaded, fontError] = useFonts({
    'DMSans-Regular': require('../assets/fonts/DMSans-Regular.ttf'),
    'DMSans-Medium': require('../assets/fonts/DMSans-Medium.ttf'),
    'DMSans-SemiBold': require('../assets/fonts/DMSans-SemiBold.ttf'),
    'DMSans-Bold': require('../assets/fonts/DMSans-Bold.ttf'),
    'DMMono-Regular': require('../assets/fonts/DMMono-Regular.ttf'),
    'DMMono-Medium': require('../assets/fonts/DMMono-Medium.ttf'),
  });

  // Hydrate the store as soon as fonts resolve (loaded OR errored — we still
  // boot the app rather than hang on a missing font).
  useEffect(() => {
    if (fontsLoaded || fontError) {
      hydrate();
    }
  }, [fontsLoaded, fontError, hydrate]);

  // The recommended Expo pattern: hide the splash from the root View's
  // onLayout, AFTER React has actually laid out the first frame. Hiding from
  // useEffect can fire before the view controller has the splash mounted on
  // iOS, which is the source of the "No native splash screen registered"
  // promise rejection. Always swallow the rejection — repeated calls during
  // Fast Refresh otherwise pollute the dev console.
  const onRootLayout = useCallback(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {
        /* splash already hidden or VC changed — safe to ignore */
      });
    }
  }, [fontsLoaded, fontError]);

  // Always-on SMS listener + notifications. Owned at the root so it survives
  // tab navigation. Tears down on unmount.
  useSmsAutoIngest();

  // When transactions change, re-derive subscriptions and insights.
  useDerivedAnalyticsRefresh();

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.root} onLayout={onRootLayout}>
      <SafeAreaProvider>
        <Animated.View style={styles.root} entering={FadeIn.duration(300)}>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
            <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
            <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
            <Stack.Screen
              name="transaction/[id]"
              options={{ animation: 'slide_from_bottom', presentation: 'transparentModal' }}
            />
            <Stack.Screen
              name="chat"
              options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
            />
            <Stack.Screen
              name="add-transaction"
              options={{ animation: 'slide_from_bottom', presentation: 'transparentModal' }}
            />
          </Stack>
        </Animated.View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// ─── Always-on SMS auto-ingest ───────────────────────────────────────────────

function useSmsAutoIngest() {
  const smsGranted = useAppStore((s) => s.preferences.smsPermissionGranted);
  const notificationsEnabled = useAppStore((s) => s.preferences.notificationsEnabled);
  const setSmsPermission = useAppStore((s) => s.setSmsPermission);
  const setNotificationsEnabled = useAppStore((s) => s.setNotificationsEnabled);
  const addTransaction = useAppStore((s) => s.addTransaction);
  const stopRef = useRef<(() => void) | null>(null);

  // Reconcile the persisted SMS-granted flag with the actual OS permission
  // on every cold start. The user might have revoked permission outside the app.
  useEffect(() => {
    if (!isSmsReadingSupported()) return;
    let cancelled = false;
    (async () => {
      const actuallyGranted = await checkSmsPermission();
      if (cancelled) return;
      if (actuallyGranted !== smsGranted) {
        setSmsPermission(actuallyGranted);
      }
    })();
    return () => {
      cancelled = true;
    };
    // We only want this to run once after rehydrate to reconcile the flag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Once notifications are enabled, ask for OS permission. This is a no-op if
  // it's already granted.
  useEffect(() => {
    if (!notificationsEnabled) return;
    let cancelled = false;
    (async () => {
      const token = await requestNotificationPermissions();
      if (cancelled) return;
      if (!token) {
        // User denied — flip the flag back so the UI stays in sync with reality.
        setNotificationsEnabled(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [notificationsEnabled, setNotificationsEnabled]);

  // Start / stop the SMS listener as the permission flag flips.
  useEffect(() => {
    if (!isSmsReadingSupported()) return;
    if (!smsGranted) {
      stopRef.current?.();
      stopRef.current = null;
      return;
    }
    if (stopRef.current) return;

    stopRef.current = startSmsListener(
      (tx) => {
        addTransaction(tx);
        // Fire a local notification iff the user has opted in. The
        // notification service already guards against credit transactions.
        if (notificationsEnabled) {
          void notifyTransactionDetected(tx);
        }
      },
      () => {
        // Listener observed permission revocation.
        setSmsPermission(false);
      }
    );

    return () => {
      stopRef.current?.();
      stopRef.current = null;
    };
  }, [smsGranted, notificationsEnabled, addTransaction, setSmsPermission]);
}

// ─── Derived analytics refresh ───────────────────────────────────────────────
// Whenever the transaction list changes, regenerate subscriptions and insights.
// Both detectors are pure functions over the in-memory list, so this is cheap.
function useDerivedAnalyticsRefresh() {
  const transactions = useAppStore((s) => s.transactions);
  const summary = useAppStore((s) => s.summary);
  const setSubscriptions = useAppStore((s) => s.setSubscriptions);
  const setInsights = useAppStore((s) => s.setInsights);
  const existingInsights = useAppStore((s) => s.insights);

  useEffect(() => {
    if (!transactions.length) {
      setSubscriptions([]);
      setInsights([]);
      return;
    }
    setSubscriptions(detectSubscriptions(transactions));
    if (summary) {
      // Preserve isRead state across regeneration, keyed by id.
      const readIds = new Set(existingInsights.filter((i) => i.isRead).map((i) => i.id));
      const fresh = generateInsights(transactions, summary).map((i) =>
        readIds.has(i.id) ? { ...i, isRead: true } : i
      );
      setInsights(fresh);
    }
    // existingInsights is intentionally excluded to avoid loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, summary, setSubscriptions, setInsights]);
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
