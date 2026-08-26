import type { Config } from '@netlify/edge-functions'
import { renderEmailHtml } from './_shared/emailLayout.ts'

interface ResendError {
  message?: string
}

interface ApplicationBody {
  name: string
  email: string
  language: 'sv' | 'eng'
  deadline?: string
  type: 'casting' | 'staff' | 'sponsor' | 'artist'
}

export default async (request: Request) => {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const { name, email, language, type, deadline } = (await request.json()) as ApplicationBody

    if (!name || !email || !type) {
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
    const currentDeadline = deadline || (isSv ? 'angivet datum' : 'the stated date')
    const subject = isSv ? 'Tack för din ansökan! ✦' : 'Thank you for your application! ✦'
    let emailHtml = ''

    switch (type) {
      case 'casting':
        emailHtml = isSv
          ? `<p style="margin: 0 0 16px 0; padding: 0; line-height: 1.5;">Vi har tagit emot din ansökan till <strong>Tip the Velvet</strong>. Vad roligt att du vill uppträda hos oss!</p><p style="margin: 0 0 16px 0; padding: 0; line-height: 1.5;">Vi återkommer efter vår casting deadline (${currentDeadline}), när vi har granskat alla ansökningar.</p>`
          : `<p style="margin: 0 0 16px 0; padding: 0; line-height: 1.5;">We have received your application for <strong>Tip the Velvet</strong>. Thank you for wanting to perform on our stage!</p><p style="margin: 0 0 16px 0; padding: 0; line-height: 1.5;">We will get back to you after the casting call deadline (<strong>${currentDeadline}</strong>), once we've reviewed all applications.</p>`
        break

      case 'staff':
        emailHtml = isSv
          ? `<p style="margin: 0 0 16px 0; padding: 0; line-height: 1.5;">Vi har tagit emot din ansökan till <strong>Tip the Velvet</strong>. Vad roligt att du vill joina vårt kollektiv!</p><p style="margin: 0 0 16px 0; padding: 0; line-height: 1.5;">Din ansökan sparas i vårt kollektiv av volontärer och personal — den är inte knuten till ett specifikt event. Vi hör av oss med en konkret fråga så fort vi planerar ett event som passar din roll.</p>`
          : `<p style="margin: 0 0 16px 0; padding: 0; line-height: 1.5;">We have received your application for <strong>Tip the Velvet</strong>. Thank you for wanting to be a part of our collective!</p><p style="margin: 0 0 16px 0; padding: 0; line-height: 1.5;">Your application joins our general pool of volunteers and staff — it isn't tied to one specific event. We'll reach out with a concrete ask as soon as we're planning a show that fits your role.</p>`
        break

      case 'sponsor':
        emailHtml = isSv
          ? `<p style="margin: 0 0 16px 0; padding: 0; line-height: 1.5;">Vi har tagit emot din ansökan till <strong>Tip the Velvet</strong>. Vad roligt att du vill samarbeta med eller sponsra oss!</p><p style="margin: 0 0 16px 0; padding: 0; line-height: 1.5;">Vi kontaktar dig inom kort!</p>`
          : `<p style="margin: 0 0 16px 0; padding: 0; line-height: 1.5;">We have received your application for <strong>Tip the Velvet</strong>. Thank you for wanting to sponsor or collaborate with us!</p><p style="margin: 0 0 16px 0; padding: 0; line-height: 1.5;">We'll contact you soon!</p>`
        break

      case 'artist':
        emailHtml = isSv
          ? `<p style="margin: 0 0 16px 0; padding: 0; line-height: 1.5;">Tack så mycket för att du vill visas på <strong>Tip the Velvets</strong> Hall of Fame. Din info kommer dyka upp på vår <a href="https://www.tipthevelvet.nu/artists">Artist</a> sida inom kort</p><p style="margin: 0 0 16px 0; padding: 0; line-height: 1.5;">Vi kontaktar dig inom kort!</p>`
          : `<p style="margin: 0 0 16px 0; padding: 0; line-height: 1.5;">Thank you for wanting to be showcased on <strong>Tip the Velvet's</strong> Wall of Fame! Your information will be displayed soon on our <a href="https://www.tipthevelvet.nu/artists">Artist</a> page!</p><p style="margin: 0 0 16px 0; padding: 0; line-height: 1.5;">We'll contact you soon!</p>`
        break

      default:
        return new Response('Invalid application type', { status: 400 })
    }

    const htmlContent = renderEmailHtml({
      subject,
      greetingHtml: isSv ? `Hej ${name}!` : `Darling ${name},`,
      bodyHtml: emailHtml,
      isSv,
    })

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Tip the Velvet <no-reply@tipthevelvet.nu>',
        to: [email],
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
  path: '/api/application-confirmation',
}
