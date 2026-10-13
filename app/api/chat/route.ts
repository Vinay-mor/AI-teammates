import { auth } from "@clerk/nextjs/server"
import { google } from "@ai-sdk/google"
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai"

export async function POST(request: Request) {
  await auth.protect()

  const { messages, instructions } = (await request.json()) as {
    messages: UIMessage[]
    instructions?: string | null
  }

  const result = streamText({
    model: google("gemini-3.8-flash"),
    instructions: instructions || "You are a helpful AI assistant.",
    messages: await convertToModelMessages(messages),
  })

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  })
}
