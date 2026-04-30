<div align="center">

<img src="./assets/images/logo.jpeg" alt="FlowMoney" width="128" height="128" style="border-radius: 28px;" />

# FlowMoney

**Your money, clear at last.**

A 2026 React Native (Expo SDK 54) money-awareness app for Pakistani users. Reads bank SMS alerts on-device, parses them into a private transaction ledger, and surfaces the patterns behind your spending — with a Groq-powered assistant that grounds every answer in your real data.

[![Expo SDK](https://img.shields.io/badge/Expo-SDK%2054-000020?logo=expo&logoColor=white)](https://docs.expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.81-61DAFB?logo=react&logoColor=white)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![New Architecture](https://img.shields.io/badge/New%20Architecture-enabled-7B68EE)](https://reactnative.dev/architecture/landing-page)
[![License](https://img.shields.io/badge/license-MIT-green)](#license)

</div>

---

## Table of contents

- [What it is](#what-it-is)
- [Highlights](#highlights)
- [Architecture](#architecture)
- [Design philosophy](#design-philosophy)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Key technical decisions](#key-technical-decisions)
- [Performance discipline](#performance-discipline)
- [Running locally](#running-locally)
- [Configuration](#configuration)
- [Scripts](#scripts)
- [Roadmap](#roadmap)
- [License](#license)

---

## What it is

FlowMoney is the financial dashboard that builds itself. The user installs the app, grants SMS permission once, and from that moment forward every bank alert that hits their phone becomes a categorised, persisted transaction in a private, on-device ledger. No spreadsheets, no manual entry, no cloud sync.

It is built specifically for the Pakistani market — HBL, UBL, MCB, Meezan, EasyPaisa, JazzCash, NayaPay, SadaPay, and 30+ other senders are recognised out of the box — but the architecture is locale-agnostic.

## Highlights

- **Always-on SMS auto-ingest** powered by [`expo-transaction-sms-reader`](https://www.npmjs.com/package/expo-transaction-sms-reader). The listener is owned by the root layout and runs the entire time the app is alive — every incoming bank alert becomes a transaction without the user lifting a finger.
- **Lazy native module loading** — the SMS reader is `require`'d inside a try/catch so the app still boots in Expo Go, on iOS, and on web. SMS features no-op on those targets via `isSmsReadingSupported()`; everything else (Home, Feed, Insights, Chat) keeps working.
- **In-app SMS permission flow** — a `SmsPermissionSheet` explains exactly what we read (bank alerts) and what we don't (everything else) before the OS prompt fires. On a "don't ask again" denial, the sheet re-opens with an "Open Settings" CTA instead of silently failing.
- **Local notifications on every detected transaction** via `expo-notifications`. The user opts in once and gets an instant "Rs. 850 at Foodpanda" notification the moment the bank's SMS arrives.
- **Persistent ledger** via Zustand + AsyncStorage. Transactions, subscriptions, insights, notifications, and preferences survive app reloads, OS upgrades, and force-quits.
- **Manual entries & deletion** — users can add transactions by hand for things SMS missed, and delete those manual entries from the detail sheet (SMS-sourced transactions are intentionally not deletable: they'd come back on the next backfill).
- **Groq-powered Money Assistant** — `llama-3.3-70b-versatile` chat completions grounded in the user's real spending summary. Client-side rate limiter keeps free-tier usage healthy. Surfaced via a floating "Ask" FAB available across Home, Feed, and Insights — not buried in a header pill.
- **Data-grounded behavioural intelligence** — subscription detector, insight engine, category breakdown re-derived as new transactions arrive. Every insight description ties back to actual transactions (no fabricated peer comparisons, no hardcoded "Foodpanda" patterns).
- **Compact k/M/B number formatting** everywhere — `1k`, `12.5k`, `1M`, `2.3B`. One source of truth in `utils/analytics.ts#formatCurrency`; trailing-zero stripping built in.
- **2026 floating pill tab bar** — Liquid Glass on iOS 26+ via `expo-glass-effect`; solid material density on Android. UI-thread sliding accent pill, Feather icons via `@expo/vector-icons`.
- **Privacy-first** — there is no FlowMoney server. Everything is local. The Groq call carries a financial summary, never raw transactions.
- **60fps on 2GB-RAM Android** — every leaf component is `React.memo`'d, every list-item renderer is `useCallback`'d, motion runs on the UI thread.

## Architecture

```
                    ┌──────────────────────┐
                    │       SMS Inbox      │
                    │   (Android system)   │
                    └──────────┬───────────┘
                               │  native broadcast
                               ▼
                    ┌──────────────────────┐
                    │ expo-transaction-    │
                    │   sms-reader         │
                    └──────────┬───────────┘
                               │  ParsedTransaction
                               ▼
       ┌─────────────────────────────────────────────┐
       │           services/smsReader.ts             │
       │  ─ confidence-gated ingestion (≥ 0.5)      │
       │  ─ regex fallback (services/smsParser.ts)  │
       │  ─ category engine (categoryEngine.ts)     │
       └──────────────────────┬──────────────────────┘
                              │
                  ┌───────────▼───────────┐
       ┌──────────│   app/_layout.tsx     │──────────┐
       │          │  always-on listener   │          │
       │          └───────────┬───────────┘          │
       │                      │                      │
       ▼                      ▼                      ▼
┌─────────────┐    ┌──────────────────┐    ┌───────────────────┐
│ Local       │    │  Zustand store   │    │ Subscription      │
│ Notification│    │ (AsyncStorage    │    │ Detector + Insight│
│ via         │    │   persistence)   │    │ Engine            │
│ expo-       │    └────────┬─────────┘    └─────────┬─────────┘
│ notifications│            │                        │
└─────────────┘             ▼                        │
                  ┌────────────────────┐             │
                  │   utils/analytics  │ ◄───────────┘
                  │  spending summary  │
                  └─────────┬──────────┘
                            │
                            ▼
                  ┌────────────────────┐
                  │   UI (app/**)      │
                  │  Expo Router 6     │
                  │  Reanimated 4      │
                  │ expo-glass-effect  │
                  └─────────┬──────────┘
                            │
                            ▼
                  ┌────────────────────┐
                  │  Groq assistant    │
                  │ services/groqClient│
                  └────────────────────┘
```

**Data flow**: SMS → parse → categorise → store (persisted) → derived analytics → UI. One direction, no surprise effects.

**Persistence**: A single Zustand store owns the entire app state and persists the durable slices (transactions, subscriptions, insights, notifications, budget, preferences) to AsyncStorage via `zustand/middleware`. Derived state (`summary`) is recomputed on rehydrate.

**Lifecycle ownership**: Long-lived effects (SMS listener, notification firing, analytics regeneration) live in [app/_layout.tsx](app/_layout.tsx), never on a screen. Switching tabs never tears down the SMS pipeline.

**Side effects**: SMS listener and Groq calls live in `services/`. No screen calls a network or native API directly; everything goes through a typed service module.

## Design philosophy

> **Quiet luxury fintech.** Numbers are the art. Whitespace is the design.
> Motion is language, never decoration. Every pixel earns its place.

Three principles, applied without compromise:

1. **One question per screen.** Home answers "Did I overspend today?" — that's it. Insights answers "Where does it go?" — that's it. We refuse the temptation to cram. (Hick's Law: more choices means slower decisions.)
2. **Trust before ask.** Onboarding surfaces the privacy story *before* asking the user to commit to a goal. People commit to systems that feel on their side.
3. **Tactile motion only.** Springs, not timings, on every press. Animations are short (120–250ms) and they always serve a function — never to fill silence.

### 2026 visual signatures

- **Floating pill tab bar** with horizontal inset and bottom gap — the bar is *above* the content, not stuck to the chrome.
- **Display typography** — DM Sans Bold at 68pt for hero amounts. The number is the page.
- **Material differentiation** — iOS uses real Liquid Glass via `expo-glass-effect`; Android leans into opaque material density. We don't fake glass on devices that won't render it well.
- **Tabular monospaced amounts** — DM Mono for every number that needs to be read at a glance.

### Psychology applied

| Principle | Where it shows up |
|---|---|
| **Hick's Law** | Single hero metric per screen. Top-right thumb zone for primary actions. |
| **Fitts's Law** | 40pt+ tap targets, generous `hitSlop`, pill chips with full-radius edges. |
| **Progressive disclosure** | Quick prompts in chat vanish after first message. Category picker only appears when explicitly opened. |
| **Earned signals** | Pulse animation on Today's amount fires only when user is over their daily average. Never gratuitous. |
| **Calm trust** | Privacy assertions in green, never alarmist. Warning amber for unused subscriptions, never red. |
| **Operant reinforcement** | A real-time notification ("Rs. 850 at Foodpanda") delivers the same feedback loop as the bank SMS itself — except it's already categorised, so the user trusts the app more each time. |

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Runtime | Expo SDK 54 + React Native 0.81 | New Architecture, latest Reanimated, `expo-glass-effect` available |
| Routing | expo-router v6 | File-system routes, type-safe |
| State | Zustand 5 + `zustand/middleware/persist` | One store, narrow selectors, no boilerplate |
| Persistence | `@react-native-async-storage/async-storage` | Robust, well-tested, no native build hassles |
| Animations | Reanimated 4 + Worklets 0.5 | UI-thread springs, 60fps everywhere |
| Glass | `expo-glass-effect` | Real Liquid Glass on iOS 26+, graceful fallback elsewhere |
| Icons | `@expo/vector-icons` (Feather) | Lucide-style icon set, no extra dep, tree-shakeable |
| Charts | `react-native-svg` | Tiny footprint, animated via Reanimated `useAnimatedProps` |
| SMS | `expo-transaction-sms-reader` | Native confidence-scored parser; regex fallback in-house |
| Notifications | `expo-notifications` | Local notifications on transaction detection |
| AI | `groq-sdk` (`llama-3.3-70b-versatile`) | Cheap, fast, free-tier-friendly |
| Haptics | `expo-haptics` | Press feedback throughout |
| Type system | TypeScript 5.9 strict | All shared models in `types/` |

## Project structure

```
FlowMoney/
├── app/                          # expo-router screens
│   ├── _layout.tsx              # Root: fonts, store hydrate, SMS listener, notifications
│   ├── index.tsx                # Onboarding redirect
│   ├── onboarding.tsx           # 3-step trust-first onboarding
│   ├── chat.tsx                 # Groq-powered Money Assistant
│   ├── add-transaction.tsx      # Manual entry sheet
│   ├── (tabs)/                  # Bottom-nav screens
│   │   ├── _layout.tsx          # Floating pill tab bar
│   │   ├── index.tsx            # Home dashboard
│   │   ├── feed.tsx             # Transaction feed (filterable)
│   │   ├── insights.tsx         # Patterns, categories, subscriptions
│   │   └── profile.tsx          # Settings, SMS toggle, privacy
│   └── transaction/[id].tsx     # Transaction detail sheet
│
├── components/
│   ├── ui/                      # Design-system primitives
│   │   ├── AskFab.tsx           # Floating Money Assistant button
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── EmptyState.tsx       # Zero-state for Home/Feed/Insights
│   │   ├── GlassSurface.tsx     # Liquid Glass / fallback
│   │   ├── Skeleton.tsx         # Shimmer loader for hydration UI
│   │   ├── SmsPermissionSheet.tsx  # Pre-permission explainer + Open-Settings path
│   │   └── Typography.tsx
│   ├── cards/                   # Domain cards
│   │   ├── TransactionRow.tsx
│   │   ├── InsightCard.tsx      # Severity-coded icon badge, no stripe
│   │   └── SubscriptionAlert.tsx
│   └── charts/                  # SVG + Reanimated visualisations
│       ├── SpendingRing.tsx
│       ├── WeeklyBarChart.tsx   # Animated bars + average reference line
│       └── CategoryBar.tsx
│
├── store/
│   └── useAppStore.ts           # Zustand store (persisted via AsyncStorage)
│
├── services/                    # Side-effects, isolated and typed
│   ├── smsReader.ts             # expo-transaction-sms-reader adapter
│   ├── smsParser.ts             # PKR-bank regex fallback parser
│   ├── categoryEngine.ts        # Merchant → category classifier
│   ├── subscriptionDetector.ts  # Recurring-charge detector
│   ├── insightEngine.ts         # Behavioural pattern surfacer
│   ├── notificationService.ts   # expo-notifications wrapper
│   └── groqClient.ts            # Rate-limited Groq SDK wrapper
│
├── hooks/
│   ├── useTheme.ts              # System + user theme → ColorTokens
│   └── useTransactions.ts       # Memoised today/week/month/recent slicing + haptics
│
├── constants/
│   └── design.ts                # Colors, type, spacing, radius, motion, HERO_MONEY tokens
│
├── types/                       # Shared TS models — single source of truth
├── utils/analytics.ts           # Pure functions for spending math
└── assets/                      # Fonts, icons
```

## Key technical decisions

### 1. Always-on SMS listener owned by the root layout

The SMS listener is started in [app/_layout.tsx](app/_layout.tsx) inside `useSmsAutoIngest()`. It:

1. Reconciles the persisted `smsPermissionGranted` flag against the actual OS permission on every cold start (handles the case where the user revokes permission via system settings).
2. Subscribes to `expo-transaction-sms-reader`'s `addSmsListener` whenever the flag is true.
3. Calls `addTransaction(tx)` with deduplication — same id, or same merchant+amount+type within 90 seconds, is rejected.
4. Fires `notifyTransactionDetected(tx)` if notifications are enabled.

Switching tabs never tears down the listener. Force-quitting the app does (the package's listener is in-process); on next launch the user gets a 30-day backfill the moment they tap "Tap to enable" in Profile, or instantly through their existing flag if it's still granted.

### 2. AsyncStorage-persisted Zustand store

`zustand/middleware/persist` with an `AsyncStorage` adapter. We picked AsyncStorage over MMKV after running into rough edges with MMKV in this Expo SDK 54 + new-architecture setup. The persistence boundary is in [store/useAppStore.ts](store/useAppStore.ts):

```ts
persist(stateInitializer, {
  name: 'flowmoney-app-state',
  storage: createJSONStorage(() => AsyncStorage),
  partialize: (state) => ({
    transactions, subscriptions, insights, notifications, budget, preferences,
  }),
  onRehydrateStorage: () => (state) => {
    state.summary = computeSpendingSummary(state.transactions);
  },
})
```

Derived state (`summary`) is intentionally not persisted — it's recomputed on rehydrate so the user never sees stale aggregates.

### 3. `expo-transaction-sms-reader` instead of `react-native-get-sms-android`

The original prototype used `react-native-get-sms-android`, a Legacy Native Module that works under SDK 54's interop layer but isn't built for it. The new package is a first-class Expo Module with:

- a confidence-scored native parser (returns 0–0.95 score per SMS),
- automatic 5-second deduplication on inbound listeners,
- auto-attach/detach of the BroadcastReceiver based on listener count,
- an `app.plugin.js` config plugin that injects `READ_SMS` and `RECEIVE_SMS`.

The custom regex parser in [services/smsParser.ts](services/smsParser.ts) is kept as a fallback — when the native parser scores below 0.5 confidence but `isLikelyTransactionSms()` returns true, the local regex bank catches Pakistani-specific phrasings the generic parser misses.

### 4. Local notifications via `expo-notifications`

When SMS auto-ingest fires a debit transaction, the listener calls `notifyTransactionDetected(tx)`. The notification service uses templated messages so consecutive transactions don't all read the same way:

```ts
const messages = [
  `${formatCurrency(tx.amount)} at ${tx.merchant}`,
  `You just spent ${formatCurrency(tx.amount)} at ${tx.merchant}`,
  `${tx.merchant} — ${formatCurrency(tx.amount)}`,
];
```

Credit transactions don't fire notifications — there's no tension to surface and the bank already alerts on incoming money.

### 5. Groq for the chat assistant

`llama-3.3-70b-versatile` on Groq's free tier is fast (sub-second TTFT), free-tier-generous, and OpenAI-compatible. The implementation lives in [services/groqClient.ts](services/groqClient.ts) and adds three safety layers:

- **1.5s minimum gap** between requests — kills double-tap spam.
- **Sliding 60-second window** at 20 RPM — well under any free-tier ceiling.
- **429 passthrough** — if the server rate-limits anyway, the wrapper reads `retry-after` and surfaces a typed `GroqRateLimitError` that the UI renders as a live countdown on the Send button.

### 6. `expo-glass-effect` with platform-true fallback

`expo-glass-effect` ships native Liquid Glass on iOS 26+ and falls back to `View` everywhere else. We don't try to *emulate* glass on Android — emulating blur on a 2GB-RAM device is GPU-expensive and looks subtly wrong. Instead [components/ui/GlassSurface.tsx](components/ui/GlassSurface.tsx) routes platform decisions:

```tsx
if (Platform.OS === 'ios' && isLiquidGlassAvailable()) {
  return <GlassView glassEffectStyle={glassStyle} tintColor={tintColor}>{children}</GlassView>;
}
// Android / older iOS / web: solid surface, hairline border, optional float shadow
return <View style={[fallback]}>{children}</View>;
```

### 7. Floating pill tab bar with UI-thread slide animation

The active-tab indicator is a single `Animated.View` whose `translateX` is driven by a Reanimated shared value. Switching tabs runs `withSpring` on the UI thread; the JS bridge is never touched mid-gesture. See [app/(tabs)/_layout.tsx](app/(tabs)/_layout.tsx).

## Performance discipline

Built and benchmarked against the **2GB-RAM Android floor**. The rules below are enforced throughout the codebase:

- ✅ Every leaf component (`TransactionRow`, `InsightCard`, `CategoryBar`, etc.) is wrapped in `React.memo`.
- ✅ Every list-item renderer is wrapped in `useCallback`; `keyExtractor` is stable.
- ✅ `removeClippedSubviews` is enabled on long lists (Feed).
- ✅ Reanimated `useSharedValue` / `useAnimatedStyle` for *all* press, slide, and progress animations — no JS-driven `Animated.Value`.
- ✅ No `LinearGradient` *inside* list items.
- ✅ No `BlurView` on Android — `expo-glass-effect` falls back to material surfaces.
- ✅ Pulse animations only fire under earned conditions (e.g. over daily average).
- ✅ Style objects are hoisted out of render via `StyleSheet.create`.
- ✅ Selectors in Zustand are narrow — components only re-render when their slice changes.
- ✅ Fonts are pre-loaded; splash screen stays up until they're ready.
- ✅ Deduplication on transaction insert prevents thrashing when the SMS listener and inbox-backfill overlap.

## Running locally

### Prerequisites

- **Node.js** 20+
- **Expo CLI** — `npm install -g expo`
- **EAS Build** or `expo run:android` — required for the native SMS module (Expo Go cannot run it)
- A **physical Android device** (emulators do not receive real SMS)
- A **Groq API key** — [grab one free](https://console.groq.com/keys)

### Setup

```bash
git clone <repo-url> flowmoney
cd flowmoney
npm install
```

### Configure your Groq API key

Copy the example env file and drop your key in:

```bash
cp .env.example .env
```

Then edit `.env`:

```
EXPO_PUBLIC_GROQ_API_KEY=gsk_your_key_here
```

The `EXPO_PUBLIC_` prefix is required — Expo only inlines variables with that prefix into the JS bundle. `.env` is gitignored.

> ⚠️ **Production note**: any `EXPO_PUBLIC_*` env var is bundled into the JS the user can extract. Fine for development. Before any public release, move the call behind a server proxy.

### Build a custom dev client

The SMS reader is a native module, so Expo Go won't work. You need a dev client:

```bash
# Android — physical device, USB debugging enabled
npx expo run:android

# iOS (note: SMS reading is Android-only; iOS will use mocks)
npx expo run:ios
```

For a production-style build:

```bash
eas build --profile development --platform android
```

### First launch

1. Open the app, complete onboarding (3 steps).
2. Go to **Profile → SMS Reading → Tap to enable**.
3. Grant `READ_SMS` and `RECEIVE_SMS`.
4. The last 30 days of bank alerts back-fill instantly. New alerts stream in via the native listener.
5. Toggle **Notifications** on — every detected transaction now fires a system notification.

## Configuration

| Knob | Where | Default |
|---|---|---|
| Groq API key | `.env` → `EXPO_PUBLIC_GROQ_API_KEY` | — (required) |
| Chat model | `app/chat.tsx` → `GROQ_MODEL` | `llama-3.3-70b-versatile` |
| Rate limit (RPM) | `services/groqClient.ts` → `MAX_REQUESTS_PER_MINUTE` | `20` |
| Min gap (ms) | `services/groqClient.ts` → `MIN_GAP_MS` | `1500` |
| SMS confidence floor | `services/smsReader.ts` → `MIN_CONFIDENCE` | `0.5` |
| Theme | `store/useAppStore` preferences.theme | `system` |
| Soft-dup window (ms) | `store/useAppStore.ts` → `isLikelyDuplicate` | `90_000` |

## Scripts

```bash
npm run start         # Expo dev server
npm run android       # Build + launch on connected device
npm run ios           # iOS simulator / device
npm run web           # Web build (limited — no SMS)
npm run lint          # ESLint
npx tsc --noEmit      # Type-check (zero errors expected)
```

## Roadmap

- [ ] **Background SMS task** — true background processing via `expo-task-manager` so SMS is captured even when the app is killed (Android 13+ background restrictions apply).
- [ ] **Encrypted backup** — optional iCloud / Google Drive backup of the AsyncStorage blob.
- [ ] **Budget envelopes** with progress rings.
- [ ] **Multi-currency support** (USD, INR, BDT).
- [ ] **Streaming chat completions** for the assistant.
- [ ] **Backend proxy for Groq key** — production hardening.
- [ ] **Home-screen widget** showing today's spend.
- [ ] **Sentry / PostHog** for crash & funnel telemetry.
- [ ] **Localization** (Urdu, Hindi).
- [ ] **Snapshot + parser unit tests** with Jest.

## License

MIT — see LICENSE.

---

<div align="center">
<sub>Built with care for the 2GB-RAM phone in someone's pocket.</sub>
</div>
