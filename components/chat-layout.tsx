"use client"

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { usePanelRef } from "react-resizable-panels"
import { useRouter } from "next/navigation"

import { getChatVncPreviewUrl } from "@/app/actions/chat"
import { toast } from "@/components/ui/toast"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

type ChatLayoutContextValue = {
  isDesktopPanelOpen: boolean
  toggleDesktopPanel: () => void
}

const ChatLayoutContext = createContext<ChatLayoutContextValue | null>(null)

export function useChatLayout() {
  const context = useContext(ChatLayoutContext)

  if (!context) {
    throw new Error("useChatLayout must be used within ChatLayout")
  }

  return context
}

type ChatLayoutProps = {
  chatId: string
  children: ReactNode
  sandboxId: string | null
  sandboxName: string
}

export function ChatLayout({
  chatId,
  children,
  sandboxId,
  sandboxName,
}: ChatLayoutProps) {
  const [isDesktopPanelOpen, setIsDesktopPanelOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const requestStarted = useRef(false)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const panelHostRef = useRef<HTMLDivElement | null>(null)
  const previewPanelRef = usePanelRef()
  const router = useRouter()

  useEffect(() => {
    if (isDesktopPanelOpen) previewPanelRef.current?.expand()
    else previewPanelRef.current?.collapse()
  }, [isDesktopPanelOpen, previewPanelRef])

  useEffect(() => {
    if (!isDesktopPanelOpen || !sandboxId || requestStarted.current) return

    requestStarted.current = true
    getChatVncPreviewUrl(chatId)
      .then(setPreviewUrl)
      .catch((error: unknown) => {
        setPreviewError("Could not connect to this Daytona desktop.")
        const message = error instanceof Error ? error.message : ""
        if (message.includes("has reached its")) {
          toast.add({
            title: "Usage limit reached",
            description: message,
            type: "error",
            priority: "high",
            timeout: 8000,
            actionProps: {
              children: "View usage",
              onClick: () => router.push("/usage"),
            },
          })
        }
      })
  }, [chatId, isDesktopPanelOpen, sandboxId, router])

  useEffect(() => {
    if (!previewUrl) return

    let iframe = iframeRef.current

    if (!iframe) {
      iframe = document.createElement("iframe")
      iframe.src = previewUrl
      iframe.title = `${sandboxName} desktop preview`
      iframe.allow =
        "clipboard-read; clipboard-write; fullscreen; pointer-lock"
      iframe.setAttribute(
        "sandbox",
        "allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-downloads",
      )
      iframe.referrerPolicy = "no-referrer"
      iframe.className = "block h-full w-full border-0 bg-black"
      iframe.tabIndex = 0
      iframe.scrolling = "no"
      iframe.style.overflow = "hidden"
      iframeRef.current = iframe
    }

    const host = panelHostRef.current
    if (host && iframe.parentElement !== host) host.replaceChildren(iframe)
  }, [isDesktopPanelOpen, previewUrl, sandboxName])

  function toggleDesktopPanel() {
    setIsDesktopPanelOpen((isOpen) => !isOpen)
  }

  return (
    <ChatLayoutContext.Provider
      value={{
        isDesktopPanelOpen,
        toggleDesktopPanel,
      }}
    >
      <div className="h-svh min-h-0 min-w-0 w-full overflow-hidden">
        <ResizablePanelGroup
          orientation="horizontal"
          className="h-full min-h-0 min-w-0 w-full overflow-hidden"
        >
          <ResizablePanel
            defaultSize="100%"
            minSize="30%"
          >
            <main className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background">
              {children}
            </main>
          </ResizablePanel>
          <ResizableHandle
            withHandle
            className={isDesktopPanelOpen ? "" : "hidden"}
            disabled={!isDesktopPanelOpen}
          />
          <ResizablePanel
            panelRef={previewPanelRef}
            defaultSize="0%"
            minSize="15%"
            collapsedSize="0%"
            collapsible
            aria-label="Desktop preview panel"
          >
            <section className="flex h-full min-w-0 flex-col gap-3 bg-background p-4 text-foreground">
              {sandboxId ? (
                <>
                  <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-background">
                    <div
                      ref={panelHostRef}
                      className="absolute inset-0"
                      data-vnc-host="panel"
                    />
                    {!previewUrl && !previewError && (
                      <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                        Connecting to desktop...
                      </div>
                    )}
                    {previewError && (
                      <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-muted-foreground">
                        {previewError}
                      </div>
                    )}
                    {previewUrl && !previewError && (
                      <a
                        href={previewUrl}
                        rel="noopener noreferrer"
                        target="_blank"
                        aria-label={`Open ${sandboxName} desktop in a new tab`}
                        className="group absolute inset-0 cursor-pointer"
                      >
                        <span className="absolute right-3 bottom-3 rounded-lg bg-background/90 px-3 py-2 text-sm font-medium text-foreground shadow-sm opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                          Open desktop in new tab
                        </span>
                      </a>
                    )}
                  </div>
                  <p className="shrink-0 truncate text-center text-sm text-muted-foreground">
                    {sandboxName}&apos;s screen
                  </p>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center text-center text-sm text-muted-foreground">
                  This chat has no Daytona sandbox.
                </div>
              )}
            </section>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </ChatLayoutContext.Provider>
  )
}
