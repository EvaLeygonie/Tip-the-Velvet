import type { Config } from '@netlify/edge-functions'
import { renderEmailHtml } from './_shared/emailLayout.ts'

interface ResendError {
  message?: string
}

interface CastingEmailBody {
  to: string
  name: string
  subject: string
  bodyText: string
  language: 'sv' | 'en'
  // Optional — overrides the default personalized "Hej {name}!"/"Darling {name}," greeting.
  // Used by bulk sends (e.g. "email all booked artists") where a generic "Hey everyone!"
  // reads better than addressing each recipient individually.
  greeting?: string
  // Optional — overrides the sender display name (default "Tip the Velvet Casting"), so
  // non-casting senders (e.g. the Contacts page emailing a sponsor/venue) don't read oddly.
  fromName?: string
}

export default async (request: Request) => {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const { to, name, subject, bodyText, language, greeting, fromName } =
      (await request.json()) as CastingEmailBody

    if (!to || !name || !subject || !bodyText) {
      return new Response('Missing required fields', { status: 400 })
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'Resend API-nyckel saknas.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const isSv = language === 'sv'

    const formattedBody = bodyText.replace(/\n/g, '<br />')

    const htmlContent = renderEmailHtml({
      subject,
      greetingHtml: greeting ?? (isSv ? `Hej ${name}!` : `Darling ${name},`),
      bodyHtml: formattedBody,
      isSv,
    })

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${fromName ?? 'Tip the Velvet Casting'} <no-reply@tipthevelvet.nu>`,
        to: [to],
        reply_to: 'velvet.gbg@gmail.com',
        subject: subject,
        html: htmlContent,
      }),
    })

    if (!response.ok) {
      const errorData = (await response.json()) as ResendError
      throw new Error(errorData.message || 'Misslyckades att skicka mail via Resend.')
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internt serverfel.'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const config: Config = {
  path: '/api/send-casting-email',
}
