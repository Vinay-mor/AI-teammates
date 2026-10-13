import { auth } from "@clerk/nextjs/server"
import { notFound } from "next/navigation"

import { ChatHeader } from "@/components/chat-header"
import { getChat } from "@/queries/chats"

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
    <main className="min-h-svh w-full bg-background">
      <ChatHeader name={chat.name} avatar={chat.avatar} bot={chat.bot} />
      <p>{chatId}</p>
    </main>
  )
}
