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
    return (await sandbox.fs.downloadFile(BOT_MEMORY_PATH)).toString("utf8")
  } catch (error) {
    if (error instanceof UsageLimitError) throw error
    console.error("Failed to read bot MEMORY.md.", error)
    return null
  }
}
