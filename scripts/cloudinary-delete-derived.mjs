// One-off clean-up: deletes the resized copies ("derived resources") Cloudinary has made of the
// images, and keeps every original. Resized copies count towards storage, and after the smaller
// card and thumbnail sizes most of the old ones are no longer used. Any copy that is still needed
// is simply made again the next time someone views the image (one transformation, 1/1000 credit).
//
// Run it on your own computer, never from the website. The API secret is typed in the terminal and
// kept in the environment for that session only; nothing is written to a file.
//
//   export CLOUDINARY_CLOUD_NAME=<your cloud name>
//   export CLOUDINARY_API_KEY=<your API key>
//   read -s CLOUDINARY_API_SECRET && export CLOUDINARY_API_SECRET
//
//   node scripts/cloudinary-delete-derived.mjs              # only looks: counts and storage
//   node scripts/cloudinary-delete-derived.mjs --test       # deletes copies of 5 images only
//   node scripts/cloudinary-delete-derived.mjs --run        # deletes the copies of every image
//
// The key and secret are under Settings > API keys in the Cloudinary dashboard.

import readline from 'node:readline/promises'

const {
  CLOUDINARY_CLOUD_NAME: cloud,
  CLOUDINARY_API_KEY: key,
  CLOUDINARY_API_SECRET: secret,
} = process.env
if (!cloud || !key || !secret) {
  console.error('Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET first.')
  process.exit(1)
}

const args = process.argv.slice(2)
const RUN = args.includes('--run')
const TEST = args.includes('--test')
const BATCH = 100
const PAUSE_MS = 1500

const base = `https://api.cloudinary.com/v1_1/${cloud}`
const auth = `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// One call to the Admin API; waits and tries again if Cloudinary says "too many requests".
const call = async (method, path, params = new URLSearchParams()) => {
  const url = `${base}${path}${params.size ? `?${params}` : ''}`
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch(url, { method, headers: { Authorization: auth } })
    if (response.status === 420 || response.status === 429) {
      console.log('Cloudinary asks us to slow down, waiting a minute ...')
      await sleep(60_000)
      continue
    }
    const body = await response.json().catch(() => ({}))
    if (!response.ok)
      throw new Error(`${method} ${path}: ${response.status} ${body?.error?.message ?? ''}`)
    return body
  }
  throw new Error(`${method} ${path}: still rate limited after 3 tries`)
}

const gb = (bytes) => (bytes / 1024 ** 3).toFixed(2)

const printUsage = async (label) => {
  const usage = await call('GET', '/usage')
  const storage = usage.storage ?? {}
  console.log(
    `${label}: storage ${storage.usage != null ? `${gb(storage.usage)} GB` : '?'}` +
      `${storage.credits_usage != null ? ` (${storage.credits_usage} credits)` : ''}` +
      `, ${usage.resources ?? '?'} originals, ${usage.derived_resources ?? '?'} resized copies`
  )
}

const listPublicIds = async () => {
  const ids = []
  let cursor
  do {
    const params = new URLSearchParams({ max_results: '500' })
    if (cursor) params.set('next_cursor', cursor)
    const page = await call('GET', '/resources/image/upload', params)
    ids.push(...(page.resources ?? []).map((r) => r.public_id))
    cursor = page.next_cursor
    if (cursor) await sleep(PAUSE_MS)
  } while (cursor)
  return ids
}

await printUsage('Before')
let ids = await listPublicIds()
console.log(`Found ${ids.length} images.`)
if (TEST) ids = ids.slice(0, 5)

if (!RUN && !TEST) {
  console.log('\nNothing was deleted. Run with --test (5 images) or --run (all) to delete copies.')
  process.exit(0)
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const answer = await rl.question(
  `Delete the resized copies of ${ids.length} images and keep the originals? Type yes: `
)
rl.close()
if (answer.trim().toLowerCase() !== 'yes') {
  console.log('Stopped, nothing deleted.')
  process.exit(0)
}

let deletedCopies = 0
for (let i = 0; i < ids.length; i += BATCH) {
  const params = new URLSearchParams({ keep_original: 'true' })
  for (const id of ids.slice(i, i + BATCH)) params.append('public_ids[]', id)
  const result = await call('DELETE', '/resources/image/upload', params)
  const counts = Object.values(result.deleted_counts ?? {})
  const copies = counts.reduce((sum, c) => sum + (c.derived ?? 0), 0)
  const originals = counts.reduce((sum, c) => sum + (c.original ?? 0), 0)
  deletedCopies += copies
  console.log(`Batch ${i / BATCH + 1}: ${copies} copies deleted, ${originals} originals touched`)
  if (originals > 0) {
    console.error('An original was deleted, which should not happen. Stopping.')
    process.exit(1)
  }
  await sleep(PAUSE_MS)
}

console.log(`\nDone: ${deletedCopies} resized copies deleted, all originals kept.`)
await printUsage('After')
console.log('The dashboard can take up to a day to show the new storage figure.')
