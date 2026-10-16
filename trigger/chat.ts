import { google } from "@ai-sdk/google"
import { chat, defaultStorage } from "@trigger.dev/sdk/ai"
import { z } from "zod"

export const chatAgent = chat.agent({
  id: "chat",
  clientDataSchema: z.object({
    instructions: z.string().nullable(),
  }),
  storage: defaultStorage,
  run: async ({ messages, signal, streamText, clientData }) =>
    streamText({
      model: google("gemini-3.8-flash"),
      system: clientData?.instructions || "You are a helpful AI assistant.",
      messages,
      abortSignal: signal,
    }),
})
