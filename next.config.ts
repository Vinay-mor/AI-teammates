import type { NextConfig } from "next"
import { withSentryConfig } from "@sentry/nextjs/config"

const nextConfig: NextConfig = {
  devIndicators: false,
}

export default withSentryConfig(nextConfig, {
  org: "student-tnp",
  project: "ai-teammates",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
})
