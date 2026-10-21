import { auth } from "@clerk/nextjs/server"
import { notFound } from "next/navigation"

import { ChatHeader } from "@/components/chat-header"
import { ChatLayout } from "@/components/chat-layout"
import { getChat } from "@/queries/chats"
import { getUserBots } from "@/queries/bots"
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

  const userBots = chat.kind === "group" ? await getUserBots() : []
  const chatInterfaceKey = `${chatId}:${chat.members
    .map((member) => member.id)
    .sort()
    .join(":")}`

  return (
    <ChatLayout
      key={chatId}
      chatId={chatId}
      sandboxId={chat.bot?.sandboxId ?? null}
      sandboxName={chat.name}
    >
      <ChatHeader
        chatId={chat.id}
        name={chat.name}
        avatar={chat.avatar}
        bot={chat.bot}
        kind={chat.kind}
        members={chat.members}
        bots={userBots.map(({ id, name, avatar }) => ({ id, name, avatar }))}
      />
      <ChatInterface
        key={chatInterfaceKey}
        chatId={chatId}
        bot={chat.bot}
        kind={chat.kind}
        members={chat.members}
      />
    </ChatLayout>
  )
}
