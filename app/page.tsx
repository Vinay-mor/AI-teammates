import Link from "next/link"
import { PlusIcon } from "lucide-react"
import { auth } from "@clerk/nextjs/server"
import { randomUUID } from "node:crypto"

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { buttonVariants } from "@/components/ui/button"
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
          <Link
            className={buttonVariants({
              variant: "secondary",
              size: "lg",
              className: "h-11 rounded-xl px-4 text-base",
            })}
            href="/dashboard"
          >
            <PlusIcon data-icon="inline-start" />
            Create a new bot
          </Link>
        </EmptyContent>
      </Empty>
    </main>
  )
}
