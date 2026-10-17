"use client"

import { useLoadTranscript, useTriggerChatTransport } from "@trigger.dev/sdk/chat/react"
import { LoaderCircle } from "lucide-react"

import {
  loadChatTranscript,
  mintChatAccessToken,
  startChatSession,
} from "@/app/actions/chat"
import { Chat } from "@/components/chat"
import type { chatAgent } from "@/trigger/chat"

type ChatInterfaceProps = {
  chatId: string
  bot: {
    name: string
    job: string
    instructions: string | null
    sandboxId: string | null
  } | null
}

export function ChatInterface({ chatId, bot }: ChatInterfaceProps) {
  const transport = useTriggerChatTransport<typeof chatAgent>({
    task: "chat",
    accessToken: ({ chatId }) => mintChatAccessToken(chatId),
    startSession: ({ chatId }) => startChatSession({ chatId }),
    clientData: {
      botName: bot?.name ?? null,
      botJob: bot?.job ?? null,
      botInstructions: bot?.instructions ?? null,
      sandboxId: bot?.sandboxId ?? null,
    },
  })
  const { messages, isLoading } = useLoadTranscript(
    chatId,
    loadChatTranscript,
    { transport },
  )

  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-muted-foreground">
        <LoaderCircle className="mr-2 size-4 animate-spin" />
        Loading conversation...
      </div>
    )
  }

  return <Chat chatId={chatId} initialMessages={messages} transport={transport} />
}
