import { AppSidebarClient } from "@/components/app-sidebar-client"
import { getUserBots, getUserChats } from "@/queries/bots"

export async function AppSidebar() {
  const [chats, bots] = await Promise.all([getUserChats(), getUserBots()])

  return <AppSidebarClient chats={chats} bots={bots} />
}
