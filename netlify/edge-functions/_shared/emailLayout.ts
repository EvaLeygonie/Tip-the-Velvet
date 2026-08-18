// Shared HTML wrapper for all transactional emails (application-confirmation, send-casting-email,
// subscribe). Not an edge function itself — no default export, no `config`, so Netlify's
// file-based routing won't pick it up as a routable path.

export interface EmailLayoutOptions {
  subject: string
  greetingHtml: string
  bodyHtml: string
  isSv: boolean
}

export const renderEmailHtml = ({ subject, greetingHtml, bodyHtml, isSv }: EmailLayoutOptions) => `
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
            ${greetingHtml}
          </h1>
          <div style="color: #e2dada; font-size: 15px; line-height: 1.6; font-weight: 300;">
            ${bodyHtml}
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
