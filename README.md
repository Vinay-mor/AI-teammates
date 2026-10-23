# Next.js template

This is a Next.js template with shadcn/ui.

## Adding components

To add components to your app, run the following command:

```bash
npx shadcn@latest add button
```

This will place the ui components in the `components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button";
```

## Database

Neon is connected through Drizzle ORM and node-postgres. The server-only database client is exported from `@/db`, and PostgreSQL table definitions belong in `db/schema.ts`.

Add tables to the schema, then apply the schema to Neon with:

```bash
npm run db:push
```

Drizzle Kit reads `.env.local` and prefers `DATABASE_URL_UNPOOLED` for schema pushes. The application uses `DATABASE_URL` for pooled queries. `npm run db:studio` opens Drizzle Studio.

## Sentry

Sentry is initialized for browser, Node.js, and Edge runtimes. Add the new project's
DSN to `.env.local` as `NEXT_PUBLIC_SENTRY_DSN`; the server runtimes also accept
`SENTRY_DSN` and fall back to the public DSN. Set `SENTRY_ENVIRONMENT` to override
the default environment name (`development` or `production`). Tracing samples 100%
of development traffic and 10% of production traffic.
Session Replay records 100% of development sessions and 10% of production sessions,
and records all sessions with errors. Text and inputs are masked and media is blocked.
Structured Sentry logs are emitted from chat, bot, sandbox, and recoverable browser
failure paths using the configured DSN. Log attributes exclude prompts, file contents,
credentials, and raw exception messages.

For production source maps, set `SENTRY_AUTH_TOKEN` in the build environment. Keep
that token private; it is used by `next build` to upload source maps for the
`student-tnp/ai-teammates` project.
