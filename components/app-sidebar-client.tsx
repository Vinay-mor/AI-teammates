"use client"

import { useRef, useState } from "react"
import { UserButton, useUser } from "@clerk/nextjs"
import { formatDistanceToNowStrict } from "date-fns"
import { PlusIcon, UsersRoundIcon } from "lucide-react"
import Link from "next/link"

import { BotDialog } from "@/components/bot-dialog"
import { ChatAvatar } from "@/components/chat-avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

type ChatItem = {
  id: string
  name: string
  preview: string | null
  lastMessageAt: string
  avatar: string
}

function formatChatTime(timestamp: string) {
  const distance = formatDistanceToNowStrict(new Date(timestamp))
  const match = distance.match(/(\d+)\s+(second|minute|hour|day|month|year)s?/)

  if (!match) return "<1m ago"

  const abbreviations: Record<string, string> = {
    second: "s",
    minute: "m",
    hour: "h",
    day: "d",
    month: "mo",
    year: "y",
  }

  return `${match[1]}${abbreviations[match[2]]} ago`
}

export function AppSidebarClient({ chats }: { chats: ChatItem[] }) {
  const [botDialogOpen, setBotDialogOpen] = useState(false)
  const { user } = useUser()
  const userButtonRef = useRef<HTMLDivElement>(null)
  const userName =
    user?.fullName ?? [user?.firstName, user?.lastName].filter(Boolean).join(" ")

  return (
    <Sidebar>
      <SidebarHeader className="flex-row justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label="Create"
                className="size-12 rounded-xl text-foreground"
              />
            }
          >
            <PlusIcon className="size-6" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="bottom"
            sideOffset={8}
            className="w-80 rounded-2xl border border-neutral-800 bg-neutral-900 p-2 text-foreground shadow-xl"
          >
            <DropdownMenuItem
              onClick={() => setBotDialogOpen(true)}
              className="h-14 gap-4 rounded-xl px-4 text-lg focus:bg-neutral-800"
            >
              <PlusIcon className="size-5 text-neutral-400" />
              Create new bot
            </DropdownMenuItem>
            <DropdownMenuItem className="h-14 gap-4 rounded-xl px-4 text-lg focus:bg-neutral-800">
              <UsersRoundIcon className="size-5 text-neutral-400" />
              Create group chat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Chats</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {chats.map((chat) => (
                <SidebarMenuItem key={chat.id}>
                  <SidebarMenuButton
                    render={<Link href={`/chat/${chat.id}`} />}
                    className="h-auto min-h-12 py-2"
                    tooltip={chat.name}
                  >
                    <ChatAvatar seed={chat.avatar || chat.id} />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5 pr-16">
                      <span className="truncate text-sm font-medium">
                        {chat.name}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {chat.preview || "No messages yet"}
                      </span>
                    </span>
                    <SidebarMenuBadge className="text-[10px] text-muted-foreground">
                      {formatChatTime(chat.lastMessageAt)}
                    </SidebarMenuBadge>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <BotDialog
        open={botDialogOpen}
        onOpenChange={setBotDialogOpen}
        hideTrigger
      />
      <SidebarFooter className="mt-auto">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="relative cursor-pointer hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-within:bg-sidebar-accent"
              render={<div />}
              onClick={(event) => {
                const trigger = userButtonRef.current?.querySelector("button")
                const target = event.target

                if (trigger && target instanceof Node && !trigger.contains(target)) {
                  trigger.click()
                }
              }}
            >
              <div ref={userButtonRef} className="contents">
                <UserButton
                  appearance={{
                    elements: {
                      userButtonTrigger:
                        "absolute inset-0 z-0 flex h-full w-full cursor-pointer items-center justify-start rounded-md bg-transparent px-2 outline-hidden transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                      userButtonAvatarBox: "size-6 shrink-0",
                      userButtonAvatarImage: "size-6",
                    },
                  }}
                />
              </div>
              {userName && (
                <span className="pointer-events-none relative z-10 min-w-0 truncate pl-8 text-sm font-medium text-sidebar-foreground group-data-[collapsible=icon]:hidden">
                  {userName}
                </span>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
