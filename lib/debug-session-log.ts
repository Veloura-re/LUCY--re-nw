/**
 * No-op debug session logging for Cloudflare compatibility.
 */
export function appendDebugSessionNdjson(payload: Record<string, unknown>) {
    // Disabled in production and Cloudflare Workers
    if (process.env.NODE_ENV !== "production") {
        console.log("[Debug Session]:", JSON.stringify(payload));
    }
}
