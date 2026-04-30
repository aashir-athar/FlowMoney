// services/categoryEngine.ts
// ML-inspired rule-based category classifier
// Learns merchant associations to consistently categorize future transactions

import { TransactionCategory, TransactionType } from '../types/transaction';

// ─── Merchant Keyword Maps ────────────────────────────────────────────────────

const CATEGORY_KEYWORDS: Record<TransactionCategory, string[]> = {
  food: [
    'foodpanda', 'mcdonald', 'kfc', 'pizza hut', 'subway', 'domino',
    'burns road', 'nandos', 'hardees', 'burger king', 'dunkin', 'tim hortons',
    'cafe', 'restaurant', 'biryani', 'diner', 'kitchen', 'food', 'bakery',
    'sweets', 'chai', 'dhaba', 'karachi broast', 'student biryani',
  ],
  transport: [
    'careem', 'uber', 'bykea', 'indriver', 'fuel', 'petrol', 'pso',
    'shell', 'total', 'caltex', 'parkistan', 'parking', 'toll',
    'metro', 'bus', 'rickshaw', 'cab',
  ],
  bills: [
    'ptcl', 'hesco', 'lesco', 'kesc', 'ssgc', 'sngpl', 'electricity',
    'gas', 'water', 'internet', 'wifi', 'broadband', 'utility', 'bill',
    'nayapay bill', 'sadapay bill',
  ],
  shopping: [
    'daraz', 'amazon', 'ali express', 'khaadi', 'outfitters', 'alkaram',
    'limelight', 'gul ahmed', 'sapphire', 'nishat', 'bonanza', 'ego',
    'zara', 'h&m', 'uniqlo', 'ikea', 'hyperstar', 'metro', 'carrefour',
    'imtiaz', 'chase up', 'al-fatah', 'naheed',
  ],
  entertainment: [
    'netflix', 'youtube', 'spotify', 'apple music', 'tidal', 'hulu',
    'cinema', 'nueplex', 'atrium', 'cinestar', 'hbo', 'amazon prime',
    'disney', 'ticketmaster', 'game', 'steam',
  ],
  health: [
    'gym', 'fitness', 'anytime fitness', 'curves', 'pharmacy',
    'dawakhana', 'shifa', 'aga khan', 'hospital', 'clinic', 'doctor',
    'lab', 'diagnostic', 'vitamins', 'medico', 'ds pharma', 'health',
  ],
  subscriptions: [
    'netflix', 'spotify', 'apple', 'google one', 'dropbox', 'adobe',
    'microsoft', 'office 365', 'github', 'notion', 'canva', 'figma',
    'chatgpt', 'openai', 'antivirus', 'vpn', 'nord', 'express vpn',
  ],
  transfer: [
    'transfer', 'sent', 'received', 'salary', 'payroll', 'raast',
    'ibft', 'easypaisa', 'jazzcash', 'sadapay', 'nayapay',
  ],
  other: [],
};

// Persistent merchant memory (in production, stored in MMKV)
const merchantMemory: Map<string, TransactionCategory> = new Map();

// ─── Main Classifier ─────────────────────────────────────────────────────────

/**
 * Classify a merchant name into a spending category.
 * Priority: memory > keyword match > type fallback > other
 */
export function categorizeByMerchant(
  merchant: string,
  type: TransactionType
): TransactionCategory {
  const key = merchant.toLowerCase().trim();

  // 1. Check memory first (user corrections take precedence)
  if (merchantMemory.has(key)) {
    return merchantMemory.get(key)!;
  }

  // 2. Keyword matching
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as [
    TransactionCategory,
    string[],
  ][]) {
    for (const keyword of keywords) {
      if (key.includes(keyword.toLowerCase())) {
        // Save to memory for future use
        merchantMemory.set(key, category);
        return category;
      }
    }
  }

  // 3. Type fallback
  if (type === 'credit') return 'transfer';

  // 4. Default
  return 'other';
}

/**
 * Record a user-corrected category for a merchant.
 * This "trains" the engine for future transactions from the same merchant.
 */
export function rememberMerchantCategory(
  merchant: string,
  category: TransactionCategory
): void {
  merchantMemory.set(merchant.toLowerCase().trim(), category);
}

/**
 * Get all memorized merchant→category pairs (for export/debug)
 */
export function getMerchantMemory(): Record<string, TransactionCategory> {
  return Object.fromEntries(merchantMemory);
}
