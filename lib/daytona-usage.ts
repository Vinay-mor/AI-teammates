import { nanoid } from "nanoid"
import * as Sentry from "@sentry/node"
import { getDaytonaClient } from "@/lib/daytona-client"
import { reserveUsage, settleUsageReservation } from "@/lib/usage"

const SANDBOX_RUNTIME_RESERVATION_SECONDS = 15 * 60

export async function getMeteredSandbox(
  sandboxId: string,
  userId: string,
  options: { chargeIfAlreadyStarted?: boolean } = {},
) {
  const sandbox = await getDaytonaClient().get(sandboxId)
  if (sandbox.state === "started" && !options.chargeIfAlreadyStarted) return sandbox

  const eventKey = `sandbox:start:${sandboxId}:${nanoid()}`
  Sentry.logger.info("sandbox.start.requested", {
    "app.sandbox.id": sandboxId,
    "app.sandbox.was_started": sandbox.state === "started",
  })
  await reserveUsage({
    userId,
    resource: "sandbox_seconds",
    amount: SANDBOX_RUNTIME_RESERVATION_SECONDS,
    eventKey: `${eventKey}:reserve`,
  })

  try {
    if (sandbox.state !== "started") await sandbox.start()
    Sentry.logger.info("sandbox.start.completed", { "app.sandbox.id": sandboxId })
    return sandbox
  } catch (error) {
    try {
      await settleUsageReservation({
        userId,
        resource: "sandbox_seconds",
        reserved: SANDBOX_RUNTIME_RESERVATION_SECONDS,
        actual: 0,
        eventKey: `${eventKey}:settle`,
        reservationEventKey: `${eventKey}:reserve`,
      })
    } catch (settlementError) {
      console.error("Failed to release a Daytona runtime reservation.", settlementError)
      Sentry.logger.error("sandbox.start.usage_settlement_failed", {
        "app.sandbox.id": sandboxId,
        "error.type": settlementError instanceof Error ? settlementError.name : "unknown",
      })
    }
    console.error("Failed to start Daytona sandbox.", error)
    Sentry.logger.error("sandbox.start.failed", {
      "app.sandbox.id": sandboxId,
      "error.type": error instanceof Error ? error.name : "unknown",
    })
    throw error
  }
}
