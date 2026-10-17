import "server-only"

import { auth } from "@clerk/nextjs/server"
import { and, asc, eq } from "drizzle-orm"

import { db } from "@/db"
import { bots, chatMembers, chats } from "@/db/schema"

export async function getChat(chatId: string) {
  const { userId } = await auth()

  if (!userId) return null

  const [chat] = await db
    .select({
      id: chats.id,
      name: chats.name,
      botId: bots.id,
      botName: bots.name,
      botAvatar: bots.avatar,
      botJob: bots.job,
      botInstructions: bots.instructions,
      botSandboxId: bots.sandboxId,
    })
    .from(chats)
    .leftJoin(chatMembers, eq(chatMembers.chatId, chats.id))
    .leftJoin(
      bots,
      and(eq(bots.id, chatMembers.botId), eq(bots.userId, userId)),
    )
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    .orderBy(asc(chatMembers.joinedAt))
    .limit(1)

  if (!chat) return null

  return {
    id: chat.id,
    name: chat.botName ?? chat.name ?? "New chat",
    avatar: chat.botAvatar ?? chat.id,
    bot: chat.botId
      ? {
          id: chat.botId,
          name: chat.botName ?? "New bot",
          avatar: chat.botAvatar ?? chat.botId,
          job: chat.botJob ?? "",
          instructions: chat.botInstructions,
          sandboxId: chat.botSandboxId,
        }
      : null,
  }
}
