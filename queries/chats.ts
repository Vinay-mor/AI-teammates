import "server-only"

import { auth } from "@clerk/nextjs/server"
import { and, asc, eq } from "drizzle-orm"

import { db } from "@/db"
import { bots, chatMembers, chats } from "@/db/schema"

export async function getChat(chatId: string) {
  const { userId } = await auth()

  if (!userId) return null

  const members = await db
    .select({
      id: chats.id,
      kind: chats.kind,
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
      and(eq(bots.id, chatMembers.botId), eq(bots.userId, userId))
    )
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    .orderBy(asc(chatMembers.joinedAt))

  const chat = members[0]
  if (!chat) return null

  const chatBots = members.flatMap((member) =>
    member.botId
      ? [
          {
            id: member.botId,
            name: member.botName ?? "New bot",
            avatar: member.botAvatar ?? member.botId,
            job: member.botJob ?? "",
            instructions: member.botInstructions,
            sandboxId: member.botSandboxId,
          },
        ]
      : []
  )
  const bot = chat.kind === "direct" ? (chatBots[0] ?? null) : null

  return {
    id: chat.id,
    kind: chat.kind,
    name:
      chat.kind === "group"
        ? (chat.name ?? "Group chat")
        : (bot?.name ?? "New chat"),
    avatar: bot?.avatar ?? chatBots[0]?.avatar ?? chat.id,
    bot,
    members: chatBots,
  }
}
