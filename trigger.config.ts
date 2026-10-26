import { defineConfig } from "@trigger.dev/sdk";
import * as Sentry from "@sentry/node";

let sentryInitialized = false;

function initializeSentry() {
  if (sentryInitialized) return;

  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
    // Trigger.dev owns the worker's OpenTelemetry setup.
    enableOpenTelemetrySetup: false,
  });

  sentryInitialized = true;
}

export default defineConfig({
  project: "proj_itlhdeisbgxbzpsklyah",
  runtime: "node-24",
  build: {
    external: ["@daytona/sdk"],
  },
  logLevel: "log",
  // The max compute seconds a task is allowed to run. If the task run exceeds this duration, it will be stopped.
  // You can override this on an individual task.
  // See https://trigger.dev/docs/runs/max-duration
  maxDuration: 3600,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  init: async () => {
    initializeSentry();
  },
  onFailure: async ({ error, ctx, task }) => {
    initializeSentry();
    if (!sentryInitialized) return;

    Sentry.withScope((scope) => {
      scope.setTag("trigger_task_id", task);
      scope.setTag("trigger_run_id", ctx.run.id);
      Sentry.captureException(error);
    });

    await Sentry.flush(2_000);
  },
  dirs: ["trigger"],
});
