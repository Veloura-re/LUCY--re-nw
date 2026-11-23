import posthog from "posthog-js"
import { initBotId } from "botid/client/core"

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST

if (!posthogKey || !posthogHost) {
  if (process.env.NODE_ENV === "development") {
    const missingVariable = posthogKey
      ? "NEXT_PUBLIC_POSTHOG_HOST"
      : "NEXT_PUBLIC_POSTHOG_KEY"
    throw new Error(
      `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`
    )
  }
} else {
  posthog.init(posthogKey, {
    api_host: posthogHost,
    defaults: "2026-01-30",
    capture_exceptions: true,
    debug: process.env.NODE_ENV === "development",
  })
}

// Vercel BotID: Client-side protection for authentication and sensitive operations
try {
  initBotId({
    protect: [
      {
        path: "/api/auth/*",
        method: "POST",
      },
      {
        path: "/api/school/billing/*",
        method: "POST",
      },
      {
        path: "/api/user/*",
        method: "POST",
      },
    ],
  })
} catch {
  // Graceful degradation outside browser environment
}
