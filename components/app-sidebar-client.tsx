"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { UserButton, useAuth, useUser } from "@clerk/nextjs"
import { formatDistanceToNowStrict } from "date-fns"
import { usePathname, useRouter } from "next/navigation"
import { PlusIcon, SearchIcon, UsersRoundIcon } from "lucide-react"
import Link from "next/link"

import { BotDialog } from "@/components/bot-dialog"
import { showUpgradeToast } from "@/components/billing-toast"
import { ChatAvatar } from "@/components/chat-avatar"
import { GroupChatDialog } from "@/components/group-chat-dialog"
import { GroupChatAvatar } from "@/components/group-chat-avatar"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command"
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
  SidebarRail,
} from "@/components/ui/sidebar"

type ChatItem = {
  id: string
  name: string
  preview: string | null
  lastMessageAt: string
  avatar: string
  kind: "direct" | "group"
  memberAvatars: string[]
}

type BotOption = { id: string; name: string; avatar: string }

function getSearchShortcut() {
  return navigator.platform.toLowerCase().includes("mac") ? "⌘K" : "Ctrl K"
}

function getServerSearchShortcut() {
  return "Ctrl K"
}

function subscribeToPlatform() {
  return () => {}
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

export function AppSidebarClient({
  chats,
  bots,
}: {
  chats: ChatItem[]
  bots: BotOption[]
}) {
  const [botDialogOpen, setBotDialogOpen] = useState(false)
  const [groupChatDialogOpen, setGroupChatDialogOpen] = useState(false)
  const [searchDialogOpen, setSearchDialogOpen] = useState(false)
  const searchShortcut = useSyncExternalStore(
    subscribeToPlatform,
    getSearchShortcut,
    getServerSearchShortcut
  )
  const { user } = useUser()
  const { has, isLoaded } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const userButtonRef = useRef<HTMLDivElement>(null)
  const userName =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ")

  function openCreateDialog(kind: "bot" | "group") {
    if (!isLoaded) return

    if (!has?.({ plan: "pro" })) {
      showUpgradeToast(
        kind === "bot"
          ? "Upgrade to Pro to create bots and their sandboxes."
          : "Upgrade to Pro to create group chats and use bots.",
        () => router.push("/pricing"),
      )
      return
    }

    if (kind === "bot") setBotDialogOpen(true)
    else setGroupChatDialogOpen(true)
  }

  useEffect(() => {
    function handleSearchShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setSearchDialogOpen(true)
      }
    }

    window.addEventListener("keydown", handleSearchShortcut)
    return () => window.removeEventListener("keydown", handleSearchShortcut)
  }, [])

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <DropdownMenu>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton tooltip="Create">
                    <PlusIcon />
                    <span className="group-data-[collapsible=icon]:hidden">
                      Create
                    </span>
                  </SidebarMenuButton>
                }
              />
            </SidebarMenuItem>
          </SidebarMenu>
          <DropdownMenuContent
            align="end"
            side="bottom"
            sideOffset={8}
            className="w-80 rounded-2xl border border-neutral-800 bg-neutral-900 p-2 text-foreground shadow-xl"
          >
            <DropdownMenuItem
              onClick={() => openCreateDialog("bot")}
              className="h-14 gap-4 rounded-xl px-4 text-lg focus:bg-neutral-800"
            >
              <PlusIcon className="size-5 text-neutral-400" />
              Create new bot
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => openCreateDialog("group")}
              className="h-14 gap-4 rounded-xl px-4 text-lg focus:bg-neutral-800"
            >
              <UsersRoundIcon className="size-5 text-neutral-400" />
              Create group chat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setSearchDialogOpen(true)}
              tooltip="Search chats"
            >
              <SearchIcon />
              <span className="group-data-[collapsible=icon]:hidden">
                Search
              </span>
              <CommandShortcut className="group-data-[collapsible=icon]:hidden">
                {searchShortcut}
              </CommandShortcut>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Chats</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {chats.map((chat) => (
                <SidebarMenuItem key={chat.id}>
                  <SidebarMenuButton
                    render={<Link href={`/chats/${chat.id}`} />}
                    isActive={pathname === `/chats/${chat.id}`}
                    aria-current={
                      pathname === `/chats/${chat.id}` ? "page" : undefined
                    }
                    className="h-auto min-h-12 py-2 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:min-h-8! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0!"
                    tooltip={chat.name}
                  >
                    {chat.kind === "group" ? (
                      <GroupChatAvatar
                        avatars={chat.memberAvatars}
                        className="group-data-[collapsible=icon]:size-6"
                      />
                    ) : (
                      <ChatAvatar
                        seed={chat.avatar || chat.id}
                        className="group-data-[collapsible=icon]:size-6"
                      />
                    )}
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5 pr-16 group-data-[collapsible=icon]:hidden">
                      <span className="truncate text-sm font-medium">
                        {chat.name}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {chat.preview || "No messages yet"}
                      </span>
                    </span>
                    <SidebarMenuBadge className="text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden">
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
      <GroupChatDialog
        bots={bots}
        open={groupChatDialogOpen}
        onOpenChange={setGroupChatDialogOpen}
      />
      <CommandDialog
        open={searchDialogOpen}
        onOpenChange={setSearchDialogOpen}
        title="Search chats"
        description="Search your chats by name"
      >
        <Command>
          <CommandInput placeholder="Search chats..." />
          <CommandList>
            <CommandEmpty>No chats found.</CommandEmpty>
            <CommandGroup heading="Chats">
              {chats.map((chat) => (
                <CommandItem
                  key={chat.id}
                  value={chat.name}
                  onSelect={() => {
                    setSearchDialogOpen(false)
                    router.push(`/chats/${chat.id}`)
                  }}
                  className="min-h-12 gap-3 py-2"
                >
                  {chat.kind === "group" ? (
                    <GroupChatAvatar avatars={chat.memberAvatars} />
                  ) : (
                    <ChatAvatar seed={chat.avatar || chat.id} />
                  )}
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate font-medium">{chat.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {chat.preview || "No messages yet"}
                    </span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
      <SidebarFooter className="mt-auto">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={userName || "Account"}
              className="relative cursor-pointer group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:min-h-8! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0! focus-within:bg-sidebar-accent hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              render={<div />}
              onClick={(event) => {
                const trigger = userButtonRef.current?.querySelector("button")
                const target = event.target

                if (
                  trigger &&
                  target instanceof Node &&
                  !trigger.contains(target)
                ) {
                  trigger.click()
                }
              }}
            >
              <div ref={userButtonRef} className="contents">
                <UserButton
                  appearance={{
                    elements: {
                      userButtonTrigger:
                        "absolute inset-0 z-0 flex h-full w-full cursor-pointer items-center justify-start rounded-md bg-transparent px-2 outline-hidden transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
                      userButtonAvatarBox:
                        "size-6 shrink-0 group-data-[collapsible=icon]:size-6",
                      userButtonAvatarImage:
                        "size-6 group-data-[collapsible=icon]:size-6",
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
      <SidebarRail />
    </Sidebar>
  )
}
