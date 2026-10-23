"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { and, eq, inArray } from "drizzle-orm"
import { nanoid } from "nanoid"
import { ZodError, z } from "zod"

import { db } from "@/db"
import { bots, chatMembers, chats } from "@/db/schema"
import { insertBotSchema } from "@/db/validators"
import { hasPaidPlan } from "@/lib/billing"
import { createBotSandbox, deleteBotSandbox } from "@/lib/daytona"

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

  let cleanupSandbox: (() => Promise<void>) | undefined
  let createdBotId: string

  try {
    const botId = nanoid()
    const sandbox = await createBotSandbox(botId)
    cleanupSandbox = sandbox.cleanup

    const bot = await db.transaction(async (tx) => {
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

    createdBotId = bot.id
  } catch {
    if (cleanupSandbox) {
      try {
        await cleanupSandbox()
      } catch (cleanupError) {
        console.error(
          "Failed to clean up sandbox after bot creation failed.",
          cleanupError,
        )
      }
    }

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
    return { success: true }
  } catch {
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
    return { success: true }
  } catch {
    return {
      success: false,
      error: "We couldn't delete your bot. Please try again.",
    }
  }
}
