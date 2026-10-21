import { getDaytonaClient } from "@/lib/daytona-client"

export const BOT_MEMORY_PATH = "MEMORY.md"

export async function readBotMemory(sandboxId: string | null | undefined) {
  if (!sandboxId) return null

  try {
    const sandbox = await getDaytonaClient().get(sandboxId)
    if (sandbox.state !== "started") await sandbox.start()
    return (await sandbox.fs.downloadFile(BOT_MEMORY_PATH)).toString("utf8")
  } catch (error) {
    console.error("Failed to read bot MEMORY.md.", error)
    return null
  }
}
