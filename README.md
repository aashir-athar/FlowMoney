<div align="center">

<img src="https://raw.githubusercontent.com/aashir-athar/FlowMoney/master/assets/images/logo.jpeg" alt="FlowMoney logo" width="120" height="120" style="border-radius: 28px;" />

<h1>FlowMoney</h1>

<p><strong>Your money, clear at last — an offline-first personal finance app that turns your bank SMS into a private spending ledger.</strong></p>

[![Stars](https://img.shields.io/github/stars/aashir-athar/FlowMoney?style=for-the-badge&logo=github&color=FFD33D)](https://github.com/aashir-athar/FlowMoney/stargazers)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](#-license)
[![Last commit](https://img.shields.io/github/last-commit/aashir-athar/FlowMoney?style=for-the-badge)](https://github.com/aashir-athar/FlowMoney/commits)
[![Top language](https://img.shields.io/github/languages/top/aashir-athar/FlowMoney?style=for-the-badge)](https://github.com/aashir-athar/FlowMoney)
[![Repo size](https://img.shields.io/github/repo-size/aashir-athar/FlowMoney?style=for-the-badge)](https://github.com/aashir-athar/FlowMoney)

<br/>

![Expo SDK 54](https://img.shields.io/badge/Expo-SDK_54-000020?style=for-the-badge&logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![New Architecture](https://img.shields.io/badge/New_Architecture-enabled-7B68EE?style=for-the-badge)

<a href="#-getting-started"><strong>Get Started</strong></a> ·
<a href="#-features"><strong>Features</strong></a> ·
<a href="https://github.com/aashir-athar/FlowMoney/issues"><strong>Report Bug</strong></a> ·
<a href="https://github.com/aashir-athar/FlowMoney/issues"><strong>Request Feature</strong></a>

</div>

---

**FlowMoney** is a privacy-first, offline-first **React Native (Expo SDK 54)** personal finance and **expense tracker** app that reads your bank **SMS** alerts on-device, parses them into a private transaction ledger, and surfaces the patterns behind your spending. No spreadsheets, no manual entry, no cloud — plus a **Groq-powered AI money assistant** that grounds every answer in your real data. Built for Pakistani banks (HBL, UBL, MCB, Meezan, EasyPaisa, JazzCash, SadaPay, NayaPay, and 30+ more senders) out of the box, with a locale-agnostic architecture underneath.

> 🚧 **Active development.** FlowMoney is a feature-rich MVP in active development. SMS auto-ingest is Android-only; iOS and web run the rest of the app (Home, Feed, Insights, Chat) with SMS features safely no-op'd.

## ✨ Features

| | Feature | Description |
|---|---|---|
| 📩 | **Automatic SMS ingest** | Grant SMS permission once; every bank alert becomes a categorized transaction via a native, confidence-scored parser (`expo-transaction-sms-reader`) with an in-house regex fallback. |
| 🔄 | **Background reconciliation** | `expo-background-fetch` wakes the JS engine (~15 min on Android) to pull SMS that arrived while the app was force-quit; a foreground reconcile fires on every launch. |
| 🔒 | **Privacy-first by design** | There is no FlowMoney server. Everything lives on-device. The AI call carries only a financial summary, never your raw transactions. |
| 🔔 | **Smart local notifications** | Every genuinely-new debit or credit fires one system notification — dual-SIM dupes and broadcast retries are deduplicated in the store. |
| 🤖 | **Groq AI Money Assistant** | `llama-3.3-70b-versatile` chat grounded in your real spending summary, with a client-side rate limiter and a floating "Ask" FAB across screens. |
| 📊 | **Behavioural intelligence** | Subscription detector, insight engine, and category breakdown re-derive as new transactions land — every insight ties back to actual transactions. |
| 💾 | **Persistent ledger** | Zustand + AsyncStorage keep transactions, subscriptions, insights, and preferences across reloads, OS upgrades, and force-quits. |
| 🌐 | **Trilingual UI** | English, Urdu (RTL), and Hindi via `i18n-js` + `expo-localization`; insights are stored as `kind + params` so they re-translate on language switch. |
| ✨ | **2026 visual design** | Floating pill tab bar, Liquid Glass on iOS 26+ via `expo-glass-effect`, UI-thread Reanimated 4 motion, DM Sans / DM Mono typography. |
| ⚡ | **60fps on 2GB-RAM Android** | Every leaf component is `React.memo`'d, every renderer `useCallback`'d, and motion runs entirely on the UI thread. |

## 🛠️ Tech Stack

| Layer | Choice |
|---|---|
| **Runtime** | Expo SDK 54 · React Native 0.81 · React 19 (New Architecture) |
| **Language** | TypeScript 5.9 (strict) |
| **Routing** | Expo Router 6 (file-based, typed routes) |
| **State** | Zustand 5 + `persist` middleware |
| **Persistence** | `@react-native-async-storage/async-storage` |
| **Animation** | Reanimated 4 + Worklets 0.5 |
| **Glass / UI** | `expo-glass-effect` · `@expo/vector-icons` (Feather) · `react-native-svg` |
| **SMS** | `expo-transaction-sms-reader` · `expo-background-fetch` · `expo-task-manager` |
| **Notifications** | `expo-notifications` |
| **AI** | `groq-sdk` (`llama-3.3-70b-versatile`) |
| **i18n** | `i18n-js` + `expo-localization` |

## 🏗️ How It Works

```
SMS Inbox → expo-transaction-sms-reader → services/smsReader.ts
   → category engine → Zustand store (AsyncStorage)
       → derived analytics → UI (Expo Router + Reanimated)
                            → Groq Money Assistant
```

One direction, no surprise effects: **SMS → parse → categorize → persist → derive → render.** Long-lived effects (the SMS listener, notification firing, analytics regeneration) are owned by the root layout (`app/_layout.tsx`), so switching tabs never tears down the pipeline. All side effects are isolated in typed `services/` modules — no screen touches a native or network API directly.

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 20
- **Expo CLI** — `npm install -g expo`
- A **physical Android device** with USB debugging (emulators do not receive real SMS; the native SMS module cannot run in Expo Go)
- A free **Groq API key** — [grab one here](https://console.groq.com/keys)

### Installation

```bash
git clone https://github.com/aashir-athar/FlowMoney.git
cd FlowMoney
npm install
```

### Configure your Groq API key

```bash
cp .env.example .env
```

Then set your key in `.env`:

```bash
EXPO_PUBLIC_GROQ_API_KEY=gsk_your_key_here
```

The `EXPO_PUBLIC_` prefix is required so Expo inlines the variable into the JS bundle. `.env` is gitignored.

> ⚠️ Anything prefixed `EXPO_PUBLIC_*` ships in the bundle and is extractable — fine for dev/MVP, but move the call behind a server proxy before any public release.

### Run

The SMS reader is a native module, so you need a custom dev client (not Expo Go):

```bash
# Android — physical device, USB debugging enabled
npx expo run:android

# iOS — SMS reading is Android-only; the rest of the app runs here
npx expo run:ios
```

## 📖 Usage

1. **Onboard** — a trust-first, 3-step flow surfaces the privacy story before asking for anything.
2. **Grant SMS permission once** — the in-app `SmsPermissionSheet` explains exactly what is read (bank alerts) and what is not (everything else) before the OS prompt.
3. **Let it run** — every incoming bank SMS becomes a categorized transaction in your private ledger, with a local notification per real transaction.
4. **Ask the assistant** — tap the floating "Ask" FAB to chat with the Groq-powered Money Assistant, grounded in your actual spending.
5. **Add manually** — for anything SMS missed, add a transaction by hand from the add-transaction sheet.

<details>
<summary><strong>Available scripts</strong></summary>

```bash
npm start            # expo start
npm run android      # expo start --android
npm run ios          # expo start --ios
npm run web          # expo start --web
npm run lint         # expo lint
npm run reset-project
```

</details>

## 🗺️ Roadmap

- [x] On-device bank SMS auto-ingest with confidence-scored parsing
- [x] Background reconciliation + foreground catch-up
- [x] Persistent Zustand ledger with dedup
- [x] Groq AI Money Assistant grounded in real data
- [x] Trilingual UI (English · Urdu RTL · Hindi)
- [x] 2026 floating pill tab bar + Liquid Glass
- [ ] Server-proxied AI calls for production hardening
- [ ] Budgeting goals and spend limits surfaced in UI
- [ ] Additional locale / bank-sender packs

## 🤝 Contributing

Contributions are welcome. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repo
2. Create a branch (`git checkout -b feat/your-thing`)
3. Commit your changes
4. Push and open a Pull Request

## 📄 License

Distributed under the MIT License.

## 👤 Author

**Aashir Athar**

[![GitHub](https://img.shields.io/badge/GitHub-aashir--athar-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/aashir-athar)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-aashirathar-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/aashirathar/)
[![X](https://img.shields.io/badge/X_(Twitter)-aashirathar-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/aashirathar)

<div align="center">

<sub>Built with React Native + Expo by <a href="https://github.com/aashir-athar">aashir-athar</a> · If FlowMoney helped you, consider leaving a ⭐</sub>

<br/><br/>

<sub><strong>Keywords:</strong> react native expense tracker · expo personal finance app · bank SMS parser · offline-first money manager · privacy-first fintech · Groq AI assistant · Expo SDK 54 · TypeScript mobile app · Android budgeting app · Pakistan finance app</sub>

</div>
