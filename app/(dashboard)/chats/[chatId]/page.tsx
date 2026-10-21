import { auth } from "@clerk/nextjs/server"
import { notFound } from "next/navigation"

import { ChatHeader } from "@/components/chat-header"
import { ChatLayout } from "@/components/chat-layout"
import { getChat } from "@/queries/chats"
import { ChatInterface } from "./chat-interface"

export default async function ChatPage({
  params,
}: {
  params: Promise<{ chatId: string }>
}) {
  await auth.protect()

  const { chatId } = await params
  const chat = await getChat(chatId)

  if (!chat) notFound()

  return (
    <ChatLayout
      key={chatId}
      chatId={chatId}
      sandboxId={chat.bot?.sandboxId ?? null}
      sandboxName={chat.name}
    >
      <ChatHeader
        name={chat.name}
        avatar={chat.avatar}
        bot={chat.bot}
        kind={chat.kind}
        members={chat.members}
      />
      <ChatInterface
        key={chatId}
        chatId={chatId}
        bot={chat.bot}
        kind={chat.kind}
        members={chat.members}
      />
    </ChatLayout>
  )
}
