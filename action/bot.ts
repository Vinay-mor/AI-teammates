"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { and, count, eq, inArray, sql } from "drizzle-orm"
import { nanoid } from "nanoid"
import { ZodError, z } from "zod"
import * as Sentry from "@sentry/nextjs"

import { db } from "@/db"
import { bots, chatMembers, chats } from "@/db/schema"
import { insertBotSchema } from "@/db/validators"
import { hasPaidPlan } from "@/lib/billing"
import { createBotSandbox, deleteBotSandbox } from "@/lib/daytona"
import { MAX_PRO_BOTS, reserveUsage, settleUsageReservation, UsageLimitError } from "@/lib/usage"

type CreateBotResult =
  | { success: true; id: string }
  | { success: false; error: string; upgradeRequired?: boolean }

export async function createBot(input: unknown): Promise<CreateBotResult> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Sign in before creating a bot." }
  }

  if (!(await hasPaidPlan())) {
    return {
      success: false,
      error: "A paid plan is required to create bots and sandboxes.",
      upgradeRequired: true,
    }
  }

  let botInput

  try {
    botInput = insertBotSchema.parse(input)
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        error:
          error.issues[0]?.message ?? "Check the bot details and try again.",
      }
    }

    throw error
  }

  const [{ botCount }] = await db
    .select({ botCount: count() })
    .from(bots)
    .where(eq(bots.userId, userId))
  if (botCount >= MAX_PRO_BOTS) {
    return {
      success: false,
      error: `Your Pro plan supports up to ${MAX_PRO_BOTS} bots and sandboxes. Delete a bot before creating another.`,
    }
  }

  let cleanupSandbox: (() => Promise<void>) | undefined
  let createdBotId: string
  const botId = nanoid()
  const sandboxUsageKey = `sandbox:create:${botId}`
  const reservedSandboxSeconds = 15 * 60
  const sandboxStartedAt = Date.now()
  let sandboxUsageReserved = false

  try {
    await reserveUsage({
      userId,
      resource: "sandbox_seconds",
      amount: reservedSandboxSeconds,
      eventKey: `${sandboxUsageKey}:reserve`,
    })
    sandboxUsageReserved = true
    const sandbox = await createBotSandbox(botId)
    cleanupSandbox = sandbox.cleanup
    await settleUsageReservation({
      userId,
      resource: "sandbox_seconds",
      reserved: reservedSandboxSeconds,
      actual: Math.max(1, Math.ceil((Date.now() - sandboxStartedAt) / 1000)),
      eventKey: `${sandboxUsageKey}:settle`,
      reservationEventKey: `${sandboxUsageKey}:reserve`,
    })
    sandboxUsageReserved = false

    const bot = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`)
      const [{ botCount: currentBotCount }] = await tx
        .select({ botCount: count() })
        .from(bots)
        .where(eq(bots.userId, userId))
      if (currentBotCount >= MAX_PRO_BOTS) return null

      const [createdBot] = await tx
        .insert(bots)
        .values({
          ...botInput,
          id: botId,
          userId,
          sandboxId: sandbox.id,
        })
        .returning({ id: bots.id })

      const [chat] = await tx
        .insert(chats)
        .values({ userId, kind: "direct" })
        .returning({ id: chats.id })

      await tx.insert(chatMembers).values({
        chatId: chat.id,
        botId: createdBot.id,
      })

      return createdBot
    })

    if (!bot) {
      if (cleanupSandbox) await cleanupSandbox()
      cleanupSandbox = undefined
      return {
        success: false,
        error: `Your Pro plan supports up to ${MAX_PRO_BOTS} bots and sandboxes. Delete a bot before creating another.`,
      }
    }

    createdBotId = bot.id
    Sentry.logger.info("bot.created", {
      "app.bot.id": createdBotId,
      "app.bot.sandbox_id": sandbox.id,
    })
  } catch (error) {
    if (sandboxUsageReserved) try {
      await settleUsageReservation({
        userId,
        resource: "sandbox_seconds",
        reserved: reservedSandboxSeconds,
        actual: Math.max(1, Math.ceil((Date.now() - sandboxStartedAt) / 1000)),
        eventKey: `${sandboxUsageKey}:settle`,
        reservationEventKey: `${sandboxUsageKey}:reserve`,
      })
    } catch (usageError) {
      console.error("Failed to settle sandbox creation usage.", usageError)
      Sentry.logger.error("bot.create.usage_settlement_failed", {
        "app.bot.id": botId,
        "error.type": usageError instanceof Error ? usageError.name : "unknown",
      })
    }
    if (cleanupSandbox) {
      try {
        await cleanupSandbox()
      } catch (cleanupError) {
        console.error("Failed to clean up sandbox after bot creation failed.", cleanupError)
        Sentry.logger.error("bot.create.sandbox_cleanup_failed", {
          "app.bot.id": botId,
          "error.type": cleanupError instanceof Error ? cleanupError.name : "unknown",
        })
      }
    }

    if (error instanceof UsageLimitError) {
      Sentry.logger.warn("bot.create.rejected_by_usage_limit", {
        "app.bot.id": botId,
      })
      return { success: false, error: error.message }
    }
    console.error("Failed to create bot.", error)
    Sentry.logger.error("bot.create.failed", {
      "app.bot.id": botId,
      "error.type": error instanceof Error ? error.name : "unknown",
    })
    Sentry.captureException(error)
    return {
      success: false,
      error: "We couldn't create your bot. Please try again.",
    }
  }

  revalidatePath("/")
  return { success: true, id: createdBotId }
}

export async function updateBot(
  rawBotId: unknown,
  input: unknown,
): Promise<{ success: true } | { success: false; error: string }> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Sign in before updating a bot." }
  }

  const botIdResult = z.string().trim().min(1).safeParse(rawBotId)
  if (!botIdResult.success) {
    return { success: false, error: "We couldn't find that bot to update." }
  }

  let botInput

  try {
    botInput = insertBotSchema.parse(input)
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        error:
          error.issues[0]?.message ?? "Check the bot details and try again.",
      }
    }

    throw error
  }

  try {
    const [updatedBot] = await db
      .update(bots)
      .set({
        name: botInput.name,
        avatar: botInput.avatar,
        job: botInput.job,
        instructions: botInput.instructions,
      })
      .where(and(eq(bots.id, botIdResult.data), eq(bots.userId, userId)))
      .returning({ id: bots.id })

    if (!updatedBot) {
      return { success: false, error: "We couldn't find that bot to update." }
    }

    revalidatePath("/", "layout")
    Sentry.logger.info("bot.updated", { "app.bot.id": updatedBot.id })
    return { success: true }
  } catch (error) {
    console.error("Failed to update bot.", error)
    Sentry.logger.error("bot.update.failed", {
      "app.bot.id": botIdResult.data,
      "error.type": error instanceof Error ? error.name : "unknown",
    })
    Sentry.captureException(error)
    return {
      success: false,
      error: "We couldn't update your bot. Please try again.",
    }
  }
}

export async function deleteBot(
  rawBotId: unknown,
): Promise<{ success: true } | { success: false; error: string }> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Sign in before deleting a bot." }
  }

  const botIdResult = z.string().trim().min(1).safeParse(rawBotId)
  if (!botIdResult.success) {
    return { success: false, error: "We couldn't find that bot to delete." }
  }

  try {
    const [ownedBot] = await db
      .select({ id: bots.id, sandboxId: bots.sandboxId })
      .from(bots)
      .where(and(eq(bots.id, botIdResult.data), eq(bots.userId, userId)))
      .limit(1)

    if (!ownedBot) {
      return { success: false, error: "We couldn't find that bot to delete." }
    }

    if (ownedBot.sandboxId) {
      await deleteBotSandbox(ownedBot.sandboxId)
    }

    const deleted = await db.transaction(async (tx) => {
      const [ownedBot] = await tx
        .select({ id: bots.id })
        .from(bots)
        .where(and(eq(bots.id, botIdResult.data), eq(bots.userId, userId)))
        .limit(1)

      if (!ownedBot) return false

      const directChats = await tx
        .select({ id: chats.id })
        .from(chats)
        .innerJoin(chatMembers, eq(chatMembers.chatId, chats.id))
        .where(
          and(
            eq(chatMembers.botId, ownedBot.id),
            eq(chats.userId, userId),
            eq(chats.kind, "direct"),
          ),
        )

      if (directChats.length > 0) {
        await tx.delete(chats).where(
          inArray(
            chats.id,
            directChats.map((chat) => chat.id),
          ),
        )
      }

      const [deletedBot] = await tx
        .delete(bots)
        .where(and(eq(bots.id, ownedBot.id), eq(bots.userId, userId)))
        .returning({ id: bots.id })

      return Boolean(deletedBot)
    })

    if (!deleted) {
      return { success: false, error: "We couldn't find that bot to delete." }
    }

    revalidatePath("/", "layout")
    Sentry.logger.info("bot.deleted", { "app.bot.id": botIdResult.data })
    return { success: true }
  } catch (error) {
    console.error("Failed to delete bot.", error)
    Sentry.logger.error("bot.delete.failed", {
      "app.bot.id": botIdResult.data,
      "error.type": error instanceof Error ? error.name : "unknown",
    })
    Sentry.captureException(error)
    return {
      success: false,
      error: "We couldn't delete your bot. Please try again.",
    }
  }
}
