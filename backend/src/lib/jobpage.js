// Read a job posting from a link. Prefers the page's schema.org JobPosting data (Greenhouse, Lever,
// Ashby, Workable and many career sites include it), and falls back to the page's visible text.
// Safety: http(s) only, public hosts only (no localhost / private / link-local addresses, checked
// again on every redirect), 8 s timeout, 2 MB cap. Sites that block bots (LinkedIn, Indeed) fail
// with a clear message so the person can paste the text instead.
import dns from 'node:dns/promises'
import net from 'node:net'

export const looksLikeUrl = (s) => /^https?:\/\/\S+$/i.test(String(s || '').trim())

function privateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number)
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
  }
  const v = ip.toLowerCase()
  return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80') ||
    (v.startsWith('::ffff:') && privateIp(v.slice(7)))
}

async function assertPublic(url) {
  const u = new URL(url)
  if (!['http:', 'https:'].includes(u.protocol)) throw new Error('Only web links work here.')
  if (u.port && !['80', '443'].includes(u.port)) throw new Error('That link uses an unusual port.')
  const addrs = await dns.lookup(u.hostname, { all: true }).catch(() => [])
  if (!addrs.length) throw new Error('That website could not be found.')
  if (addrs.some((a) => privateIp(a.address))) throw new Error('That link points to a private address.')
  return u
}

export async function get(url, hops = 0) {
  await assertPublic(url)
  const res = await fetch(url, {
    redirect: 'manual',
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DayOneBot/1.0; reads one job posting)', Accept: 'text/html,application/xhtml+xml' },
    signal: AbortSignal.timeout(8000),
  })
  if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
    if (hops >= 3) throw new Error('That link redirects too many times.')
    return get(new URL(res.headers.get('location'), url).toString(), hops + 1)
  }
  if (res.status === 401 || res.status === 403 || res.status === 429 || res.status === 999) throw new Error('That site blocks automatic reading.')
  if (!res.ok) throw new Error(`That page answered ${res.status}.`)
  const reader = res.body.getReader()
  const chunks = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.length
    if (size > 2_000_000) { reader.cancel(); break }
    chunks.push(value)
  }
  return Buffer.concat(chunks).toString('utf8')
}

export const decode = (s) => s
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))

export const htmlToText = (html) => (decode(String(html)
  .replace(/<(script|style|noscript|svg|nav|footer|header)[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<(br|\/p|\/li|\/h\d|\/div)>/gi, '\n')
  .replace(/<li[^>]*>/gi, '\n- ')
  .replace(/<[^>]+>/g, ' '))
  .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim()
  .split('\n').map((l) => l.trim()).filter((l, i, all) => l.replace(/^-\s*/, '').length > 2 && all.indexOf(l) === i).join('\n'))

function jobPostingLd(html) {
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    let data
    try { data = JSON.parse(m[1].trim()) } catch { continue }
    const items = [data, ...(Array.isArray(data) ? data : []), ...(data['@graph'] || [])]
    const job = items.find((x) => x && (x['@type'] === 'JobPosting' || (Array.isArray(x['@type']) && x['@type'].includes('JobPosting'))))
    if (job) return job
  }
  return null
}

export async function readJobPage(url) {
  const html = await get(url)
  const ld = jobPostingLd(html)
  if (ld) {
    const company = typeof ld.hiringOrganization === 'string' ? ld.hiringOrganization : ld.hiringOrganization?.name || ''
    const place = [ld.jobLocation?.address?.addressLocality, ld.jobLocation?.address?.addressRegion].filter(Boolean).join(', ')
    const text = [`${ld.title || ''}${company ? ` - ${company}` : ''}${place ? ` (${place})` : ''}`, htmlToText(ld.description || ''),
      ld.qualifications ? `Qualifications: ${htmlToText(ld.qualifications)}` : '', ld.skills ? `Skills: ${htmlToText(ld.skills)}` : '']
      .filter(Boolean).join('\n')
    const org = typeof ld.hiringOrganization === 'object' ? ld.hiringOrganization : {}
    const orgUrl = [org.sameAs, org.url].flat().find((u) => typeof u === 'string' && /^https?:/.test(u)) || ''
    return { text: text.slice(0, 6000), title: ld.title || '', company, orgUrl, url, source: 'schema' }
  }
  const title = decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '').trim()
  const main = (html.match(/<main[\s\S]*?<\/main>/i) || [html])[0]
  const text = htmlToText(main)
  if (text.length < 200) throw new Error('That page has no readable job text (it may need JavaScript or a login).')
  return { text: `${title}\n${text}`.slice(0, 6000), title, company: '', orgUrl: '', url, source: 'text' }
}
