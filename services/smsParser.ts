// services/smsParser.ts
// Regex-based SMS transaction parser for Pakistani bank formats
// Supports HBL, UBL, MCB, Meezan, Easypaisa, JazzCash

import { Transaction, TransactionCategory, TransactionType } from '../types/transaction';
import { categorizeByMerchant } from './categoryEngine';

interface ParsedSms {
  amount: number;
  merchant: string;
  type: TransactionType;
  timestamp: number;
  rawSms: string;
}

// ─── SMS Patterns ────────────────────────────────────────────────────────────

const DEBIT_PATTERNS = [
  // HBL: "Rs. 850 spent at McDonald's via HBL Debit Card"
  /(?:Rs\.?|PKR)\s*([\d,]+(?:\.\d{2})?)\s+(?:spent|debited|paid|deducted)\s+(?:at|from|to|via)?\s*([A-Za-z0-9\s&'.-]+?)(?:\s+via|\s+on|\s+using|\.|\s*$)/i,
  // UBL: "Debit of Rs. 1,200 from your account at Foodpanda"
  /[Dd]ebit\s+of\s+(?:Rs\.?|PKR)\s*([\d,]+(?:\.\d{2})?)\s+(?:from|at)\s+(?:your\s+account\s+at\s+)?([A-Za-z0-9\s&'.-]+?)(?:\s+on|\s+using|\.|\s*$)/i,
  // MCB: "PKR 2500.00 has been deducted from your account for Daraz"
  /(?:Rs\.?|PKR)\s*([\d,]+(?:\.\d{2})?)\s+has\s+been\s+(?:deducted|debited)\s+(?:from\s+your\s+account\s+for\s+)?([A-Za-z0-9\s&'.-]+?)(?:\s+on|\.|$)/i,
  // Easypaisa: "Rs.850 sent to McDonald's from your Easypaisa Account"
  /(?:Rs\.?)\s*([\d,]+(?:\.\d{2})?)\s+sent\s+to\s+([A-Za-z0-9\s&'.-]+?)\s+from/i,
  // Generic debit
  /(?:Rs\.?|PKR)\s*([\d,]+(?:\.\d{2})?)\s+(?:charged|withdrawn)\s+(?:at|from|for)\s+([A-Za-z0-9\s&'.-]+?)(?:\.|$)/i,
];

const CREDIT_PATTERNS = [
  // HBL: "Rs. 45,000 credited to your HBL account"
  /(?:Rs\.?|PKR)\s*([\d,]+(?:\.\d{2})?)\s+credited\s+(?:to\s+your\s+)?(?:account|HBL|UBL|MCB)?/i,
  // Salary: "Salary of PKR 45000 deposited"
  /[Ss]alary\s+(?:of\s+)?(?:Rs\.?|PKR)\s*([\d,]+(?:\.\d{2})?)/i,
  // Transfer received
  /(?:Rs\.?|PKR)\s*([\d,]+(?:\.\d{2})?)\s+(?:received|deposited|transferred\s+to\s+your)/i,
];

// ─── Parser ──────────────────────────────────────────────────────────────────

export function parseSmsTransaction(
  smsBody: string,
  timestamp: number = Date.now()
): Transaction | null {
  const cleaned = smsBody.trim().replace(/\s+/g, ' ');

  // Try debit patterns first
  for (const pattern of DEBIT_PATTERNS) {
    const match = cleaned.match(pattern);
    if (match) {
      const amount = parseAmount(match[1]);
      const merchant = cleanMerchantName(match[2] || 'Unknown');
      if (amount <= 0) continue;

      return buildTransaction({
        amount,
        merchant,
        type: 'debit',
        timestamp,
        rawSms: smsBody,
      });
    }
  }

  // Try credit patterns
  for (const pattern of CREDIT_PATTERNS) {
    const match = cleaned.match(pattern);
    if (match) {
      const amount = parseAmount(match[1]);
      if (amount <= 0) continue;

      const merchant = isSalaryMessage(cleaned) ? 'Salary Credit' : 'Transfer Received';

      return buildTransaction({
        amount,
        merchant,
        type: 'credit',
        timestamp,
        rawSms: smsBody,
      });
    }
  }

  return null;
}

function buildTransaction(parsed: ParsedSms): Transaction {
  const category = categorizeByMerchant(parsed.merchant, parsed.type);

  return {
    id: `sms_${parsed.timestamp}_${Math.random().toString(36).slice(2, 7)}`,
    amount: parsed.amount,
    merchant: parsed.merchant,
    category,
    type: parsed.type,
    timestamp: parsed.timestamp,
    rawSms: parsed.rawSms,
    isManual: false,
    isImportant: parsed.amount >= 5000 || parsed.type === 'credit',
    source: 'sms',
  };
}

function parseAmount(raw: string): number {
  const cleaned = raw.replace(/,/g, '').trim();
  return parseFloat(cleaned) || 0;
}

function cleanMerchantName(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/['"]/g, '')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
    .slice(0, 40);
}

function isSalaryMessage(sms: string): boolean {
  return /salary|payroll|wages/i.test(sms);
}

// ─── Batch Parse ─────────────────────────────────────────────────────────────

export function batchParseSms(
  messages: Array<{ body: string; timestamp: number }>
): Transaction[] {
  return messages
    .map((m) => parseSmsTransaction(m.body, m.timestamp))
    .filter((t): t is Transaction => t !== null);
}
