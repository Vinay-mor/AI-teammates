import "server-only"

import { DaytonaNotFoundError } from "@daytona/sdk"
import { getDaytonaClient } from "@/lib/daytona-client"

export async function createBotSandbox(botId: string) {
  const daytona = getDaytonaClient()
  const sandbox = await daytona.create({ name: `bot-${botId}` })

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
