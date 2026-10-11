import "server-only"

import { auth } from "@clerk/nextjs/server"
import { and, asc, desc, eq } from "drizzle-orm"

import { db } from "@/db"
import { bots, chatMembers, chats } from "@/db/schema"

export async function getUserChats() {
  const { userId } = await auth()

  if (!userId) return []

  const rows = await db
    .select({
      id: chats.id,
      name: chats.name,
      lastMessagePreview: chats.lastMessagePreview,
      lastMessageAt: chats.lastMessageAt,
      botName: bots.name,
      botAvatar: bots.avatar,
    })
    .from(chats)
    .leftJoin(chatMembers, eq(chatMembers.chatId, chats.id))
    .leftJoin(
      bots,
      and(eq(bots.id, chatMembers.botId), eq(bots.userId, userId)),
    )
    .where(eq(chats.userId, userId))
    .orderBy(desc(chats.lastMessageAt), asc(chatMembers.joinedAt))

  const firstChatRows = new Map<string, (typeof rows)[number]>()

  for (const row of rows) {
    if (!firstChatRows.has(row.id)) firstChatRows.set(row.id, row)
  }

  return Array.from(firstChatRows.values()).map((chat) => ({
    id: chat.id,
    name: chat.name ?? chat.botName ?? "New chat",
    preview: chat.lastMessagePreview,
    lastMessageAt: chat.lastMessageAt.toISOString(),
    avatar: chat.botAvatar ?? "",
  }))
}
