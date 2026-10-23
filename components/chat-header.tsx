"use client"

import { useMemo, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { MonitorIcon } from "lucide-react"

import { BotDialog } from "@/components/bot-dialog"
import { ChatAvatar } from "@/components/chat-avatar"
import { GroupChatDialog } from "@/components/group-chat-dialog"
import { GroupChatAvatar } from "@/components/group-chat-avatar"
import { useChatLayout } from "@/components/chat-layout"
import { Button } from "@/components/ui/button"
import { showUpgradeToast } from "@/components/billing-toast"

type EditableBot = {
  id: string
  name: string
  avatar: string
  job: string
  instructions: string | null
}

type ChatMember = Pick<
  EditableBot,
  "id" | "name" | "avatar" | "job" | "instructions"
>

type ChatHeaderProps = {
  chatId: string
  name: string
  avatar: string
  bot: EditableBot | null
  kind: "direct" | "group"
  members: ChatMember[]
  bots: { id: string; name: string; avatar: string }[]
}

export function ChatHeader({
  chatId,
  name,
  avatar,
  bot,
  kind,
  members,
  bots,
}: ChatHeaderProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [groupEditOpen, setGroupEditOpen] = useState(false)
  const { has, isLoaded } = useAuth()
  const router = useRouter()
  const { isDesktopPanelOpen, toggleDesktopPanel } = useChatLayout()
  const group = useMemo(
    () =>
      kind === "group"
        ? { id: chatId, name, botIds: members.map((member) => member.id) }
        : undefined,
    [chatId, kind, members, name],
  )

  return (
    <header className="flex h-10 w-full shrink-0 items-center justify-between border-b border-white/10 bg-black px-4 text-white">
      {bot || kind === "group" ? (
        <Button
          type="button"
          variant="ghost"
          aria-label={`Edit ${kind === "group" ? "group chat" : "bot"} ${name}`}
          onClick={() =>
            kind === "group" ? setGroupEditOpen(true) : setEditOpen(true)
          }
          className="h-8 min-w-0 justify-start gap-2 px-1 text-white hover:bg-neutral-800 hover:text-white"
        >
          {kind === "group" ? (
            <GroupChatAvatar
              avatars={members.map((member) => member.avatar)}
              className="size-4"
            />
          ) : (
            <ChatAvatar seed={avatar} className="size-4" />
          )}
          <span className="truncate text-xs font-semibold">{name}</span>
        </Button>
      ) : (
        <div className="flex min-w-0 items-center gap-2">
          {kind === "group" ? (
            <GroupChatAvatar
              avatars={members.map((member) => member.avatar)}
              className="size-4"
            />
          ) : (
            <ChatAvatar seed={avatar} className="size-4" />
          )}
          <span className="truncate text-xs font-semibold">{name}</span>
        </div>
      )}
      {kind === "direct" && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Toggle desktop panel"
          aria-expanded={isDesktopPanelOpen}
          onClick={() => {
            if (!isLoaded) return
            if (!has?.({ plan: "pro" })) {
              showUpgradeToast(
                "Upgrade to connect to and use your bot's sandbox.",
                () => router.push("/pricing"),
              )
              return
            }
            toggleDesktopPanel()
          }}
          className="text-neutral-300 hover:bg-neutral-800 hover:text-white"
        >
          <MonitorIcon aria-hidden="true" className="size-4" />
        </Button>
      )}
      {bot && (
        <BotDialog
          bot={bot}
          open={editOpen}
          onOpenChange={setEditOpen}
          hideTrigger
        />
      )}
      {group && (
        <GroupChatDialog
          bots={bots}
          group={group}
          open={groupEditOpen}
          onOpenChange={setGroupEditOpen}
        />
      )}
    </header>
  )
}
