import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { stepCountIs } from "ai"
import { chat, defaultStorage } from "@trigger.dev/sdk/ai"
import { z } from "zod"
import { createChatTools } from "../lib/chat-tools"
import { rateLimitedGoogleFetch } from "../lib/google-rate-limit"

const google = createGoogleGenerativeAI({ fetch: rateLimitedGoogleFetch })

export const chatAgent = chat.agent({
  id: "chat",
  tools: ({ clientData }) => createChatTools(clientData?.sandboxId),
  clientDataSchema: z
    .object({
      botName: z.string().nullable(),
      botJob: z.string().nullable(),
      botInstructions: z.string().nullable(),
      sandboxId: z.string().nullable(),
    })
    .optional(),
  storage: defaultStorage,
  run: async ({ messages, signal, streamText, clientData, tools }) => {
    const botName = clientData?.botName ?? "AI teammate"
    const botJob = clientData?.botJob ?? "General-purpose assistant"
    const sandboxContext = clientData?.sandboxId
      ? `A dedicated, isolated Daytona sandbox is associated with you (ID: ${clientData.sandboxId}). Its runtime configuration and contents are not specified.`
      : "No Daytona sandbox is currently associated with you."
    const instructions = [
      `You are ${botName}, an AI teammate.`,
      `Your job is: ${botJob}.`,
      "Your purpose is to help the user with tasks related to your job. Be accurate, be clear about uncertainty, and ask for clarification when necessary.",
      "When asked who you are, introduce yourself by your name and job, then briefly summarize your job instructions in natural language.",
      `Sandbox environment: ${sandboxContext}`,
      "You can run shell commands, read and write files, and list files in your associated Daytona sandbox using the provided tools. Use the desktop tools to click, move, scroll, type, press keys, and inspect screenshots. Use viewScreen for your own visual inspection; it is hidden from the user. Use showScreen only when the user asks to see the current screen; that screenshot is displayed in the chat. Do not claim a command or computer action succeeded unless its tool returned successfully.",
      clientData?.botInstructions
        ? `Additional instructions from your owner:\n${clientData.botInstructions}`
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
