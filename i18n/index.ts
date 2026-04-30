// i18n/index.ts
// Single source of truth for translation strings.
//
// Stack:
//   - `i18n-js` v4 for the lookup + interpolation engine.
//   - `expo-localization` to pick a sensible default from the device locale.
//   - Zustand `preferences.language` for the user's explicit choice
//     (`'system' | 'en' | 'ur' | 'hi'`).
//
// RTL handling:
//   - Urdu is right-to-left. We call `I18nManager.forceRTL(true)` when the
//     active locale is `ur`. Toggling RTL only takes effect after a JS
//     reload — components reading layoutDirection still get the new value
//     immediately, but native flexbox rows do not flip until the bridge
//     restarts. The language picker in Profile surfaces this caveat.
//   - English and Hindi are LTR. Switching from Urdu back to either of
//     them will also need a reload to drop RTL flexbox semantics.
//
// Why a thin custom wrapper instead of react-i18next:
//   The app's strings are static keys with parameter interpolation —
//   no plurals beyond the trivial `count` cases, no namespaces, no async
//   loading. i18n-js handles all of that in ~30 lines of integration and
//   without pulling in a second context provider tree.

import { I18n, type TranslateOptions } from 'i18n-js';
import * as Localization from 'expo-localization';
import { useMemo, useSyncExternalStore } from 'react';
import { I18nManager } from 'react-native';
import { en } from './locales/en';
import { hi } from './locales/hi';
import { ur } from './locales/ur';

export type LanguageCode = 'en' | 'ur' | 'hi';
export type LanguagePreference = 'system' | LanguageCode;

const SUPPORTED: LanguageCode[] = ['en', 'ur', 'hi'];
const RTL_LANGUAGES: ReadonlySet<LanguageCode> = new Set(['ur']);

// Singleton i18n instance — reused across every component, so changes
// propagate immediately after `setLanguage`.
const i18n = new I18n(
  { en, ur, hi },
  {
    defaultLocale: 'en',
    enableFallback: true,
    missingBehavior: 'guess',
  }
);

i18n.locale = pickInitialLocale();
applyDirection(i18n.locale as LanguageCode);

// ─── Subscriber list so React components re-render on language change ───────
// useSyncExternalStore is the lowest-overhead path — no context provider
// required, and re-renders only fire on subscribers when the version bumps.
let version = 0;
const listeners = new Set<() => void>();
function notify() {
  version += 1;
  for (const l of listeners) l();
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function getSnapshot() {
  return version;
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function getCurrentLocale(): LanguageCode {
  return resolveLocale(i18n.locale);
}

export function isRTL(): boolean {
  return RTL_LANGUAGES.has(getCurrentLocale());
}

/**
 * Apply the user's preference. `'system'` falls back to the device locale.
 *
 * Returns true if the change requires a JS reload to fully take effect
 * (i.e. the RTL/LTR direction flipped). Callers can prompt the user to
 * restart the app — `expo-updates`'s `reloadAsync` handles this in
 * production, but during development a manual relaunch is fine.
 */
export function setLanguage(pref: LanguagePreference): { reloadRequired: boolean } {
  const next = pref === 'system' ? deviceLocale() : pref;
  const previousRtl = I18nManager.isRTL;
  if (i18n.locale === next) {
    return { reloadRequired: false };
  }
  i18n.locale = next;
  applyDirection(next);
  notify();
  return { reloadRequired: previousRtl !== I18nManager.isRTL };
}

/**
 * The translation function. Stable identity per render since it closes over
 * the singleton — safe to use inline without dep-array gymnastics.
 */
export function t(key: string, options?: TranslateOptions): string {
  return i18n.t(key, options);
}

/**
 * React hook variant — components subscribe to language changes and
 * automatically re-render when `setLanguage` is called.
 */
export function useT() {
  // Subscribe to the version counter so any change to `i18n.locale`
  // triggers a re-render in this component.
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return useMemo(
    () => ({
      t,
      locale: getCurrentLocale(),
      isRTL: isRTL(),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version]
  );
}

// ─── Internals ──────────────────────────────────────────────────────────────

function pickInitialLocale(): LanguageCode {
  // Preference is hydrated later by app/_layout via `setLanguage`; this is
  // just the bootstrap default before the store rehydrates.
  return deviceLocale();
}

function deviceLocale(): LanguageCode {
  try {
    const locales = Localization.getLocales();
    for (const l of locales) {
      const code = l.languageCode?.toLowerCase();
      if (code && (SUPPORTED as string[]).includes(code)) {
        return code as LanguageCode;
      }
    }
  } catch {
    /* fall through */
  }
  return 'en';
}

function resolveLocale(raw: string | undefined | null): LanguageCode {
  const code = (raw ?? 'en').toLowerCase().split(/[-_]/)[0];
  return (SUPPORTED as string[]).includes(code) ? (code as LanguageCode) : 'en';
}

function applyDirection(locale: LanguageCode) {
  const shouldBeRTL = RTL_LANGUAGES.has(locale);
  if (I18nManager.isRTL === shouldBeRTL) return;
  // allowRTL must be true *before* forceRTL has any effect on Android.
  I18nManager.allowRTL(shouldBeRTL);
  I18nManager.forceRTL(shouldBeRTL);
  // Note: the OS doesn't pick up the new direction until the JS bundle
  // restarts. Callers of setLanguage should warn the user.
}
