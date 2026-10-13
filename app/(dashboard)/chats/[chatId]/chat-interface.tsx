"use client"

import { useChat } from "@ai-sdk/react"
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { DefaultChatTransport } from "ai"
import { ArrowUp, Bot, LoaderCircle } from "lucide-react"
import { useState, type FormEvent } from "react"

type ChatInterfaceProps = {
  chatId: string
  instructions: string | null
}

export function ChatInterface({ chatId, instructions }: ChatInterfaceProps) {
  const { messages, sendMessage, status, error } = useChat({
    id: chatId,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { instructions },
    }),
  })
  const [input, setInput] = useState("")
  const isBusy = status === "submitted" || status === "streaming"

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = input.trim()

    if (!text || isBusy) return

    sendMessage({ text })
    setInput("")
  }

  return (
    <section className="mx-auto flex h-[calc(100svh-2.5rem)] w-full max-w-4xl flex-col px-4">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-0 py-8">
          {messages.length === 0 ? (
            <ConversationEmptyState
              className="min-h-[50vh]"
              icon={<Bot className="size-8" />}
              title="Start a conversation"
              description="Send a message to chat with your AI teammate."
            />
          ) : (
            messages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  {message.parts.map((part, index) =>
                    part.type === "text" ? (
                      <MessageResponse key={`${message.id}-${index}`}>
                        {part.text}
                      </MessageResponse>
                    ) : null,
                  )}
                </MessageContent>
              </Message>
            ))
          )}
          {status === "submitted" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Thinking…
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="mx-auto w-full max-w-3xl pb-6 pt-3">
        {error && (
          <p className="mb-2 text-sm text-destructive" role="alert">
            Something went wrong. Please try again.
          </p>
        )}
        <form
          className="flex items-end gap-2 rounded-2xl border bg-background p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring/30"
          onSubmit={handleSubmit}
        >
          <Textarea
            aria-label="Message"
            className="max-h-48 min-h-12 resize-none border-0 shadow-none focus-visible:ring-0"
            disabled={isBusy}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                event.currentTarget.form?.requestSubmit()
              }
            }}
            placeholder="Message your AI teammate…"
            value={input}
          />
          <Button
            aria-label="Send message"
            className="mb-1 rounded-xl"
            disabled={!input.trim() || isBusy}
            size="icon"
            type="submit"
          >
            <ArrowUp className="size-4" />
          </Button>
        </form>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          AI responses may be inaccurate. Check important information.
        </p>
      </div>
    </section>
  )
}
