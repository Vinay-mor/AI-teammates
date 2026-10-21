"use client"

import {
  useLoadTranscript,
  useTriggerChatTransport,
} from "@trigger.dev/sdk/chat/react"
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
  kind: "direct" | "group"
  bot: {
    id: string
    name: string
    job: string
    instructions: string | null
    sandboxId: string | null
  } | null
  members: {
    id: string
    name: string
    avatar: string
    job: string
    instructions: string | null
  }[]
}

export function ChatInterface({
  chatId,
  kind,
  bot,
  members,
}: ChatInterfaceProps) {
  const transport = useTriggerChatTransport<typeof chatAgent>({
    task: "chat",
    accessToken: ({ chatId }) => mintChatAccessToken(chatId),
    startSession: ({ chatId }) => startChatSession({ chatId }),
    clientData: {
      chatKind: kind,
      botId: bot?.id ?? null,
      botName: bot?.name ?? null,
      botJob: bot?.job ?? null,
      botInstructions: bot?.instructions ?? null,
      sandboxId: bot?.sandboxId ?? null,
      members: members.map(({ id, name, job, instructions }) => ({
        id,
        name,
        job,
        instructions,
      })),
    },
  })
  const { messages, isLoading } = useLoadTranscript(
    chatId,
    loadChatTranscript,
    { transport }
  )

  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-muted-foreground">
        <LoaderCircle className="mr-2 size-4 animate-spin" />
        Loading conversation...
      </div>
    )
  }

  return (
    <Chat
      chatId={chatId}
      kind={kind}
      members={members}
      initialMessages={messages}
      transport={transport}
    />
  )
}
