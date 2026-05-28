import type { Config } from '@netlify/edge-functions'

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
    const { email, name, language } = (await req.json()) as {
      email?: string
      name?: string
      language?: string
    }

    if (!email || !name) {
      return new Response(JSON.stringify({ error: 'Namn och e-post krävs.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'Resend API-nyckel saknas.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const isSv = language === 'sv'

    const subject = isSv
      ? 'Tack för din castingansökan! ✦'
      : 'Thank you for your casting application! ✦'

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
                ${isSv ? `Hej ${name}!` : `Darling ${name},`}
              </h1>

              <div style="color: #e2dada; font-size: 15px; line-height: 1.6; font-weight: 300;">
                ${
                  isSv
                    ? `
                  <p style="margin-bottom: 20px;">Vi har tagit emot din ansökan till <strong>Tip the Velvet</strong>. Vad roligt att du vill uppträda hos oss!</p>
                  <p style="margin-bottom: 20px;">Vi går igenom alla ansökningar löpande, och kommer att svara dig/er på denna adressen oavsett om svaret är postitivt eller ej.</p>
                `
                    : `
                  <p style="margin-bottom: 20px;">We have successfully received your application for <strong>Tip the Velvet</strong>. Thank you for wanting to perform on our stage!</p>
                  <p style="margin-bottom: 20px;">We reviews all applications continuously. We'll get back to you on this email adress regardless of the outcome.</p>
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

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Tip the Velvet <casting@tipthevelvet.nu>',
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
  path: '/api/casting-confirmation',
}
