"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { and, eq, inArray } from "drizzle-orm"
import { ZodError, z } from "zod"
import * as Sentry from "@sentry/nextjs"

import { db } from "@/db"
import { bots, chatMembers, chats } from "@/db/schema"
import { insertGroupChatSchema } from "@/db/validators"
import { hasPaidPlan } from "@/lib/billing"

export async function createGroupChat(
  input: unknown
): Promise<
  | { success: true; id: string }
  | { success: false; error: string; upgradeRequired?: boolean }
> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Sign in before creating a group chat." }
  }

  if (!(await hasPaidPlan())) {
    return {
      success: false,
      error: "A paid plan is required to use bots and create group chats.",
      upgradeRequired: true,
    }
  }

  let groupInput
  try {
    groupInput = insertGroupChatSchema.parse(input)
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message ?? "Check the group chat details.",
      }
    }
    throw error
  }

  try {
    const chatId = await db.transaction(async (tx) => {
      const ownedBots = await tx
        .select({ id: bots.id })
        .from(bots)
        .where(
          and(eq(bots.userId, userId), inArray(bots.id, groupInput.botIds))
        )

      if (ownedBots.length !== groupInput.botIds.length) {
        throw new Error("Choose bots that belong to your account.")
      }

      const [group] = await tx
        .insert(chats)
        .values({ userId, kind: "group", name: groupInput.name })
        .returning({ id: chats.id })

      await tx
        .insert(chatMembers)
        .values(ownedBots.map((bot) => ({ chatId: group.id, botId: bot.id })))

      return group.id
    })

    revalidatePath("/", "layout")
    Sentry.logger.info("chat.group.created", {
      "app.chat.id": chatId,
      "app.chat.member_count": groupInput.botIds.length,
    })
    return { success: true, id: chatId }
  } catch (error) {
    if (!(error instanceof Error && error.message.startsWith("Choose bots"))) {
      console.error("Failed to create group chat.", error)
      Sentry.logger.error("chat.group.create_failed", {
        "error.type": error instanceof Error ? error.name : "unknown",
      })
      Sentry.captureException(error)
    }
    return {
      success: false,
      error:
        error instanceof Error && error.message.startsWith("Choose bots")
          ? error.message
          : "We couldn't create the group chat. Please try again.",
    }
  }
}

export async function updateGroupChat(
  rawChatId: unknown,
  input: unknown,
): Promise<{ success: true } | { success: false; error: string }> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Sign in before updating a group chat." }
  }

  const chatIdResult = z.string().trim().min(1).safeParse(rawChatId)
  if (!chatIdResult.success) {
    return { success: false, error: "We couldn't find that group chat." }
  }

  let groupInput
  try {
    groupInput = insertGroupChatSchema.parse(input)
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message ?? "Check the group chat details.",
      }
    }
    throw error
  }

  try {
    await db.transaction(async (tx) => {
      const [group] = await tx
        .select({ id: chats.id })
        .from(chats)
        .where(
          and(
            eq(chats.id, chatIdResult.data),
            eq(chats.userId, userId),
            eq(chats.kind, "group"),
          ),
        )
        .limit(1)

      if (!group) throw new Error("Group chat not found.")

      const ownedBots = await tx
        .select({ id: bots.id })
        .from(bots)
        .where(
          and(eq(bots.userId, userId), inArray(bots.id, groupInput.botIds)),
        )

      if (ownedBots.length !== groupInput.botIds.length) {
        throw new Error("Choose bots that belong to your account.")
      }

      await tx
        .update(chats)
        .set({ name: groupInput.name })
        .where(eq(chats.id, group.id))

      await tx.delete(chatMembers).where(eq(chatMembers.chatId, group.id))
      await tx.insert(chatMembers).values(
        ownedBots.map((bot) => ({ chatId: group.id, botId: bot.id })),
      )
    })

    revalidatePath("/", "layout")
    Sentry.logger.info("chat.group.updated", {
      "app.chat.id": chatIdResult.data,
      "app.chat.member_count": groupInput.botIds.length,
    })
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : ""
    if (message !== "Group chat not found." && !message.startsWith("Choose bots")) {
      console.error("Failed to update group chat.", error)
      Sentry.logger.error("chat.group.update_failed", {
        "app.chat.id": chatIdResult.data,
        "error.type": error instanceof Error ? error.name : "unknown",
      })
      Sentry.captureException(error)
    }
    return {
      success: false,
      error:
        message === "Group chat not found."
          ? message
          : message.startsWith("Choose bots")
            ? message
            : "We couldn't update the group chat. Please try again.",
    }
  }
}

export async function deleteGroupChat(
  rawChatId: unknown,
): Promise<{ success: true } | { success: false; error: string }> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Sign in before deleting a group chat." }
  }

  const chatIdResult = z.string().trim().min(1).safeParse(rawChatId)
  if (!chatIdResult.success) {
    return { success: false, error: "We couldn't find that group chat." }
  }

  try {
    const [deletedGroup] = await db
      .delete(chats)
      .where(
        and(
          eq(chats.id, chatIdResult.data),
          eq(chats.userId, userId),
          eq(chats.kind, "group"),
        ),
      )
      .returning({ id: chats.id })

    if (!deletedGroup) {
      return { success: false, error: "We couldn't find that group chat." }
    }

    revalidatePath("/", "layout")
    return { success: true }
  } catch (error) {
    console.error("Failed to delete group chat.", error)
    Sentry.logger.error("chat.group.delete_failed", {
      "app.chat.id": chatIdResult.data,
      "error.type": error instanceof Error ? error.name : "unknown",
    })
    Sentry.captureException(error)
    return {
      success: false,
      error: "We couldn't delete the group chat. Please try again.",
    }
  }
}
