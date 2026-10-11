import { auth } from "@clerk/nextjs/server"
import { randomUUID } from "node:crypto"

import { BotDialog } from "@/components/bot-dialog"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { ChatAvatar } from "@/components/chat-avatar"

export default async function Page() {
  await auth.protect()

  return (
    <main className="dark min-h-svh bg-neutral-950 text-neutral-50">
      <Empty className="min-h-svh gap-6 rounded-none border-0 px-6 py-16">
        <EmptyHeader className="gap-3">
          <ChatAvatar seed={randomUUID()} className="mb-3 size-11" />
          <EmptyTitle
            role="heading"
            aria-level={1}
            className="text-lg font-medium tracking-normal text-foreground"
          >
            Meet your first bot
          </EmptyTitle>
          <EmptyDescription className="max-w-lg text-lg/8 text-neutral-400">
            Every bot gets its own personality, memory, and face. Spin one up
            and start the conversation.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="w-auto max-w-none">
          <BotDialog />
        </EmptyContent>
      </Empty>
    </main>
  )
}
