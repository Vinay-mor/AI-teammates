import * as Sentry from "@sentry/node"
import { getMeteredSandbox } from "@/lib/daytona-usage"
import { UsageLimitError } from "@/lib/usage"

export const BOT_MEMORY_PATH = "MEMORY.md"

export async function readBotMemory(
  sandboxId: string | null | undefined,
  userId: string | undefined,
) {
  if (!sandboxId || !userId) return null

  try {
    const sandbox = await getMeteredSandbox(sandboxId, userId)
    const result = await sandbox.process.executeCommand(
      `cat -- '${BOT_MEMORY_PATH}'`,
      undefined,
      undefined,
      60,
    )
    if (result.exitCode !== 0) {
      throw new Error(`Failed to read ${BOT_MEMORY_PATH} from the sandbox.`)
    }
    const memory = result.result ?? ""
    Sentry.logger.info("bot.memory.read", {
      "app.sandbox.id": sandboxId,
      "app.memory.byte_length": Buffer.byteLength(memory, "utf8"),
    })
    return memory
  } catch (error) {
    if (error instanceof UsageLimitError) throw error
    console.error("Failed to read bot MEMORY.md.", error)
    Sentry.logger.warn("bot.memory.read_failed", {
      "app.sandbox.id": sandboxId,
      "error.type": error instanceof Error ? error.name : "unknown",
    })
    return null
  }
}
