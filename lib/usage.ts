import { createClerkClient } from "@clerk/backend"
import { and, eq, sql } from "drizzle-orm"
import { db } from "@/db"
import { bots, usageLedgerEntries, usagePeriods } from "@/db/schema"
import { PAID_PLAN_SLUG } from "@/lib/billing"

export const USAGE_LIMITS = {
  inputTokens: 4_000_000,
  outputTokens: 300_000,
  sandboxSeconds: 60 * 60 * 60,
  bots: 10,
} as const

export const MAX_PRO_BOTS = USAGE_LIMITS.bots

export type UsageResource = "input_tokens" | "output_tokens" | "sandbox_seconds"

const resourceColumn = {
  input_tokens: "inputTokens",
  output_tokens: "outputTokens",
  sandbox_seconds: "sandboxSeconds",
} as const

const resourceLimit = {
  input_tokens: USAGE_LIMITS.inputTokens,
  output_tokens: USAGE_LIMITS.outputTokens,
  sandbox_seconds: USAGE_LIMITS.sandboxSeconds,
} as const

export class UsageLimitError extends Error {
  constructor(resource: UsageResource) {
    const label = resource === "sandbox_seconds"
      ? "Daytona sandbox runtime"
      : resource === "input_tokens"
        ? "AI input tokens"
        : "AI output tokens"
    super(`Your current Pro plan has reached its ${label} limit. Usage resets with your subscription period.`)
    this.name = "UsageLimitError"
  }
}

export type UsageSnapshot = {
  plan: "pro" | "free"
  periodStart: Date | null
  periodEnd: Date | null
  inputTokens: number
  outputTokens: number
  sandboxSeconds: number
  bots: number
  limits: typeof USAGE_LIMITS
}

const subscriptionPeriodCache = new Map<
  string,
  { itemId: string; periodStart: Date; periodEnd: Date; expiresAt: number }
>()
const clerkBillingClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
})

export async function getCurrentUsagePeriod(userId: string) {
  let current = subscriptionPeriodCache.get(userId)
  if (!current || current.expiresAt <= Date.now()) {
    const subscription = await clerkBillingClient.billing.getUserBillingSubscription(userId)
    const item = subscription.subscriptionItems.find(
      (subscriptionItem) =>
        subscriptionItem.plan?.slug === PAID_PLAN_SLUG &&
        subscriptionItem.status === "active",
    )

    const periodStart = item ? new Date(item.periodStart) : null
    const periodEnd = item?.periodEnd ? new Date(item.periodEnd) : null
    if (
      subscription.status !== "active" ||
      !item ||
      !periodEnd ||
      !periodStart ||
      periodStart > new Date() ||
      periodEnd <= new Date()
    ) {
      throw new Error("An active Pro subscription is required to use metered features.")
    }

    current = {
      itemId: item.id,
      periodStart,
      periodEnd,
      expiresAt: Date.now() + 30_000,
    }
    subscriptionPeriodCache.set(userId, current)
  }

  const [period] = await db
    .insert(usagePeriods)
    .values({
      userId,
      subscriptionItemId: current.itemId,
      periodStart: current.periodStart,
      periodEnd: current.periodEnd,
    })
    .onConflictDoNothing()
    .returning()

  if (period) return period

  const [existing] = await db
    .select()
    .from(usagePeriods)
    .where(
      and(
        eq(usagePeriods.userId, userId),
        eq(usagePeriods.subscriptionItemId, current.itemId),
        eq(usagePeriods.periodStart, current.periodStart),
      ),
    )
    .limit(1)

  if (!existing) throw new Error("Could not open the current usage period.")
  return existing
}

export async function getUsageSnapshot(userId: string, isPro: boolean): Promise<UsageSnapshot> {
  if (!isPro) {
    return {
      plan: "free",
      periodStart: null,
      periodEnd: null,
      inputTokens: 0,
      outputTokens: 0,
      sandboxSeconds: 0,
      bots: 0,
      limits: USAGE_LIMITS,
    }
  }

  const period = await getCurrentUsagePeriod(userId)
  const [botCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bots)
    .where(eq(bots.userId, userId))
  return {
    plan: "pro",
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    inputTokens: period.inputTokens,
    outputTokens: period.outputTokens,
    sandboxSeconds: period.sandboxSeconds,
    bots: botCount?.count ?? 0,
    limits: USAGE_LIMITS,
  }
}

export async function reserveUsage({
  userId,
  resource,
  amount,
  eventKey,
}: {
  userId: string
  resource: UsageResource
  amount: number
  eventKey: string
}) {
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("Invalid usage reservation.")
  const period = await getCurrentUsagePeriod(userId)
  const column = resourceColumn[resource]
  const limit = resourceLimit[resource]

  return db.transaction(async (tx) => {
    await tx.execute(sql`select id from ${usagePeriods} where id = ${period.id} for update`)
    const [current] = await tx
      .select()
      .from(usagePeriods)
      .where(eq(usagePeriods.id, period.id))
      .limit(1)
    if (!current) throw new Error("Could not load the current usage period.")

    const [existing] = await tx
      .select({ id: usageLedgerEntries.id })
      .from(usageLedgerEntries)
      .where(eq(usageLedgerEntries.eventKey, eventKey))
      .limit(1)
    if (existing) return period.id

    if (current[column] + amount > limit) throw new UsageLimitError(resource)

    await tx.insert(usageLedgerEntries).values({
      periodId: period.id,
      userId,
      resource,
      amount,
      eventKey,
    })
    await tx
      .update(usagePeriods)
      .set({ [column]: current[column] + amount, updatedAt: new Date() })
      .where(eq(usagePeriods.id, period.id))

    return period.id
  })
}

export async function settleUsageReservation({
  userId,
  resource,
  reserved,
  actual,
  eventKey,
  reservationEventKey,
}: {
  userId: string
  resource: UsageResource
  reserved: number
  actual: number
  eventKey: string
  reservationEventKey: string
}) {
  const [reservation] = await db
    .select({ periodId: usageLedgerEntries.periodId })
    .from(usageLedgerEntries)
    .where(
      and(
        eq(usageLedgerEntries.eventKey, reservationEventKey),
        eq(usageLedgerEntries.userId, userId),
      ),
    )
    .limit(1)
  if (!reservation) throw new Error("The usage reservation was not found.")
  const [period] = await db
    .select()
    .from(usagePeriods)
    .where(eq(usagePeriods.id, reservation.periodId))
    .limit(1)
  if (!period) throw new Error("The original usage period was not found.")
  const column = resourceColumn[resource]
  const adjustment = actual - reserved

  await db.transaction(async (tx) => {
    await tx.execute(sql`select id from ${usagePeriods} where id = ${period.id} for update`)
    const [alreadySettled] = await tx
      .select({ id: usageLedgerEntries.id })
      .from(usageLedgerEntries)
      .where(eq(usageLedgerEntries.eventKey, eventKey))
      .limit(1)
    if (alreadySettled) return

    const [current] = await tx
      .select()
      .from(usagePeriods)
      .where(eq(usagePeriods.id, period.id))
      .limit(1)
    if (!current) throw new Error("Could not load the current usage period.")

    const next = Math.max(0, current[column] + adjustment)
    if (next > resourceLimit[resource]) throw new UsageLimitError(resource)

    await tx.insert(usageLedgerEntries).values({
      periodId: period.id,
      userId,
      resource,
      amount: adjustment,
      eventKey,
    })
    await tx
      .update(usagePeriods)
      .set({ [column]: next, updatedAt: new Date() })
      .where(eq(usagePeriods.id, period.id))
  })
}
