// services/smsReader.ts
// SMS-based transaction ingestion, backed by `expo-transaction-sms-reader`.
//
// The native module ships its own confidence-scored parser. We layer the
// project's existing regex parser (smsParser.ts) as a fallback for messages
// the native parser can't decode but still look financial — this preserves
// coverage of Pakistani bank SMS formats that the local parser was tuned for.
//
// The native module is loaded *lazily* via a try/catch around require(): it
// has no JS fallback, so on iOS / Expo Go / web the module isn't present and
// a static `import` would throw at module-eval time, taking down whatever
// route imported us. Lazy-loading keeps the rest of the app functional in
// those environments — SMS features just no-op via isSmsReadingSupported().

import { Platform } from 'react-native';
import { Transaction, TransactionType } from '../types/transaction';
import { categorizeByMerchant } from './categoryEngine';
import { parseSmsTransaction } from './smsParser';

// Minimal type shape we use from the native module — kept local so we don't
// have to import the package's types (which also drag in the native binding).
type ParsedTransaction = {
  amount: number | null;
  type: 'CREDIT' | 'DEBIT' | 'UNKNOWN';
  merchant: string | null;
  sender: string | null;
  timestamp: number;
  confidence: number;
  raw: RawSmsMessage;
};
type RawSmsMessage = { id?: string; body: string; timestamp: number };

interface NativeSmsModule {
  addSmsListener: (
    cb: (e: { raw: RawSmsMessage; transaction: ParsedTransaction | null }) => void,
    opts?: { minConfidence?: number; deduplicate?: boolean }
  ) => { remove: () => void };
  getPermissionStatusAsync: () => Promise<string>;
  getRecentMessages: (opts: {
    limit?: number;
    sinceTimestamp?: number;
    onlyTransactions?: boolean;
  }) => Promise<{ raw: RawSmsMessage; transaction: ParsedTransaction | null }[]>;
  isLikelyTransactionSms: (body: string) => boolean;
  requestPermissionsAsync: () => Promise<string>;
}

// Lazy, single-shot load. require() throws synchronously if the native
// module isn't linked — we swallow it and remember `null` so subsequent
// callers don't pay the cost again.
let nativeModule: NativeSmsModule | null | undefined;
function getNativeModule(): NativeSmsModule | null {
  if (nativeModule !== undefined) return nativeModule;
  if (Platform.OS !== 'android') {
    nativeModule = null;
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    nativeModule = require('expo-transaction-sms-reader') as NativeSmsModule;
  } catch (err) {
    console.warn(
      '[SMS] expo-transaction-sms-reader native module not available — likely running in Expo Go. Build a dev client to enable SMS reading.'
    );
    nativeModule = null;
  }
  return nativeModule;
}

// Confidence threshold for accepting a native-parsed transaction without
// falling through to the regex fallback. Anything above 0.5 is "needs review"
// per the package's own docs; 0.5 is a sensible default for auto-ingest.
const MIN_CONFIDENCE = 0.5;

export function isSmsReadingSupported(): boolean {
  // Android-only AND the native module must actually be linked. Both
  // conditions need to hold — Expo Go on Android also fails the second.
  return Platform.OS === 'android' && getNativeModule() !== null;
}

// ─── Permissions ──────────────────────────────────────────────────────────────

export async function requestSmsPermissions(): Promise<boolean> {
  const mod = getNativeModule();
  if (!mod) return false;
  try {
    const status = await mod.requestPermissionsAsync();
    return status === 'granted';
  } catch (err) {
    console.warn('[SMS] Permission request error:', err);
    return false;
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

// ─── Adapter: ParsedTransaction → app Transaction ─────────────────────────────

function toDomainType(t: ParsedTransaction['type']): TransactionType {
  if (t === 'CREDIT') return 'credit';
  return 'debit'; // map UNKNOWN → debit (safer default for spending tracker)
}

function makeId(timestamp: number, raw: RawSmsMessage): string {
  const seed = raw.id ?? Math.random().toString(36).slice(2, 8);
  return `sms_${timestamp}_${seed}`;
}

function fromParsed(parsed: ParsedTransaction): Transaction | null {
  if (parsed.amount == null || parsed.amount <= 0) return null;
  const merchant = (parsed.merchant ?? parsed.sender ?? 'Unknown').slice(0, 40);
  const type = toDomainType(parsed.type);
  return {
    id: makeId(parsed.timestamp, parsed.raw),
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

function fromRawWithFallback(raw: RawSmsMessage): Transaction | null {
  const mod = getNativeModule();
  if (!mod) return null;
  if (!mod.isLikelyTransactionSms(raw.body)) return null;
  return parseSmsTransaction(raw.body, raw.timestamp);
}

function ingest(
  raw: RawSmsMessage,
  parsed: ParsedTransaction | null
): Transaction | null {
  if (parsed && parsed.confidence >= MIN_CONFIDENCE) {
    const tx = fromParsed(parsed);
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
      const tx = ingest(row.raw, row.transaction);
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
      const tx = ingest(row.raw, row.transaction);
      if (tx) txs.push(tx);
    }
    return txs;
  } catch {
    return [];
  }
}

// ─── Real-time listener ───────────────────────────────────────────────────────
//
// The native module handles 5-second deduplication and auto-starts/stops the
// receiver based on listener count, so a single subscription is all we need.

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
    subscription = mod.addSmsListener(
      ({ raw, transaction }) => {
        const tx = ingest(raw, transaction);
        if (tx) onNewTransaction(tx);
      },
      { minConfidence: 0, deduplicate: true }
    );
    console.log('[SMS] Real-time listener active');
  })();

  return () => {
    subscription?.remove();
    subscription = null;
    console.log('[SMS] Listener cleaned up');
  };
}

// Backwards compat aliases
export const startSmsPolling = startSmsListener;
export const requestSmsPermission = requestSmsPermissions;
