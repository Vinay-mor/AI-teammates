import "server-only"

import { DaytonaNotFoundError } from "@daytona/sdk"
import * as Sentry from "@sentry/node"
import { getDaytonaClient } from "@/lib/daytona-client"
import { BOT_MEMORY_PATH } from "@/lib/bot-memory"

export { BOT_MEMORY_PATH } from "@/lib/bot-memory"

export async function createBotSandbox(botId: string) {
  Sentry.logger.info("sandbox.create.started", { "app.bot.id": botId })
  const daytona = getDaytonaClient()
  const sandbox = await daytona.create({
    name: `bot-${botId}`,
    autoStopInterval: 15,
  })

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
    await sandbox.stop()
    Sentry.logger.info("sandbox.create.completed", {
      "app.bot.id": botId,
      "app.sandbox.id": sandbox.id,
    })
  } catch (error) {
    try {
      await daytona.delete(sandbox, 60, true)
    } catch (cleanupError) {
      console.error("Failed to clean up sandbox without MEMORY.md.", cleanupError)
      Sentry.logger.error("sandbox.create.cleanup_failed", {
        "app.bot.id": botId,
        "app.sandbox.id": sandbox.id,
        "error.type": cleanupError instanceof Error ? cleanupError.name : "unknown",
      })
    }
    throw error
  }

  return {
    id: sandbox.id,
    cleanup: () => daytona.delete(sandbox, 60, true),
  }
}

export async function deleteBotSandbox(sandboxId: string) {
  Sentry.logger.info("sandbox.delete.started", { "app.sandbox.id": sandboxId })
  const daytona = getDaytonaClient()

  try {
    const sandbox = await daytona.get(sandboxId)
    await daytona.delete(sandbox, 60, true)
    Sentry.logger.info("sandbox.delete.completed", { "app.sandbox.id": sandboxId })
  } catch (error) {
    if (error instanceof DaytonaNotFoundError) {
      Sentry.logger.info("sandbox.delete.already_missing", { "app.sandbox.id": sandboxId })
      return
    }
    console.error("Failed to delete Daytona sandbox.", error)
    Sentry.logger.error("sandbox.delete.failed", {
      "app.sandbox.id": sandboxId,
      "error.type": error instanceof Error ? error.name : "unknown",
    })
    throw error
  }
}
