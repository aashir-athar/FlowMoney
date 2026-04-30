// services/groqClient.ts
// Rate-limited wrapper around groq-sdk tuned for the Groq free tier.
//
// Three layers of protection:
//   1. Min gap between requests   — blocks accidental double-sends.
//   2. Sliding per-minute window  — stays under the free-tier RPM ceiling.
//   3. 429 passthrough            — if the server rate-limits us anyway,
//      surface the retry-after as a typed error the UI can render.
//
// This is purely client-side and resets on app reload, which is fine: the
// Groq API itself is the authoritative limit. We just want to avoid the
// trivial cases where the user spams "send" and burns the quota.

import Groq from 'groq-sdk';
import type { ChatCompletionCreateParamsNonStreaming } from 'groq-sdk/resources/chat/completions';

// Free-tier safety margins — set well under the published ceilings so a
// burst of legitimate use never hits the wall.
const MAX_REQUESTS_PER_MINUTE = 20;
const MIN_GAP_MS = 1500;

// EXPO_PUBLIC_* env vars are inlined into the JS bundle at build time.
// The key is therefore extractable from the shipped app — fine for dev/MVP,
// but for production this call should sit behind a server proxy.
const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY ?? '';

const client = new Groq({ apiKey, dangerouslyAllowBrowser: true });

export class GroqRateLimitError extends Error {
  retryAfterMs: number;
  constructor(retryAfterMs: number, message: string) {
    super(message);
    this.name = 'GroqRateLimitError';
    this.retryAfterMs = Math.max(0, retryAfterMs);
  }
}

let recentTimestamps: number[] = [];
let lastRequestAt = 0;

function checkLocalLimits() {
  const now = Date.now();
  const windowStart = now - 60_000;
  recentTimestamps = recentTimestamps.filter((t) => t > windowStart);

  if (recentTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
    const oldest = recentTimestamps[0];
    const waitMs = oldest + 60_000 - now;
    throw new GroqRateLimitError(
      waitMs,
      `Too many messages this minute. Try again in ${Math.ceil(waitMs / 1000)}s.`
    );
  }

  const sinceLast = now - lastRequestAt;
  if (sinceLast < MIN_GAP_MS) {
    const waitMs = MIN_GAP_MS - sinceLast;
    throw new GroqRateLimitError(
      waitMs,
      `Slow down — sending too fast.`
    );
  }
}

function recordRequest() {
  const now = Date.now();
  recentTimestamps.push(now);
  lastRequestAt = now;
}

function parseRetryAfterMs(err: any): number {
  // groq-sdk surfaces response headers on err.headers (lowercased) for APIError
  const header =
    err?.headers?.['retry-after'] ??
    err?.response?.headers?.get?.('retry-after') ??
    err?.responseHeaders?.['retry-after'];
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
  return 30_000; // sensible default if the header is missing
}

export async function createChatCompletion(
  params: ChatCompletionCreateParamsNonStreaming
) {
  checkLocalLimits();
  recordRequest();
  try {
    return await client.chat.completions.create(params);
  } catch (err: any) {
    if (err?.status === 429) {
      const waitMs = parseRetryAfterMs(err);
      throw new GroqRateLimitError(
        waitMs,
        `Groq rate limit hit. Try again in ${Math.ceil(waitMs / 1000)}s.`
      );
    }
    throw err;
  }
}

export const hasGroqApiKey = () => apiKey.length > 0;
