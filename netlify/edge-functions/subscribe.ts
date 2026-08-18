import type { Config } from '@netlify/edge-functions'
import { renderEmailHtml } from './_shared/emailLayout.ts'

interface MailchimpError {
  title?: string
  status?: number
  detail?: string
}

interface ResendError {
  message?: string
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const { email, language } = (await req.json()) as { email?: string; language?: string }

    if (!email) {
      return new Response(JSON.stringify({ error: 'E-postadress krävs.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const API_KEY = Deno.env.get('MAILCHIMP_API_KEY')
    const AUDIENCE_ID = Deno.env.get('MAILCHIMP_AUDIENCE_ID')
    const DATACENTER = API_KEY?.split('-')[1]

    if (!API_KEY || !AUDIENCE_ID || !DATACENTER) {
      return new Response(JSON.stringify({ error: 'Serverkonfigurationsfel.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const mailchimpUrl = `https://${DATACENTER}.api.mailchimp.com/3.0/lists/${AUDIENCE_ID}/members`

    const mailchimpResponse = await fetch(mailchimpUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`anyuser:${API_KEY}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email_address: email,
        status: 'subscribed',
      }),
    })

    const mailchimpData = (await mailchimpResponse.json()) as MailchimpError

    if (!mailchimpResponse.ok) {
      if (
        mailchimpData.title === 'Member Exists' ||
        (mailchimpData.status === 400 && mailchimpData.title?.includes('Exists'))
      ) {
        return new Response(JSON.stringify({ error: 'already_subscribed' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      throw new Error(mailchimpData.detail || 'Kunde inte lägga till prenumerant i Mailchimp.')
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

    if (!RESEND_API_KEY) {
      console.warn('Resend API-nyckel saknas. Hoppar över mailutskick.')
      return new Response(JSON.stringify({ success: true, mailSent: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const isSv = language === 'sv'
    const subject = isSv
      ? 'Du är nu prenumerant på vårt nyhetsbrev! ✦'
      : 'You are now subscribed to our newsletter! ✦'

    const bodyHtml = isSv
      ? `
                  <p style="margin-bottom: 20px;">Tack för att du prenumererar på <strong>Tip the Velvet</strong>s nyhetsbrev. Vad roligt att du vill få uppdateringar om event och annat roligt från oss!</p>
                  <p style="margin-bottom: 20px;">Du kan alltid avsluta din prenumeration via "avregistrera"-länken i kommande mail.</p>
                `
      : `
                  <p style="margin-bottom: 20px;">Thank you for subscribing to <strong>Tip the Velvet</strong>'s newsletter. We're excited to have you on board!</p>
                  <p style="margin-bottom: 20px;">You can always unsubscribe by clicking the "unsubscribe" link in the emails you receive.</p>
                `

    const htmlContent = renderEmailHtml({
      subject,
      greetingHtml: isSv ? `Hej!` : `Hi!`,
      bodyHtml,
      isSv,
    })

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Tip the Velvet <info@tipthevelvet.nu>',
        to: [email],
        reply_to: 'velvet.gbg@gmail.com',
        subject: subject,
        html: htmlContent,
      }),
    })

    if (!resendResponse.ok) {
      const resendData = (await resendResponse.json()) as ResendError
      console.error('Resend misslyckades:', resendData.message)
      return new Response(JSON.stringify({ success: true, mailSent: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, mailSent: true }), {
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
  path: '/api/subscribe',
}
