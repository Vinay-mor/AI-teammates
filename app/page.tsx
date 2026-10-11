import { Show, UserButton } from "@clerk/nextjs"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"

export default function Page() {
  return (
    <main className="flex min-h-svh flex-col">
      <header className="flex h-16 items-center justify-between border-b px-6">
        <Link className="font-semibold tracking-tight" href="/">
          AI Teammates
        </Link>

        <nav aria-label="Account" className="flex items-center gap-2">
          <Show when="signed-out">
            <Link
              className={buttonVariants({ variant: "ghost" })}
              href="/sign-in"
            >
              Sign in
            </Link>
            <Link className={buttonVariants()} href="/sign-up">
              Get started
            </Link>
          </Show>
          <Show when="signed-in">
            <Link
              className={buttonVariants({ variant: "outline" })}
              href="/dashboard"
            >
              Open workspace
            </Link>
            <UserButton />
          </Show>
        </nav>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-6 py-20 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          Your team, ready to work
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
          Meet your AI teammates.
        </h1>
        <p className="max-w-xl text-muted-foreground sm:text-lg">
          Sign in to open your workspace, or create an account to get started.
        </p>
        <Show when="signed-out">
          <div className="flex flex-wrap justify-center gap-3">
            <Link className={buttonVariants({ size: "lg" })} href="/sign-up">
              Create your account
            </Link>
            <Link
              className={buttonVariants({ size: "lg", variant: "outline" })}
              href="/sign-in"
            >
              Sign in
            </Link>
          </div>
        </Show>
        <Show when="signed-in">
          <Link className={buttonVariants({ size: "lg" })} href="/dashboard">
            Open your workspace
          </Link>
        </Show>
      </section>
    </main>
  )
}
