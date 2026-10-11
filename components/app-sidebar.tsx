import { AppSidebarClient } from "@/components/app-sidebar-client"
import { getUserChats } from "@/queries/bots"

export async function AppSidebar() {
  const chats = await getUserChats()

  return <AppSidebarClient chats={chats} />
}
