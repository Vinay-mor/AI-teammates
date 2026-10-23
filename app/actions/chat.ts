"use server"

import { auth as triggerAuth } from "@trigger.dev/sdk"
import { chat, defaultStorage } from "@trigger.dev/sdk/ai"
import { auth } from "@clerk/nextjs/server"
import * as Sentry from "@sentry/nextjs"

import { getMeteredSandbox } from "@/lib/daytona-usage"
import { getChat } from "@/queries/chats"
import { requirePaidPlan } from "@/lib/billing"
import type { chatAgent } from "@/trigger/chat"

const startTriggerChatSession =
  chat.createStartSessionAction<typeof chatAgent>("chat")
const loadTriggerChatTranscript =
  chat.createLoadTranscriptAction(defaultStorage)

const VNC_PREVIEW_PORT = 6080
const VNC_PREVIEW_TTL_SECONDS = 15 * 60

export async function getChatVncPreviewUrl(chatId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error("Sign in to connect to this sandbox.")
  await requirePaidPlan()
  const existingChat = await getChat(chatId)
  const sandboxId = existingChat?.bot?.sandboxId

  if (!sandboxId) throw new Error("This chat has no Daytona sandbox.")

  const sandbox = await getMeteredSandbox(sandboxId, userId, {
    chargeIfAlreadyStarted: true,
  })

  const computerUseStatus = await sandbox.computerUse.getStatus()
  if (
    computerUseStatus.status !== "running" &&
    computerUseStatus.status !== "active"
  ) {
    await sandbox.computerUse.start()
  }

  const preview = await sandbox.getSignedPreviewUrl(
    VNC_PREVIEW_PORT,
    VNC_PREVIEW_TTL_SECONDS,
  )
  const previewUrl = new URL("/vnc.html", preview.url)
  previewUrl.searchParams.set("autoconnect", "1")
  previewUrl.searchParams.set("resize", "scale")
  previewUrl.searchParams.set("reconnect", "1")
  previewUrl.searchParams.set("path", "websockify")

  Sentry.logger.info("chat.sandbox.preview_issued", {
    "app.chat.id": chatId,
    "app.sandbox.id": sandboxId,
  })

  return previewUrl.toString()
}

export async function startChatSession({ chatId }: { chatId: string }) {
  const { userId } = await auth()
  if (!userId) throw new Error("Sign in to start this chat.")
  await requirePaidPlan()
  const existingChat = await getChat(chatId)

  if (!existingChat) throw new Error("Chat not found")

  const session = await startTriggerChatSession({
    chatId,
    clientData: {
      botName: existingChat.bot?.name ?? null,
      botJob: existingChat.bot?.job ?? null,
      botInstructions: existingChat.bot?.instructions ?? null,
      sandboxId: existingChat.bot?.sandboxId ?? null,
      chatKind: existingChat.kind,
      botId: existingChat.bot?.id ?? null,
      members: existingChat.members.map(
        ({ id, name, job, instructions, sandboxId }) => ({
          id,
          name,
          job,
          instructions,
          sandboxId,
        }),
      ),
    },
  })
  Sentry.logger.info("chat.session.started", {
    "app.chat.id": chatId,
    "app.chat.kind": existingChat.kind,
    "app.chat.member_count": existingChat.members.length,
  })
  return session
}

export async function mintChatAccessToken(chatId: string) {
  await requirePaidPlan()
  const existingChat = await getChat(chatId)

  if (!existingChat) throw new Error("Chat not found")

  const token = await triggerAuth.createPublicToken({
    scopes: {
      read: { sessions: chatId },
      write: { sessions: chatId },
    },
    expirationTime: "1h",
  })
  Sentry.logger.info("chat.access_token.issued", { "app.chat.id": chatId })
  return token
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

  const transcript = await loadTriggerChatTranscript({ chatId, limit })
  Sentry.logger.info("chat.transcript.loaded", {
    "app.chat.id": chatId,
    ...(limit !== undefined ? { "app.chat.requested_limit": limit } : {}),
  })
  return transcript
}
