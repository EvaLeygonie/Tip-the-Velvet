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
    const { email, name } = (await req.json()) as { email?: string; name?: string }

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
        subject: 'Tack för din castingansökan! ✦',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; color: #111;">
            <h2 style="color: #D4AF37;">Hej ${name}!</h2>
            <p>Vi har tagit emot din ansökan till Tip the Velvet. Vad roligt att du vill skapa magi tillsammans med oss!</p>
            <p>Vårt crew kommer att gå igenom alla ansökningar fortlöpande. Om din profil matchar det vi söker för kommande produktioner så hör vi av oss till dig via denna mailadress.</p>
            <br />
            <p style="font-style: italic;">Med magiska hälsningar,<br />Tip the Velvet-crewet</p>
          </div>
        `,
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
