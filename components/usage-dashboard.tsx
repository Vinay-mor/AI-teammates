"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { BotIcon, Clock3Icon, CpuIcon, SparklesIcon } from "lucide-react"

import type { UsageSnapshot } from "@/lib/usage"
import { Button } from "@/components/ui/button"

function formatRemaining(end: Date | null, now: number) {
  if (!end) return "Available after upgrading"
  if (now === 0) return "Calculating reset time…"
  const seconds = Math.max(0, Math.floor((end.getTime() - now) / 1000))
  const days = Math.floor(seconds / 86_400)
  const hours = Math.floor((seconds % 86_400) / 3_600)
  const minutes = Math.floor((seconds % 3_600) / 60)
  if (days) return `${days}d ${hours}h until reset`
  if (hours) return `${hours}h ${minutes}m until reset`
  return `${minutes}m until reset`
}

function ProgressMeter({
  label,
  value,
  limit,
  detail,
  icon,
}: {
  label: string
  value: number
  limit: number
  detail: string
  icon: React.ReactNode
}) {
  const percentage = Math.min(100, (value / limit) * 100)
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-muted p-2.5 text-foreground">{icon}</div>
          <div>
            <h2 className="font-semibold">{label}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
          </div>
        </div>
        <span className="text-sm font-medium tabular-nums">{percentage.toFixed(0)}%</span>
      </div>
      <div
        className="mt-5 h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={limit}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </section>
  )
}

export function UsageDashboard({ usage }: { usage: UsageSnapshot }) {
  const [now, setNow] = useState(0)
  useEffect(() => {
    setNow(Date.now())
    const interval = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(interval)
  }, [])

  const formatTokens = (value: number) => new Intl.NumberFormat().format(value)
  const formatHours = (seconds: number) => `${(seconds / 3600).toFixed(1)} hours`

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-10 md:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Account</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Usage</h1>
          <p className="mt-2 text-muted-foreground">
            Track your plan limits for AI and Daytona sandbox runtime.
          </p>
        </div>
        {usage.periodEnd && (
          <div className="flex items-center gap-2 rounded-full border border-border px-3 py-2 text-sm text-muted-foreground">
            <Clock3Icon className="size-4" />
            {formatRemaining(usage.periodEnd, now)}
          </div>
        )}
      </header>

      {usage.plan === "free" ? (
        <section className="flex flex-col items-start gap-4 rounded-2xl border border-border bg-card p-6">
          <div>
            <h2 className="text-lg font-semibold">Free plan</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Metered AI and sandbox features are available on Pro.
            </p>
          </div>
          <Button render={<Link href="/pricing" />}>View Pro plan</Button>
        </section>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ProgressMeter
              label="AI input tokens"
              value={usage.inputTokens}
              limit={usage.limits.inputTokens}
              detail={`${formatTokens(usage.inputTokens)} / ${formatTokens(usage.limits.inputTokens)} tokens`}
              icon={<SparklesIcon className="size-5" />}
            />
            <ProgressMeter
              label="AI output tokens"
              value={usage.outputTokens}
              limit={usage.limits.outputTokens}
              detail={`${formatTokens(usage.outputTokens)} / ${formatTokens(usage.limits.outputTokens)} tokens`}
              icon={<SparklesIcon className="size-5" />}
            />
            <ProgressMeter
              label="Sandbox runtime"
              value={usage.sandboxSeconds}
              limit={usage.limits.sandboxSeconds}
              detail={`${formatHours(usage.sandboxSeconds)} / ${formatHours(usage.limits.sandboxSeconds)}`}
              icon={<CpuIcon className="size-5" />}
            />
            <ProgressMeter
              label="Bots and sandboxes"
              value={usage.bots}
              limit={usage.limits.bots}
              detail={`${usage.bots} / ${usage.limits.bots} bots`}
              icon={<BotIcon className="size-5" />}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Token and sandbox runtime limits reset when this Clerk subscription period ends. The bot count is a standing limit so stopped sandbox storage stays bounded.
          </p>
        </>
      )}
    </main>
  )
}
