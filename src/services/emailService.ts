// Client side of the send-casting-email edge function — the one place the admin mail modals
// post to, so they all report failures the same way.

export interface AdminEmailPayload {
  to: string
  name: string
  subject: string
  bodyText: string
  // The edge function's own language value is 'en', not 'eng'.
  language: 'sv' | 'en'
  fromName: string
  greeting: string
}

export type SendResult = { ok: true } | { ok: false; error: string }

const attemptSend = async (
  payload: AdminEmailPayload
): Promise<SendResult & { retryable?: boolean }> => {
  try {
    const res = await fetch('/api/send-casting-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) return { ok: true }
    // The edge function answers { error } on failure; fall back to the raw text/status.
    const raw = await res.text()
    let message = raw
    try {
      message = (JSON.parse(raw) as { error?: string }).error ?? raw
    } catch {
      // not JSON — keep the raw text
    }
    return {
      ok: false,
      error: `${res.status}${message ? `: ${message}` : ''}`,
      retryable: res.status === 429 || res.status >= 500,
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Network error',
      retryable: true,
    }
  }
}

// One automatic retry for failures that are usually momentary (rate limiting, a 5xx, a
// dropped connection) — a bulk send fires all its emails at once, and a retry a moment later
// is what fixed the one that failed in the first real use. Anything else (bad address, 4xx)
// is reported straight away with the server's own message.
export const sendAdminEmail = async (payload: AdminEmailPayload): Promise<SendResult> => {
  const first = await attemptSend(payload)
  if (first.ok || !first.retryable) return first
  await new Promise((resolve) => setTimeout(resolve, 1500))
  return attemptSend(payload)
}
