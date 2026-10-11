"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { ZodError } from "zod"

import { db } from "@/db"
import { bots, chatMembers, chats } from "@/db/schema"
import { insertBotSchema } from "@/db/validators"

type CreateBotResult =
  { success: true; id: string } | { success: false; error: string }

export async function createBot(input: unknown): Promise<CreateBotResult> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Sign in before creating a bot." }
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
    const bot = await db.transaction(async (tx) => {
      const [createdBot] = await tx
        .insert(bots)
        .values({ ...botInput, userId })
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

    revalidatePath("/")

    return { success: true, id: bot.id }
  } catch {
    return {
      success: false,
      error: "We couldn't create your bot. Please try again.",
    }
  }
}
