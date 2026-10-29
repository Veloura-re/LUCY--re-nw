import { SeverityNumber } from "@opentelemetry/api-logs"
import { posthogLogProvider } from "@/instrumentation"

type LogAttributes = Record<string, boolean | number | string | undefined>

const posthogLogger = posthogLogProvider?.getLogger("lucy-posthog")

function emit(
  body: string,
  severityNumber: SeverityNumber,
  attributes: LogAttributes,
) {
  posthogLogger?.emit({
    body,
    severityNumber,
    attributes,
  })
}

export const posthogLogs = {
  info(body: string, attributes: LogAttributes) {
    emit(body, SeverityNumber.INFO, attributes)
  },
  warn(body: string, attributes: LogAttributes) {
    emit(body, SeverityNumber.WARN, attributes)
  },
}

export async function flushPostHogLogs() {
  await posthogLogProvider?.forceFlush()
}
