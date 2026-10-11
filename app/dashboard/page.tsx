import Link from "next/link"

import { UserButton } from "@clerk/nextjs"
import { buttonVariants } from "@/components/ui/button"
import { auth } from "@clerk/nextjs/server"

export default async function DashboardPage() {
  await auth.protect()

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-4xl flex-col gap-8 px-6 py-10">
      <header className="flex items-center justify-between">
        <Link className="font-semibold tracking-tight" href="/">
          AI Teammates
        </Link>
        <UserButton />
      </header>

      <section className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">Workspace</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          You&apos;re signed in.
        </h1>
        <p className="text-muted-foreground">
          Your protected workspace is ready.
        </p>
        <Link className={buttonVariants({ variant: "outline" })} href="/">
          Back to home
        </Link>
      </section>
    </main>
  )
}
