// services/smsReader.ts
// SMS-based transaction ingestion, backed by `expo-transaction-sms-reader`.
//
// This is the single adapter between the package's rich `ParsedTransaction`
// shape and our internal `Transaction`. It also adds:
//   - confidence threshold (auto-ingest only at >= MIN_CONFIDENCE)
//   - `FAILED`/`PENDING` filtering so reversed/declined charges don't get
//     counted as completed debits
//   - `ignoreOtp: true` on the live listener so OTP traffic never reaches
//     the spending feed
//   - regex fallback (smsParser.ts) for messages the package can't decode
//     but still match Pakistani bank formats the local parser was tuned for
//
// The native module is loaded lazily via `require()` — `expo-transaction-sms-reader`
// throws at import time on iOS / Expo Go where the binding isn't linked, so a
// static `import` would crash any route that imports this file. Lazy-loading
// keeps the rest of the app functional in those environments — SMS features
// just no-op via `isSmsReadingSupported()`.
//
// Types are imported via `import type` (erased at runtime), so we get the
// real package types without triggering the native binding load.

import { Platform } from 'react-native';
import type {
  ParsedTransaction as PackageParsedTransaction,
  SmsPermissionStatus,
  SmsReceivedEvent,
  StartListeningOptions,
} from 'expo-transaction-sms-reader';
import { Transaction, TransactionType } from '../types/transaction';
import { categorizeByMerchant } from './categoryEngine';
import { parseSmsTransaction } from './smsParser';

// ─── Lazy module load ─────────────────────────────────────────────────────────

type SmsModule = typeof import('expo-transaction-sms-reader');

let cachedModule: SmsModule | null | undefined;
function getNativeModule(): SmsModule | null {
  if (cachedModule !== undefined) return cachedModule;
  if (Platform.OS !== 'android') {
    cachedModule = null;
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedModule = require('expo-transaction-sms-reader') as SmsModule;
  } catch {
    console.warn(
      '[SMS] expo-transaction-sms-reader native module not available — likely running in Expo Go. Build a dev client to enable SMS reading.'
    );
    cachedModule = null;
  }
  return cachedModule;
}

// Confidence threshold for accepting a native-parsed transaction without
// falling through to the regex fallback. Below 0.5 the package's own docs
// label results as "needs review" — auto-ingesting them generates noise.
const MIN_CONFIDENCE = 0.5;

export function isSmsReadingSupported(): boolean {
  return Platform.OS === 'android' && getNativeModule() !== null;
}

// ─── Permissions ──────────────────────────────────────────────────────────────

export async function requestSmsPermissions(): Promise<boolean> {
  return (await requestSmsPermissionsDetailed()) === 'granted';
}

/**
 * Request SMS permissions and return the full status. Use this when the
 * caller needs to distinguish `'denied'` (user can be re-prompted) from
 * `'blocked'` (user picked "Don't ask again" — only system settings can fix).
 */
export async function requestSmsPermissionsDetailed(): Promise<SmsPermissionStatus> {
  const mod = getNativeModule();
  if (!mod) return 'denied';
  try {
    return await mod.requestPermissionsAsync();
  } catch (err) {
    console.warn('[SMS] Permission request error:', err);
    return 'denied';
  }
}

export async function checkSmsPermission(): Promise<boolean> {
  const mod = getNativeModule();
  if (!mod) return false;
  try {
    return (await mod.getPermissionStatusAsync()) === 'granted';
  } catch {
    return false;
  }
}

/**
 * Detailed permission status. `'blocked'` means the user picked
 * "Don't ask again" — `requestSmsPermissions()` will silently resolve to
 * `false` in that state, and the caller must route them to system settings
 * via {@link openSmsSettings}.
 */
export async function getSmsPermissionStatus(): Promise<SmsPermissionStatus> {
  const mod = getNativeModule();
  if (!mod) return 'denied';
  try {
    return await mod.getPermissionStatusAsync();
  } catch {
    return 'denied';
  }
}

/**
 * Open the host app's system settings page. Pair with the BLOCKED status to
 * give users a one-tap path back to the SMS permission screen.
 */
export async function openSmsSettings(): Promise<void> {
  const mod = getNativeModule();
  if (!mod) return;
  try {
    await mod.openAppSettings();
  } catch (err) {
    console.warn('[SMS] openAppSettings failed:', err);
  }
}

// ─── Adapter: package ParsedTransaction → app Transaction ────────────────────

function toDomainType(t: PackageParsedTransaction['type']): TransactionType {
  if (t === 'CREDIT') return 'credit';
  // Map UNKNOWN → debit (safer default for a spending tracker — false-positive
  // debits surface in the feed, false-positive credits would silently inflate
  // the user's perceived balance).
  return 'debit';
}

function makeId(parsed: PackageParsedTransaction): string {
  // Prefer the content-provider id (stable across re-reads of the inbox).
  // Fall back to the bank reference (RRN / UPI ref — stable across the live
  // broadcast → persisted-row transition). Random is the last resort; the
  // store's soft-dedup catches the dupe by (timestamp, body) when it happens.
  const seed =
    parsed.raw.id ??
    parsed.reference ??
    Math.random().toString(36).slice(2, 8);
  return `sms_${parsed.timestamp}_${seed}`;
}

function displayLabel(parsed: PackageParsedTransaction): string {
  // `merchant` is the counterparty (e.g. "AMAZON", "STARBUCKS"). When the
  // parser couldn't identify one, fall back to the canonical bank id, then
  // the raw sender. Slice keeps row layouts honest on long DLT short codes.
  const candidate = parsed.merchant ?? parsed.bankCode ?? parsed.sender;
  return (candidate ?? 'Unknown').slice(0, 40);
}

function fromParsed(parsed: PackageParsedTransaction): Transaction | null {
  // Drop transactions the bank flagged as not-completed. Without this filter
  // declined / reversed / pre-auth charges get counted as real debits and
  // distort the spending totals.
  if (parsed.status === 'FAILED' || parsed.status === 'PENDING') return null;
  if (parsed.amount === null || parsed.amount <= 0) return null;

  const merchant = displayLabel(parsed);
  const type = toDomainType(parsed.type);
  return {
    id: makeId(parsed),
    amount: parsed.amount,
    merchant,
    category: categorizeByMerchant(merchant, type),
    type,
    timestamp: parsed.timestamp,
    rawSms: parsed.raw.body,
    isManual: false,
    isImportant: parsed.amount >= 5000 || type === 'credit',
    source: 'sms',
  };
}

/** Regex fallback for SMS the package couldn't parse confidently. */
function fromRawWithFallback(raw: { body: string; timestamp: number }): Transaction | null {
  const mod = getNativeModule();
  if (!mod) return null;
  // Defense in depth — the package's classifier handles these cleanly in
  // v0.2.2+, but our regex fallback is loose and would happily misfire on
  // "Win Rs. 10,000" or a 6-digit OTP. Explicit rejection keeps it honest.
  if (mod.isLikelyPromotionalSms(raw.body)) return null;
  if (mod.isLikelyOtpSms(raw.body)) return null;
  if (!mod.isLikelyTransactionSms(raw.body)) return null;
  return parseSmsTransaction(raw.body, raw.timestamp);
}

function ingest(event: {
  raw: SmsReceivedEvent['raw'];
  transaction: PackageParsedTransaction | null;
}): Transaction | null {
  const { raw, transaction } = event;
  if (transaction && transaction.confidence >= MIN_CONFIDENCE) {
    const tx = fromParsed(transaction);
    if (tx) return tx;
  }
  return fromRawWithFallback(raw);
}

// ─── Inbox backfill ───────────────────────────────────────────────────────────

export async function readFinancialSms(daysBack: number = 30): Promise<Transaction[]> {
  const mod = getNativeModule();
  if (!mod) return [];
  if (!(await checkSmsPermission())) {
    console.log('[SMS] READ_SMS permission not granted');
    return [];
  }

  try {
    const sinceTimestamp = Date.now() - daysBack * 24 * 60 * 60 * 1000;
    const rows = await mod.getRecentMessages({
      limit: 500,
      sinceTimestamp,
      onlyTransactions: true,
    });
    const txs: Transaction[] = [];
    for (const row of rows) {
      const tx = ingest(row);
      if (tx) txs.push(tx);
    }
    console.log(`[SMS] Inbox: ${rows.length} candidates → ${txs.length} parsed`);
    return txs;
  } catch (err) {
    console.error('[SMS] Read inbox error:', err);
    return [];
  }
}

export async function readSmsSince(sinceTimestamp: number): Promise<Transaction[]> {
  const mod = getNativeModule();
  if (!mod) return [];
  if (!(await checkSmsPermission())) return [];

  try {
    const rows = await mod.getRecentMessages({
      limit: 100,
      sinceTimestamp,
      onlyTransactions: true,
    });
    const txs: Transaction[] = [];
    for (const row of rows) {
      const tx = ingest(row);
      if (tx) txs.push(tx);
    }
    return txs;
  } catch {
    return [];
  }
}

// ─── Real-time listener ───────────────────────────────────────────────────────
//
// The package's `addSmsListener` is ref-counted internally — multiple callers
// share a single native receiver, and the receiver detaches automatically when
// the last subscription is removed. We only register one subscription here
// (owned by the root layout).

export function startSmsListener(
  onNewTransaction: (tx: Transaction) => void,
  onPermissionDenied?: () => void
): () => void {
  const mod = getNativeModule();
  if (!mod) return () => {};

  let subscription: { remove: () => void } | null = null;

  (async () => {
    if (!(await checkSmsPermission())) {
      onPermissionDenied?.();
      return;
    }
    const options: StartListeningOptions = {
      // We apply our own `MIN_CONFIDENCE` gate inside `ingest`, so let the
      // package surface every parsed result and decide here.
      minConfidence: 0,
      deduplicate: true,
      // OTP messages are routed through a separate channel by the package's
      // classifier — keep them out of the spending feed.
      ignoreOtp: true,
    };
    subscription = mod.addSmsListener((event) => {
      // Skip promotional SMS that mention money ("Win Rs. 10,000", credit-card
      // offers, etc.). The package's parser already returns `transaction: null`
      // for these in v0.2.2, but the regex fallback in `ingest` is looser —
      // gate it here before it gets a chance.
      if (event.category === 'PROMOTIONAL') return;
      const tx = ingest(event);
      if (tx) onNewTransaction(tx);
    }, options);
    console.log('[SMS] Real-time listener active');
  })();

  return () => {
    subscription?.remove();
    subscription = null;
    console.log('[SMS] Listener cleaned up');
  };
}

// Backwards-compat aliases — kept so callers that grew up around earlier
// names keep compiling.
export const startSmsPolling = startSmsListener;
export const requestSmsPermission = requestSmsPermissions;
