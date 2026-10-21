import "server-only"

import { DaytonaNotFoundError } from "@daytona/sdk"
import { getDaytonaClient } from "@/lib/daytona-client"
import { BOT_MEMORY_PATH } from "@/lib/bot-memory"

export { BOT_MEMORY_PATH } from "@/lib/bot-memory"

export async function createBotSandbox(botId: string) {
  const daytona = getDaytonaClient()
  const sandbox = await daytona.create({ name: `bot-${botId}` })

  try {
    const result = await sandbox.process.executeCommand(
      `touch ${BOT_MEMORY_PATH}`,
      undefined,
      undefined,
      60,
    )
    if (result.exitCode !== 0) {
      throw new Error(`Failed to create ${BOT_MEMORY_PATH} in the sandbox.`)
    }
  } catch (error) {
    try {
      await daytona.delete(sandbox, 60, true)
    } catch (cleanupError) {
      console.error("Failed to clean up sandbox without MEMORY.md.", cleanupError)
    }
    throw error
  }

  return {
    id: sandbox.id,
    cleanup: () => daytona.delete(sandbox, 60, true),
  }
}

export async function deleteBotSandbox(sandboxId: string) {
  const daytona = getDaytonaClient()

  try {
    const sandbox = await daytona.get(sandboxId)
    await daytona.delete(sandbox, 60, true)
  } catch (error) {
    if (error instanceof DaytonaNotFoundError) return
    throw error
  }
}
