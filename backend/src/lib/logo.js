// The employer's logo for a job-posting trailer, taken from the company's own website (the icon it
// publishes for browsers and phones). Returned as a data URL so the browser never hot-links it.
// Shown only on the entrance sign and in the credits, next to an "unofficial" note.
import { get, assertPublic } from './jobpage.js'

// Small cap: the research object also travels through Step Functions, whose payload limit is 256 KB.
const MAX = 60_000
const TYPES = /^image\/(png|svg\+xml|jpeg|webp|x-icon|vnd\.microsoft\.icon)/

async function image(url) {
  try { await assertPublic(url) } catch { return null }
  const res = await fetch(url, {
    redirect: 'follow',
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DayOneBot/1.0)', Accept: 'image/*' },
    signal: AbortSignal.timeout(6000),
  }).catch(() => null)
  if (!res?.ok) return null
  const type = (res.headers.get('content-type') || '').split(';')[0].trim()
  if (!TYPES.test(type)) return null
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 200 || buf.length > MAX) return null
  return `data:${type};base64,${buf.toString('base64')}`
}

// Icons the page declares, best first: SVG, then the largest apple-touch-icon or icon.
function declared(html, base) {
  const out = []
  for (const tag of html.match(/<link\b[^>]*>/gi) || []) {
    const rel = (tag.match(/rel=["']([^"']+)/i) || [])[1]?.toLowerCase() || ''
    if (!/icon/.test(rel) || /mask-icon/.test(rel)) continue
    const href = (tag.match(/href=["']([^"']+)/i) || [])[1]
    if (!href) continue
    const size = Number(((tag.match(/sizes=["'](\d+)/i) || [])[1]) || 0)
    const svg = /\.svg(\?|$)/i.test(href) || /svg/i.test(tag)
    const apple = /apple-touch/.test(rel)
    try { out.push({ url: new URL(href, base).toString(), score: (svg ? 1000 : 0) + (apple ? 180 : 0) + size }) } catch { /* bad href */ }
  }
  return out.sort((a, b) => b.score - a.score).map((x) => x.url)
}

export async function findLogo(sites = []) {
  for (const site of [...new Set(sites.filter(Boolean))].slice(0, 4)) {
    let base
    try { base = new URL(/^https?:/i.test(site) ? site : `https://${site}`).origin + '/' } catch { continue }
    const html = await get(base).catch(() => '')
    const tries = [...declared(html, base), `${base}apple-touch-icon.png`, `${base}favicon.ico`]
    for (const url of tries.slice(0, 6)) {
      const logo = await image(url)
      if (logo) return { logo, logoFrom: base }
    }
  }
  return null
}
