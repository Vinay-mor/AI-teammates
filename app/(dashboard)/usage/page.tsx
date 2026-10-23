import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

import { UsageDashboard } from "@/components/usage-dashboard"
import { getUsageSnapshot } from "@/lib/usage"

export default async function UsagePage() {
  const { userId, has } = await auth()
  if (!userId) redirect("/sign-in")

  const usage = await getUsageSnapshot(userId, has({ plan: "pro" }))
  return <UsageDashboard usage={usage} />
}
