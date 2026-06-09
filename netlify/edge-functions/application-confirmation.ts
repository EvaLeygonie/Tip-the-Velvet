import type { Config } from '@netlify/edge-functions'

interface ResendError {
  message?: string
}

interface ApplicationBody {
  name: string
  email: string
  language: 'sv' | 'en'
  deadline?: string
  type: 'casting' | 'staff' | 'sponsor'
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
          ? `<p style="margin: 0 0 16px 0; padding: 0; line-height: 1.5;">Vi har tagit emot din ansökan till <strong>Tip the Velvet</strong>. Vad roligt att du vill joina vårt kollektiv!</p><p style="margin: 0 0 16px 0; padding: 0; line-height: 1.5;">Vi hör av oss nästa gång vi har behov av dina unika talanger!</p>`
          : `<p style="margin: 0 0 16px 0; padding: 0; line-height: 1.5;">We have received your application for <strong>Tip the Velvet</strong>. Thank you for wanting to be a part of our collective!</p><p style="margin: 0 0 16px 0; padding: 0; line-height: 1.5;">We'll let you know next time we're in need of your special talents!</p>`
        break

      case 'sponsor':
        emailHtml = isSv
          ? `<p style="margin: 0 0 16px 0; padding: 0; line-height: 1.5;">Vi har tagit emot din ansökan till <strong>Tip the Velvet</strong>. Vad roligt att du vill samarbeta med eller sponsra oss!</p><p style="margin: 0 0 16px 0; padding: 0; line-height: 1.5;">Vi kontaktar dig inom kort!</p>`
          : `<p style="margin: 0 0 16px 0; padding: 0; line-height: 1.5;">We have received your application for <strong>Tip the Velvet</strong>. Thank you for wanting to sponsor or collaborate with us!</p><p style="margin: 0 0 16px 0; padding: 0; line-height: 1.5;">We'll contact you soon!</p>`
        break
    }

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
          <h1 style="color: #d4af37; font-size: 24px; font-weight: 300; letter-spacing: 1px; margin-top: 0; margin-bottom: 24px; font-family: Georgia, serif;">
            ${isSv ? `Hej ${name}!` : `Darling ${name},`}
          </h1>
          <div style="color: #e2dada; font-size: 15px; line-height: 1.6; font-weight: 300;">
            ${emailHtml}
          </div>

          <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-top: 30px; margin-bottom: 30px;">
            <tr>
              <td height="1" style="background-color: #261f1f;"></td>
            </tr>
          </table>

          <p style="color: #b89742; font-family: Georgia, serif; font-style: italic; font-size: 16px; margin: 0; line-height: 1.4;">
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
