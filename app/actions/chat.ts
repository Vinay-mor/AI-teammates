"use server"

import { auth as triggerAuth } from "@trigger.dev/sdk"
import { chat, defaultStorage } from "@trigger.dev/sdk/ai"

import { getChat } from "@/queries/chats"
import type { chatAgent } from "@/trigger/chat"

const startTriggerChatSession = chat.createStartSessionAction<typeof chatAgent>(
  "chat",
)
const loadTriggerChatTranscript =
  chat.createLoadTranscriptAction(defaultStorage)

export async function startChatSession({ chatId }: { chatId: string }) {
  const existingChat = await getChat(chatId)

  if (!existingChat) throw new Error("Chat not found")

  return startTriggerChatSession({
    chatId,
    clientData: {
      botName: existingChat.bot?.name ?? null,
      botJob: existingChat.bot?.job ?? null,
      botInstructions: existingChat.bot?.instructions ?? null,
      sandboxId: existingChat.bot?.sandboxId ?? null,
    },
  })
}

export async function mintChatAccessToken(chatId: string) {
  const existingChat = await getChat(chatId)

  if (!existingChat) throw new Error("Chat not found")

  return triggerAuth.createPublicToken({
    scopes: {
      read: { sessions: chatId },
      write: { sessions: chatId },
    },
    expirationTime: "1h",
  })
}

export async function loadChatTranscript({
  chatId,
  limit,
}: {
  chatId: string
  limit?: number
}) {
  const existingChat = await getChat(chatId)

  if (!existingChat) throw new Error("Chat not found")

  return loadTriggerChatTranscript({ chatId, limit })
}
