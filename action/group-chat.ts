"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { and, eq, inArray } from "drizzle-orm"
import { ZodError } from "zod"

import { db } from "@/db"
import { bots, chatMembers, chats } from "@/db/schema"
import { insertGroupChatSchema } from "@/db/validators"

export async function createGroupChat(
  input: unknown
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Sign in before creating a group chat." }
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
    return { success: true, id: chatId }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error && error.message.startsWith("Choose bots")
          ? error.message
          : "We couldn't create the group chat. Please try again.",
    }
  }
}
