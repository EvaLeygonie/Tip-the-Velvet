import type { Config } from '@netlify/edge-functions'

interface MailchimpError {
  title?: string
  status?: number
  detail?: string
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const { email } = (await req.json()) as { email?: string }

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

    const url = `https://${DATACENTER}.api.mailchimp.com/3.0/lists/${AUDIENCE_ID}/members`

    const response = await fetch(url, {
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

    const responseData = (await response.json()) as MailchimpError

    if (!response.ok) {
      if (
        responseData.title === 'Member Exists' ||
        (responseData.status === 400 && responseData.title?.includes('Exists'))
      ) {
        return new Response(JSON.stringify({ error: 'already_subscribed' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      throw new Error(responseData.detail || 'Kunde inte lägga till prenumerant.')
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
  path: '/api/subscribe',
}
