import { nanoid } from "nanoid"
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
  await reserveUsage({
    userId,
    resource: "sandbox_seconds",
    amount: SANDBOX_RUNTIME_RESERVATION_SECONDS,
    eventKey: `${eventKey}:reserve`,
  })

  try {
    if (sandbox.state !== "started") await sandbox.start()
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
    }
    throw error
  }
}
