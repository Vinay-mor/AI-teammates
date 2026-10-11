"use client"

import { useRef } from "react"
import { UserButton, useUser } from "@clerk/nextjs"
import {
  Sidebar,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function AppSidebar() {
  const { user } = useUser()
  const userButtonRef = useRef<HTMLDivElement>(null)
  const userName =
    user?.fullName ?? [user?.firstName, user?.lastName].filter(Boolean).join(" ")

  return (
    <Sidebar>
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
