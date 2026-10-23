import { PricingTable } from "@clerk/nextjs"
import { auth } from "@clerk/nextjs/server"
import { ArrowLeft, Bot, Monitor } from "lucide-react"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { PAID_PLAN_SLUG } from "@/lib/billing"

export default async function PricingPage() {
  const { has } = await auth()
  const isPaid = has({ plan: PAID_PLAN_SLUG })

  return (
    <main className="min-h-svh bg-neutral-950 px-5 py-10 text-neutral-50 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className={buttonVariants({
            variant: "ghost",
            className: "mb-10 text-neutral-400 hover:text-white",
          })}
        >
          <ArrowLeft data-icon="inline-start" />
          Back to your workspace
        </Link>

        <header className="mx-auto mb-10 max-w-2xl text-center">
          <p className="mb-3 text-sm font-medium tracking-[0.2em] text-cyan-300 uppercase">
            Plans
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            {isPaid ? "Your bots are ready" : "Give your ideas a place to work"}
          </h1>
          <p className="mt-4 text-base leading-7 text-neutral-400 sm:text-lg">
            {isPaid
              ? "Manage your subscription or explore other plans below."
              : "Choose a paid plan to create and chat with bots, and connect to their sandboxes."}
          </p>
        </header>

        <div className="mx-auto mb-9 grid max-w-2xl gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <Bot className="size-5 text-cyan-300" aria-hidden="true" />
            <span className="text-sm text-neutral-200">
              Create and use AI bots
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <Monitor className="size-5 text-cyan-300" aria-hidden="true" />
            <span className="text-sm text-neutral-200">
              Create and connect sandboxes
            </span>
          </div>
        </div>

        <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-white/[0.02] p-2 sm:p-4">
          <PricingTable
            for="user"
            newSubscriptionRedirectUrl="/"
          />
        </div>
      </div>
    </main>
  )
}
