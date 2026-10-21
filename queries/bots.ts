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
      kind: chats.kind,
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
      and(eq(bots.id, chatMembers.botId), eq(bots.userId, userId))
    )
    .where(eq(chats.userId, userId))
    .orderBy(desc(chats.lastMessageAt), asc(chatMembers.joinedAt))

  const chatRows = new Map<string, (typeof rows)[number][]>()

  for (const row of rows) {
    const currentRows = chatRows.get(row.id) ?? []
    currentRows.push(row)
    chatRows.set(row.id, currentRows)
  }

  return Array.from(chatRows.values()).map(([chat, ...otherMembers]) => ({
    id: chat.id,
    kind: chat.kind,
    name:
      chat.kind === "group"
        ? (chat.name ?? "Group chat")
        : (chat.botName ?? "New chat"),
    preview: chat.lastMessagePreview,
    lastMessageAt: chat.lastMessageAt.toISOString(),
    avatar: chat.botAvatar ?? "",
    memberAvatars: [chat, ...otherMembers]
      .map((member) => member.botAvatar)
      .filter((avatar): avatar is string => Boolean(avatar)),
  }))
}

export async function getUserBots() {
  const { userId } = await auth()

  if (!userId) return []

  return db
    .select({
      id: bots.id,
      name: bots.name,
      avatar: bots.avatar,
      job: bots.job,
      instructions: bots.instructions,
      sandboxId: bots.sandboxId,
    })
    .from(bots)
    .where(eq(bots.userId, userId))
    .orderBy(asc(bots.createdAt))
}
