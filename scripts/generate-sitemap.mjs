// Generates public/sitemap.xml at build time: the fixed pages plus every published event and
// public performer from Supabase (using the same public anon key the site itself uses).
// Never fails the build — if Supabase is unreachable it writes the fixed pages only.
import { writeFileSync } from 'node:fs'
import { loadEnv } from 'vite'

const SITE_URL = 'https://www.tipthevelvet.nu'
const env = { ...loadEnv('production', process.cwd(), 'VITE_'), ...process.env }
const supabaseUrl = env.VITE_SUPABASE_URL
const anonKey = env.VITE_SUPABASE_ANON_KEY

const staticPaths = [
  '/',
  '/events',
  '/casting-call',
  '/performers',
  '/dresscode',
  '/about',
  '/join',
]

const query = async (path) => {
  const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
  })
  if (!res.ok) throw new Error(`${path}: ${res.status}`)
  return res.json()
}

const urls = staticPaths.map((p) => ({ loc: p }))

if (supabaseUrl && anonKey) {
  try {
    const [events, oldEvents, performers] = await Promise.all([
      query('events?select=slug&status=in.(published,archived)'),
      query('old_events?select=slug'),
      query('public_performers?select=slug'),
    ])
    for (const e of events) if (e.slug) urls.push({ loc: `/events/event/${e.slug}` })
    for (const e of oldEvents) if (e.slug) urls.push({ loc: `/events/old/${e.slug}` })
    for (const p of performers) if (p.slug) urls.push({ loc: `/performers/${p.slug}` })
  } catch (err) {
    console.warn('[sitemap] Supabase fetch failed, writing static pages only:', err.message)
  }
} else {
  console.warn('[sitemap] Supabase env vars missing, writing static pages only')
}

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${escape(SITE_URL + (u.loc === '/' ? '/' : u.loc))}</loc></url>`).join('\n')}
</urlset>
`
writeFileSync('public/sitemap.xml', xml)
console.log(`[sitemap] wrote ${urls.length} URLs`)
