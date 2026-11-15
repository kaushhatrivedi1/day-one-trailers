// Company research for job-description trailers: what does this employer actually do?
// 1. Gemini with Google Search grounding (live web, with source links), when the key has quota.
// 2. Otherwise public pages only: the company's own site (from the posting) and its Wikipedia summary,
//    summarised by the model using ONLY that text, so nothing is invented. Sources are returned.
import { geminiJson } from './gemini.js'
import { get, htmlToText, decode } from './jobpage.js'

const LANGS = { en: 'English', es: 'Spanish', hi: 'Hindi', ar: 'Arabic', vi: 'Vietnamese' }

async function groundedSearch(company, role) {
  const key = process.env.GEMINI_API_KEY
  if (!key) return null
  for (const model of ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `Using web search, describe the company "${company}" for someone about to work there as ${role || 'an employee'}: what it does, its main products or services, who its customers are, and roughly how big it is. 4 short factual sentences, no marketing language.` }] }],
        tools: [{ google_search: {} }],
      }),
      signal: AbortSignal.timeout(20000),
    }).catch(() => null)
    if (!res?.ok) continue
    const c = (await res.json()).candidates?.[0]
    const text = c?.content?.parts?.map((p) => p.text || '').join('').trim()
    if (!text) continue
    const sources = (c.groundingMetadata?.groundingChunks || []).map((g) => g.web).filter(Boolean)
      .map((w) => ({ title: w.title || w.uri, url: w.uri })).slice(0, 5)
    return { text, sources, method: 'search' }
  }
  return null
}

async function wikipedia(company) {
  const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(company.replace(/\s+/g, '_'))}`, {
    headers: { 'User-Agent': 'DayOne/1.0 (student hackathon app)', Accept: 'application/json' },
    signal: AbortSignal.timeout(6000),
  }).catch(() => null)
  if (!res?.ok) return null
  const d = await res.json()
  if (d.type === 'disambiguation' || !d.extract) return null
  return { text: d.extract, source: { title: `Wikipedia: ${d.title}`, url: d.content_urls?.desktop?.page || '' } }
}

function siteCandidates(company, jobUrl, orgUrl) {
  const out = []
  if (orgUrl) out.push(orgUrl)
  try {
    const host = new URL(jobUrl).hostname.replace(/^www\./, '')
    const known = /(greenhouse\.io|lever\.co|ashbyhq\.com|workable\.com|myworkdayjobs\.com|smartrecruiters\.com|linkedin\.com|indeed\.com)$/
    if (host && !known.test(host)) out.push(`https://${host.replace(/^(careers|jobs|job|apply|work)\./, '')}/`)
  } catch { /* no job URL */ }
  const slug = String(company || '').toLowerCase().replace(/[^a-z0-9]+/g, '')
  if (slug.length > 2) out.push(`https://www.${slug}.com/`)
  return [...new Set(out)]
}

async function companySite(company, jobUrl, orgUrl) {
  for (const url of siteCandidates(company, jobUrl, orgUrl)) {
    try {
      const html = await get(url)
      const title = decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '')
      const desc = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i) || [])[1] || ''
      const words = String(company).toLowerCase().split(/\s+/).filter((w) => w.length > 2)
      // Only trust a guessed site whose title or description names the company.
      if (words.length && !words.some((w) => `${title} ${desc}`.toLowerCase().includes(w))) continue
      const body = htmlToText((html.match(/<main[\s\S]*?<\/main>/i) || [html])[0]).slice(0, 2500)
      return { text: `${title}\n${desc}\n${body}`, source: { title: title.trim() || url, url } }
    } catch { /* try the next candidate */ }
  }
  return null
}

// Returns { company, summary, sources[], method } or null. `summary` is in the viewer's language.
export async function researchCompany({ company, role, jdText = '', jobUrl = '', orgUrl = '', lang = 'en' }) {
  if (!company) {
    const found = await geminiJson(`From this job posting, give the employer's name and the job title.
Posting: """${jdText.slice(0, 3000)}"""
Return JSON: {"company":"","role":""}`, { fast: true }).catch(() => ({}))
    company = String(found.company || '').trim()
    role = role || String(found.role || '').trim()
  }
  if (!company) return null

  const searched = await groundedSearch(company, role).catch(() => null)
  let facts = searched?.text || ''
  let sources = searched?.sources || []
  let method = searched ? 'search' : 'pages'
  if (!searched) {
    const [wiki, site] = await Promise.all([wikipedia(company).catch(() => null), companySite(company, jobUrl, orgUrl).catch(() => null)])
    facts = [wiki?.text, site?.text].filter(Boolean).join('\n\n')
    sources = [wiki?.source, site?.source].filter(Boolean)
  }
  if (!facts.trim()) return { company, summary: '', sources: [], method: 'none' }

  const out = await geminiJson(`Summarise what the company "${company}" does, using ONLY the facts below. If the facts are thin,
say less; never add facts. Write in ${LANGS[lang] || 'English'}, for a teenager, plain words.
Facts:
"""${facts.slice(0, 5000)}"""
Return JSON: {"summary":"3 short sentences: what they make or do, for whom, and anything notable","products":["up to 4 real products, services or customers named in the facts"]}`, { fast: true }).catch(() => null)
  return { company, role, summary: out?.summary || '', products: out?.products || [], sources, method }
}
