"use client"

import { useState } from "react"
import { MonitorIcon } from "lucide-react"

import { BotDialog } from "@/components/bot-dialog"
import { ChatAvatar } from "@/components/chat-avatar"
import { useChatLayout } from "@/components/chat-layout"
import { Button } from "@/components/ui/button"

type EditableBot = {
  id: string
  name: string
  avatar: string
  job: string
  instructions: string | null
}

type ChatHeaderProps = {
  name: string
  avatar: string
  bot: EditableBot | null
}

export function ChatHeader({ name, avatar, bot }: ChatHeaderProps) {
  const [editOpen, setEditOpen] = useState(false)
  const { isDesktopPanelOpen, toggleDesktopPanel } = useChatLayout()

  return (
    <header className="flex h-10 w-full shrink-0 items-center justify-between border-b border-white/10 bg-black px-4 text-white">
      {bot ? (
        <Button
          type="button"
          variant="ghost"
          aria-label={`Edit ${name}`}
          onClick={() => setEditOpen(true)}
          className="h-8 min-w-0 justify-start gap-2 px-1 text-white hover:bg-neutral-800 hover:text-white"
        >
          <ChatAvatar seed={avatar} className="size-4" />
          <span className="truncate text-xs font-semibold">{name}</span>
        </Button>
      ) : (
        <div className="flex min-w-0 items-center gap-2">
          <ChatAvatar seed={avatar} className="size-4" />
          <span className="truncate text-xs font-semibold">{name}</span>
        </div>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Toggle desktop panel"
        aria-expanded={isDesktopPanelOpen}
        onClick={toggleDesktopPanel}
        className="text-neutral-300 hover:bg-neutral-800 hover:text-white"
      >
        <MonitorIcon aria-hidden="true" className="size-4" />
      </Button>
      {bot && (
        <BotDialog
          bot={bot}
          open={editOpen}
          onOpenChange={setEditOpen}
          hideTrigger
        />
      )}
    </header>
  )
}
