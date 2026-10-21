import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { stepCountIs, tool } from "ai"
import type { UIMessage } from "ai"
import { chat, defaultStorage } from "@trigger.dev/sdk/ai"
import { z } from "zod"
import { createChatTools } from "../lib/chat-tools"
import { rateLimitedGoogleFetch } from "../lib/google-rate-limit"

const google = createGoogleGenerativeAI({ fetch: rateLimitedGoogleFetch })

export type ChatUIMessage = UIMessage<unknown, { bot: { botId: string } }>

export const chatAgent = chat.withUIMessage<ChatUIMessage>().agent({
  id: "chat",
  tools: ({ clientData }) => {
    if (clientData?.chatKind === "group") {
      const members = clientData.members ?? []
      const currentBotId = clientData.selectedBotId
      const targets = members.filter((bot) => bot.id !== currentBotId)
      let handedOff = false

      return {
        handoff: tool({
          description: [
            "Hand this turn to another bot in the group when its job is a better fit for the user's request.",
            "After the handoff, that bot will answer the user. Choose a target using its exact bot id.",
            "Available bots:",
            ...targets.map((bot) => `${bot.name} (id: ${bot.id}) — ${bot.job}`),
          ].join("\n"),
          inputSchema: z.object({
            botId: z
              .string()
              .min(1)
              .describe("The exact id of the bot to hand off to."),
            reason: z
              .string()
              .max(240)
              .optional()
              .describe("Brief reason for the handoff."),
          }),
          execute: async ({ botId, reason }) => {
            if (handedOff) {
              return {
                success: false,
                error: "This turn has already been handed off.",
              }
            }

            const target = targets.find((bot) => bot.id === botId)
            if (!target) {
              return {
                success: false,
                error: "Choose another bot from the available group members.",
              }
            }

            handedOff = true
            chat.response.write({
              type: "data-bot",
              data: { botId: target.id },
            })

            return {
              success: true,
              reason: reason ?? null,
              bot: {
                id: target.id,
                name: target.name,
                job: target.job,
                instructions: target.instructions,
              },
              instruction:
                "Continue this same turn as the new bot and answer the user's original request.",
            }
          },
        }),
      }
    }

    return createChatTools(clientData?.sandboxId)
  },
  clientDataSchema: z
    .object({
      chatKind: z.enum(["direct", "group"]).optional(),
      botId: z.string().nullable().optional(),
      selectedBotId: z.string().optional(),
      members: z
        .array(
          z.object({
            id: z.string(),
            name: z.string(),
            job: z.string(),
            instructions: z.string().nullable(),
          })
        )
        .optional(),
      botName: z.string().nullable(),
      botJob: z.string().nullable(),
      botInstructions: z.string().nullable(),
      sandboxId: z.string().nullable(),
    })
    .optional(),
  storage: defaultStorage,
  run: async ({ messages, signal, streamText, clientData, tools }) => {
    const isGroupChat = clientData?.chatKind === "group"
    const selectedBot = isGroupChat
      ? clientData.members?.find((bot) => bot.id === clientData.selectedBotId)
      : null
    const botName = selectedBot?.name ?? clientData?.botName ?? "AI teammate"
    const botJob =
      selectedBot?.job ?? clientData?.botJob ?? "General-purpose assistant"
    if (isGroupChat && selectedBot) {
      chat.response.write({
        type: "data-bot",
        data: { botId: selectedBot.id },
      })
    }
    const sandboxContext =
      !isGroupChat && clientData?.sandboxId
        ? `A dedicated, isolated Daytona sandbox is associated with you (ID: ${clientData.sandboxId}). Its runtime configuration and contents are not specified.`
        : isGroupChat
          ? "This group chat has no desktop or sandbox tools."
          : "No Daytona sandbox is currently associated with you."
    const instructions = [
      `You are ${botName}, an AI teammate.`,
      `Your job is: ${botJob}.`,
      "Your purpose is to help the user with tasks related to your job. Be accurate, be clear about uncertainty, and ask for clarification when necessary.",
      "When asked who you are, introduce yourself by your name and job, then briefly summarize your job instructions in natural language.",
      ...(isGroupChat
        ? [
            "You are participating in a group chat with the user and the bots listed below. The selected bot is responsible for this turn unless a different bot is a clearly better fit.",
            `Other bots in this group: ${
              (clientData.members ?? [])
                .filter((bot) => bot.id !== selectedBot?.id)
                .map((bot) => `${bot.name} (${bot.job})`)
                .join("; ") || "none"
            }.`,
            "Use the handoff tool to transfer the turn when another bot's job is better suited to the request. Give a brief reason. After a successful handoff, adopt the target bot's name, job, and instructions from the tool result, then answer the user's original request as that bot. Do not hand off more than once.",
            "In group chats, your only available tool is handoff. You do not have desktop or sandbox tools.",
          ]
        : []),
      `Sandbox environment: ${sandboxContext}`,
      !isGroupChat
        ? "You can run shell commands, read and write files, and list files in your associated Daytona sandbox using the provided tools. Use the desktop tools to click, move, scroll, type, press keys, and inspect screenshots. Use viewScreen for your own visual inspection; it is hidden from the user. Use showScreen only when the user asks to see the current screen; that screenshot is displayed in the chat. Do not claim a command or computer action succeeded unless its tool returned successfully."
        : null,
      (selectedBot?.instructions ?? clientData?.botInstructions)
        ? `Additional instructions from your owner:\n${selectedBot?.instructions ?? clientData?.botInstructions}`
        : null,
    ]
      .filter(Boolean)
      .join("\n\n")

    return streamText({
      model: google("gemini-3.8-flash"),
      instructions,
      messages,
      tools,
      abortSignal: signal,
      stopWhen: stepCountIs(20),
    })
  },
})
