"use server"

import { auth as triggerAuth } from "@trigger.dev/sdk"
import { chat, defaultStorage } from "@trigger.dev/sdk/ai"

import { getDaytonaClient } from "@/lib/daytona-client"
import { getChat } from "@/queries/chats"
import type { chatAgent } from "@/trigger/chat"

const startTriggerChatSession =
  chat.createStartSessionAction<typeof chatAgent>("chat")
const loadTriggerChatTranscript =
  chat.createLoadTranscriptAction(defaultStorage)

const VNC_PREVIEW_PORT = 6080

export async function getChatVncPreviewUrl(chatId: string) {
  const existingChat = await getChat(chatId)
  const sandboxId = existingChat?.bot?.sandboxId

  if (!sandboxId) throw new Error("This chat has no Daytona sandbox.")

  const daytona = getDaytonaClient()
  const sandbox = await daytona.get(sandboxId)

  if (sandbox.state !== "started") await sandbox.start()

  const computerUseStatus = await sandbox.computerUse.getStatus()
  if (
    computerUseStatus.status !== "running" &&
    computerUseStatus.status !== "active"
  ) {
    await sandbox.computerUse.start()
  }

  const preview = await sandbox.getSignedPreviewUrl(VNC_PREVIEW_PORT, 3600)
  const previewUrl = new URL("/vnc.html", preview.url)
  previewUrl.searchParams.set("autoconnect", "1")
  previewUrl.searchParams.set("resize", "scale")
  previewUrl.searchParams.set("reconnect", "1")
  previewUrl.searchParams.set("path", "websockify")

  return previewUrl.toString()
}

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
      chatKind: existingChat.kind,
      botId: existingChat.bot?.id ?? null,
      members: existingChat.members.map(({ id, name, job, instructions }) => ({
        id,
        name,
        job,
        instructions,
      })),
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
