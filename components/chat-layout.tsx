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

import { getChatVncPreviewUrl } from "@/app/actions/chat"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
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
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const requestStarted = useRef(false)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const panelHostRef = useRef<HTMLDivElement | null>(null)
  const dialogHostRef = useRef<HTMLDivElement | null>(null)
  const previewPanelRef = usePanelRef()

  useEffect(() => {
    if (isDesktopPanelOpen) previewPanelRef.current?.expand()
    else previewPanelRef.current?.collapse()
  }, [isDesktopPanelOpen, previewPanelRef])

  useEffect(() => {
    if (!isDesktopPanelOpen || !sandboxId || requestStarted.current) return

    requestStarted.current = true
    getChatVncPreviewUrl(chatId)
      .then(setPreviewUrl)
      .catch(() => {
        setPreviewError("Could not connect to this Daytona desktop.")
      })
  }, [chatId, isDesktopPanelOpen, sandboxId])

  useEffect(() => {
    if (!previewUrl || iframeRef.current) return

    const iframe = document.createElement("iframe")
    iframe.src = previewUrl
    iframe.title = `${sandboxName} desktop preview`
    iframe.allow = "clipboard-read; clipboard-write; fullscreen"
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
  }, [previewUrl, sandboxName])

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const host = isFullscreenOpen ? dialogHostRef.current : panelHostRef.current

    if (host && iframe.parentElement !== host) host.replaceChildren(iframe)
  }, [isDesktopPanelOpen, isFullscreenOpen, previewUrl])

  function toggleDesktopPanel() {
    setIsDesktopPanelOpen((isOpen) => !isOpen)
    setIsFullscreenOpen(false)
  }

  function handleDialogOpenChange(open: boolean, details: { reason: string }) {
    if (open || details.reason === "close-press") setIsFullscreenOpen(open)
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
                      <button
                        type="button"
                        aria-label={`Open ${sandboxName} desktop in fullscreen`}
                        onClick={() => setIsFullscreenOpen(true)}
                        className="absolute inset-0 cursor-zoom-in"
                      />
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
      <Dialog
        open={isFullscreenOpen}
        onOpenChange={handleDialogOpenChange}
        disablePointerDismissal
      >
        <DialogContent
          className="h-svh w-svw max-w-none gap-0 overflow-hidden rounded-none border-0 bg-background p-0 sm:max-w-none"
          showCloseButton
        >
          <DialogTitle className="sr-only">
            {sandboxName} desktop
          </DialogTitle>
          <div
            ref={dialogHostRef}
            className="h-full w-full"
            data-vnc-host="dialog"
          />
        </DialogContent>
      </Dialog>
    </ChatLayoutContext.Provider>
  )
}
