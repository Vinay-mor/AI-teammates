import { auth } from "@clerk/nextjs/server"

export const PAID_PLAN_SLUG = "pro"

export async function hasPaidPlan() {
  const { has } = await auth()
  return has({ plan: PAID_PLAN_SLUG })
}

export async function requirePaidPlan() {
  if (!(await hasPaidPlan())) {
    throw new Error("A paid plan is required to use this feature.")
  }
}
