import { eq } from "drizzle-orm"
import { db } from "@/db"
import { chats } from "@/db/schema"

export async function getChatOwnerId(chatId: string) {
  const [chat] = await db
    .select({ userId: chats.userId })
    .from(chats)
    .where(eq(chats.id, chatId))
    .limit(1)

  if (!chat) throw new Error("Could not verify the owner of this chat.")
  return chat.userId
}
