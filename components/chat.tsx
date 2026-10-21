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
import {
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
} from "@/components/ai-elements/prompt-input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ChatAvatar } from "@/components/chat-avatar"
import type { ChatUIMessage, chatAgent } from "@/trigger/chat"
import type { useTriggerChatTransport } from "@trigger.dev/sdk/chat/react"

type ChatTransport = ReturnType<
  typeof useTriggerChatTransport<typeof chatAgent>
>

export function Chat({
  chatId,
  kind,
  members,
  initialMessages,
  transport,
}: {
  chatId: string
  kind: "direct" | "group"
  members: {
    id: string
    name: string
    avatar: string
    job: string
    instructions: string | null
  }[]
  initialMessages: UIMessage[]
  transport: ChatTransport
}) {
  const { messages, sendMessage, status, error } = useChat<ChatUIMessage>({
    id: chatId,
    messages: initialMessages as ChatUIMessage[],
    transport,
  })
  const [input, setInput] = useState("")
  const [selectedBotId, setSelectedBotId] = useState(members[0]?.id ?? "")
  const isBusy = status === "submitted" || status === "streaming"
  const selectedBot = members.find((bot) => bot.id === selectedBotId)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = input.trim()
    if (!text || isBusy) return

    sendMessage({ text }, { metadata: { selectedBotId } })
    setInput("")
  }

  return (
    <section className="mx-auto flex min-h-0 w-full max-w-4xl min-w-0 flex-1 flex-col overflow-hidden px-4">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-0 py-8">
          {messages.length === 0 ? (
            <ConversationEmptyState
              className="min-h-[50vh]"
              icon={<Bot className="size-8" />}
              title={
                kind === "group" ? "Start a group chat" : "Start a conversation"
              }
              description={
                kind === "group"
                  ? "Choose a bot below and send a message."
                  : "Send a message to chat with your AI teammate."
              }
            />
          ) : (
            messages.map((message) => {
              const botParts = message.parts.filter(
                (part) => part.type === "data-bot"
              )
              const botPart = botParts[botParts.length - 1]
              const responder =
                kind === "group" &&
                message.role === "assistant" &&
                botPart?.type === "data-bot"
                  ? members.find((bot) => bot.id === botPart.data.botId)
                  : undefined

              return (
                <Message
                  className={
                    responder
                      ? "max-w-full flex-row items-start gap-2"
                      : undefined
                  }
                  from={message.role}
                  key={message.id}
                >
                  {responder && (
                    <ChatAvatar
                      seed={responder.avatar}
                      className="mt-1 size-7 shrink-0"
                    />
                  )}
                  <MessageContent
                    className={responder ? "min-w-0 flex-1" : undefined}
                  >
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
                        if (
                          toolPart.type === "tool-viewScreen" ||
                          toolPart.type === "tool-handoff"
                        ) {
                          return null
                        }

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
              )
            })
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

      <div className="mx-auto w-full max-w-3xl pt-3 pb-6">
        {error && (
          <p className="mb-2 text-sm text-destructive" role="alert">
            Something went wrong. Please try again.
          </p>
        )}
        <form
          className="flex flex-col gap-2 rounded-2xl border bg-background p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring/30"
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
            placeholder={
              kind === "group"
                ? "Message your group…"
                : "Message your AI teammate…"
            }
            value={input}
          />
          <div className="flex items-center justify-between gap-2">
            <PromptInputSelect
              value={selectedBotId}
              onValueChange={(value) => {
                if (typeof value === "string") setSelectedBotId(value)
              }}
            >
              <PromptInputSelectTrigger
                aria-label="Choose which bot responds"
                className="h-9 max-w-56 gap-2 rounded-xl px-2 text-foreground"
              >
                <span className="shrink-0 text-xs text-muted-foreground">
                  Reply as
                </span>
                {selectedBot ? (
                  <span className="flex min-w-0 items-center gap-2">
                    <ChatAvatar seed={selectedBot.avatar} className="size-5" />
                    <span className="truncate">{selectedBot.name}</span>
                  </span>
                ) : (
                  <PromptInputSelectValue placeholder="Choose a bot" />
                )}
              </PromptInputSelectTrigger>
              <PromptInputSelectContent align="start">
                {members.map((bot) => (
                  <PromptInputSelectItem key={bot.id} value={bot.id}>
                    <ChatAvatar seed={bot.avatar} className="size-5" />
                    {bot.name}
                  </PromptInputSelectItem>
                ))}
              </PromptInputSelectContent>
            </PromptInputSelect>
            <Button
              aria-label="Send message"
              className="rounded-xl"
              disabled={
                !input.trim() || isBusy || (kind === "group" && !selectedBotId)
              }
              size="icon"
              type="submit"
            >
              <ArrowUp className="size-4" />
            </Button>
          </div>
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
