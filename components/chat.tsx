"use client"

import { useChat } from "@ai-sdk/react"
import type { UIMessage } from "ai"
import {
  ArrowUp,
  Bot,
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
} from "lucide-react"
import { useState, type FormEvent } from "react"

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
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
  type ToolPart,
} from "@/components/ai-elements/tool"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { chatAgent } from "@/trigger/chat"
import type { useTriggerChatTransport } from "@trigger.dev/sdk/chat/react"

type ChatTransport = ReturnType<typeof useTriggerChatTransport<typeof chatAgent>>

export function Chat({
  chatId,
  initialMessages,
  transport,
}: {
  chatId: string
  initialMessages: UIMessage[]
  transport: ChatTransport
}) {
  const { messages, sendMessage, status, error } = useChat({
    id: chatId,
    messages: initialMessages,
    transport,
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
    <section className="mx-auto flex min-h-0 min-w-0 w-full max-w-4xl flex-1 flex-col overflow-hidden px-4">
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
                  {message.parts.map((part, index) => {
                    if (part.type === "text") {
                      return (
                        <MessageResponse key={`${message.id}-${index}`}>
                          {part.text}
                        </MessageResponse>
                      )
                    }

                    if (part.type.startsWith("tool-")) {
                      const toolPart = part as ToolPart
                      if (toolPart.type === "tool-viewScreen") return null

                      return (
                        <ChatToolCall
                          key={`${message.id}-${index}`}
                          part={toolPart}
                        />
                      )
                    }

                    return null
                  })}
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

function ChatToolCall({ part }: { part: ToolPart }) {
  const toolName = part.type.startsWith("tool-")
    ? part.type.slice("tool-".length)
    : part.type
  const title =
    {
      bash: "Run command",
      readFile: "Read file",
      writeFile: "Write file",
      listFiles: "List files",
      mouseClick: "Mouse click",
      mouseMove: "Move mouse",
      mouseScroll: "Scroll screen",
      keyboardType: "Type text",
      keyboardPress: "Press key",
      showScreen: "Show screen",
    }[toolName] ?? toolName
  const screenshot =
    toolName === "showScreen" &&
    part.state === "output-available" &&
    typeof part.output === "object" &&
    part.output !== null &&
    "image" in part.output &&
    typeof part.output.image === "string"
      ? part.output.image
      : null

  return (
    <Tool className="my-2" defaultOpen={toolName === "showScreen"}>
      {part.type === "dynamic-tool" ? (
        <ToolHeader
          title={title}
          type={part.type}
          toolName={toolName}
          state={part.state}
        />
      ) : (
        <ToolHeader title={title} type={part.type} state={part.state} />
      )}
      <ToolContent>
        <ToolInput input={part.input} />
        {screenshot ? (
          <div className="overflow-hidden rounded-md border bg-muted">
            <img
              alt="Screenshot of the teammate's desktop"
              className="h-auto w-full"
              src={`data:image/jpeg;base64,${screenshot}`}
            />
          </div>
        ) : (
          <ToolOutput output={part.output} errorText={part.errorText} />
        )}
        {part.state === "output-available" && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="size-3.5" />
            Completed
          </div>
        )}
        {part.state === "output-error" && (
          <div className="flex items-center gap-1.5 text-xs text-destructive">
            <CircleAlert className="size-3.5" />
            Action failed
          </div>
        )}
      </ToolContent>
    </Tool>
  )
}
