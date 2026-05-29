import type { Config } from '@netlify/edge-functions'

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

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${subject}</title>
      </head>
      <body style="background-color: #0d0a0a; margin: 0; padding: 40px 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #141111; border: 1px solid #261f1f; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.6);">
          <tr>
            <td height="4" style="background: linear-gradient(90deg, #b89742, #f3e5ab, #b89742);"></td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h1 style="color: #d4af37; font-size: 24px; font-weight: 300; letter-spacing: 1px; margin-top: 0; margin-bottom: 24px; font-family: 'Georgia', serif;">
                ${isSv ? `Hej!` : `Hi!`}
              </h1>
              <div style="color: #e2dada; font-size: 15px; line-height: 1.6; font-weight: 300;">
                ${
                  isSv
                    ? `
                  <p style="margin-bottom: 20px;">Tack för att du prenumererar på <strong>Tip the Velvet</strong>s nyhetsbrev. Vad roligt att du vill få uppdateringar om event och annat roligt från oss!</p>
                  <p style="margin-bottom: 20px;">Du kan alltid avsluta din prenumeration via "avregistrera"-länken i kommande mail.</p>
                `
                    : `
                  <p style="margin-bottom: 20px;">Thank you for subscribing to <strong>Tip the Velvet</strong>'s newsletter. We're excited to have you on board!</p>
                  <p style="margin-bottom: 20px;">You can always unsubscribe by clicking the "unsubscribe" link in the emails you receive.</p>
                `
                }
              </div>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-top: 40px; margin-bottom: 30px;">
                <tr>
                  <td height="1" style="background-color: #261f1f;"></td>
                </tr>
              </table>
              <p style="color: #b89742; font-family: 'Georgia', serif; font-style: italic; font-size: 16px; margin: 0;">
                ${isSv ? 'Med fabulösa hälsningar,' : 'With fabulous regards,'}<br />
                <span style="color: #f3e5ab; font-weight: bold; font-style: normal; letter-spacing: 0.5px;">Tip the Velvet Crew</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #0a0808; padding: 20px 30px; text-align: center; border-top: 1px solid #1a1515;">
              <p style="color: #5c5252; font-size: 12px; margin: 0; letter-spacing: 0.5px;">
                ✦ TIP THE VELVET — GOTHENBURG ✦
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `

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
