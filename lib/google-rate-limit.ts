import { sql } from "drizzle-orm";
import { db } from "@/db";
import { googleApiRateLimits } from "@/db/schema";

// Use a little headroom under Google's 5 requests-per-minute project quota.
const REQUEST_INTERVAL_MS = 15_000;
const PROVIDER_KEY = "gemini";

async function reserveGoogleRequestSlot() {
  const [reservation] = await db
    .insert(googleApiRateLimits)
    .values({
      provider: PROVIDER_KEY,
      nextAvailableAt: sql`now() + ${REQUEST_INTERVAL_MS} * interval '1 millisecond'`,
    })
    .onConflictDoUpdate({
      target: googleApiRateLimits.provider,
      set: {
        nextAvailableAt: sql`GREATEST(${googleApiRateLimits.nextAvailableAt}, now()) + ${REQUEST_INTERVAL_MS} * interval '1 millisecond'`,
      },
    })
    .returning({
      callAt: sql<Date>`${googleApiRateLimits.nextAvailableAt} - ${REQUEST_INTERVAL_MS} * interval '1 millisecond'`.mapWith(
        (value) => (value instanceof Date ? value : new Date(String(value))),
      ),
    });

  if (!reservation) {
    throw new Error("Could not reserve a Google API request slot.");
  }

  const callAt = reservation.callAt.getTime();
  if (!Number.isFinite(callAt)) {
    throw new Error("The database returned an invalid Google API request time.");
  }
  return callAt;
}

export async function rateLimitedGoogleFetch(
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
) {
  const callAt = await reserveGoogleRequestSlot();
  const waitMs = callAt - Date.now();

  if (waitMs > 0) {
    await new Promise<void>((resolve, reject) => {
      const signal = init?.signal;
      if (signal?.aborted) {
        reject(signal.reason ?? new DOMException("The request was aborted", "AbortError"));
        return;
      }

      const timeout = setTimeout(done, waitMs);
      function done() {
        signal?.removeEventListener("abort", abort);
        resolve();
      }
      function abort() {
        clearTimeout(timeout);
        signal?.removeEventListener("abort", abort);
        reject(signal?.reason ?? new DOMException("The request was aborted", "AbortError"));
      }

      signal?.addEventListener("abort", abort, { once: true });
    });
  }

  return fetch(input, init);
}
