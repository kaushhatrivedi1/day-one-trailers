// Local API for testing on localhost, without deploying to AWS.
// Same routes as the AWS API (behind Vite's /api proxy). Gemini writes the script in the
// chosen language; ElevenLabs speaks it. Keys come from backend/.env.deploy.
//   node backend/local-server.js        (port 8787; `npm run dev:all` starts it with Vite)
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { randomUUID, createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const envFile = path.join(here, '.env.deploy')
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    const value = m?.[2].trim()
    if (m && value && value.length > 3 && !process.env[m[1]]) process.env[m[1]] = value
  }
}

const { handler: writeScript } = await import('./src/script.js')
const { handler: screenTest } = await import('./src/screentest.js')
const { handler: interview } = await import('./src/interview.js')
const { speakEleven, voiceEnabled } = await import('./src/lib/voice.js')
const { signLine, verifyGlosses, resolve: resolveSigns, signLibrary, chainMotion } = await import('./src/lib/sign.js')
const { looksLikeUrl, readJobPage } = await import('./src/lib/jobpage.js')
const { remember } = await import('./src/lib/memory.js')
const { researchCompany } = await import('./src/lib/company.js')
const { handler: memoryApi } = await import('./src/memoryapi.js')
const SIGN_DIR = path.join(here, 'signs')
process.env.SIGN_DIR ||= SIGN_DIR
const SIGN_OUT = path.join(here, 'signs', '.out')
const signed = new Map() // lang|text -> result (persisted, so restarts don't spend model requests again)
const SIGN_CACHE = path.join(here, 'signs', '.cache.json')
const savedSigns = fs.existsSync(SIGN_CACHE) ? JSON.parse(fs.readFileSync(SIGN_CACHE, 'utf8')) : {}
for (const [k, v] of Object.entries(savedSigns)) if (!v.gloss?.some((g) => /\s/.test(g)) && v.motion ) signed.set(k, Promise.resolve(v))
const saveSigns = () => Promise.all([...signed].map(async ([k, p]) => [k, await p.catch(() => null)]))
  .then((rows) => fs.writeFileSync(SIGN_CACHE, JSON.stringify(Object.fromEntries(rows.filter(([, v]) => v && v.status !== 'no-library')))))

const PORT = Number(process.env.LOCAL_API_PORT || 8787)
const trailers = new Map() // id -> trailer state
const audio = new Map() // key -> mp3 bytes
const spoken = new Map() // hash of lang|text -> { audioUrl, marks }

const send = (res, status, body, type = 'application/json') => {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' })
  res.end(type === 'application/json' ? JSON.stringify(body) : body)
}
const readBody = (req) => new Promise((resolve) => {
  let data = ''
  req.on('data', (c) => (data += c))
  req.on('end', () => resolve(data))
})

async function voice(text) {
  const { bytes, marks } = await speakEleven(text)
  const key = randomUUID()
  audio.set(key, bytes)
  return { audioUrl: `/api/audio/${key}.mp3`, marks }
}

// Runs the whole pipeline in the background; GET /trailer/:id reports progress like the AWS version.
// Progress is published step by step (research, scene titles, voices, signs) for the making screen.
async function produce(id, { job, lang, profile, jd, jobPage, guest, research, genre }) {
  const t = trailers.get(id)
  try {
    if (jd && !research) {
      t.stage = 'research'
      research = await researchCompany({ company: jobPage?.company, role: job || jobPage?.title, jdText: jd, jobUrl: jobPage?.url, orgUrl: jobPage?.orgUrl, lang }).catch(() => null)
    }
    if (research) Object.assign(t, { research, company: research.company || t.company })
    t.stage = 'script'
    const script = await writeScript({ jobId: id, job, lang, profile, jd, jobPage, research, genre })
    Object.assign(t, { research: script.research || research, job: script.job, company: script.company, kit: script.kit, credits: script.credits, total: script.scenes.length })
    t.draft = script.scenes.map((s) => ({ title: s.title, screen: s.screen || '' }))
    t.stage = 'voice'
    t.progress = { voiced: 0, signed: 0, signOk: 0, total: script.scenes.length }
    // ASL: check every scene's signing in one blind back-translation batch, then build Bolt's motion.
    const withGloss = script.scenes.filter((s) => s.asl?.length)
    const signing = verifyGlosses(withGloss.map((s) => ({ text: s.narration, gloss: s.asl })))
      .catch(() => withGloss.map(() => ({ pass: false, score: 0, back: '' })))
      .then((checks) => Promise.all(script.scenes.map((s) => {
        const i = withGloss.indexOf(s)
        return signFor(s.narration, lang, s.asl, i >= 0 ? checks[i] : null)
          .then((r) => { t.progress.signed++; if (r?.status === 'ok') t.progress.signOk++; return r })
          .catch((e) => { t.progress.signed++; console.warn('sign failed', e.message) })
      })))
      .then((rs) => console.log('signing:', rs.map((r) => r ? `${r.status}${r.check ? ' ' + r.check.score : ''}` : 'error').join(', ')))
    const voiced = await Promise.all(script.scenes.map(async (s) => {
      let v = { audioUrl: null, marks: null }
      if (voiceEnabled()) {
        try { v = await voice(s.narration) } catch (e) { console.warn('voice failed', e.message) }
      }
      t.progress.voiced++
      return { title: s.title, narration: s.narration, screen: s.screen || '', index: s.index, ...v }
    }))
    await signing
    t.stage = 'final'
    t.scenes = voiced.sort((a, b) => a.index - b.index)
    t.status = 'done'
    remember(guest, `The visitor watched a Day One trailer about working as ${t.job}${t.company ? ` at ${t.company}` : ''}${jd ? ' (from a job posting they pasted)' : ''}.`, { type: 'trailer', job: t.job || '' }).catch(() => {})
    console.log(`trailer ${t.job} (${lang}) ready: ${t.scenes.length} scenes, voice ${voiceEnabled() ? 'on' : 'off'}`)
  } catch (e) {
    console.error('trailer failed', e)
    t.status = 'failed'
    t.error = e.message
  }
}

// Company preview for the lobby card, cached so pressing play reuses the same research.
const previews = new Map() // jd input -> Promise<{ jdText, jobPage, research }>
function preview(input, lang) {
  const key = lang + '|' + input
  if (!previews.has(key)) {
    previews.set(key, (async () => {
      let jdText = input, jobPage = {}
      if (looksLikeUrl(input)) { jobPage = await readJobPage(input); jdText = jobPage.text }
      const research = await researchCompany({ company: jobPage.company, role: jobPage.title, jdText, jobUrl: jobPage.url, orgUrl: jobPage.orgUrl, lang }).catch(() => null)
      return { jdText, jobPage: { company: jobPage.company, title: jobPage.title, url: jobPage.url, orgUrl: jobPage.orgUrl }, research }
    })().catch((e) => { previews.delete(key); throw e }))
  }
  return previews.get(key)
}

async function signFor(text, lang, gloss = null, check = null, simple = false) {
  const k = lang + '|' + text
  if (!signed.has(k)) {
    signed.set(k, signLine(String(text).slice(0, 400), lang, SIGN_DIR, SIGN_OUT, gloss, check, simple)
      .then((r) => ({ ...r, video: undefined, videoUrl: r.video ? `/api/sign-video/${r.video.key}.mp4` : null }))
      .catch((e) => { signed.delete(k); throw e }))
    signed.get(k).then(saveSigns, () => {})
  }
  return signed.get(k)
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const route = url.pathname.replace(/^\/api/, '')
  try {
    if (req.method === 'POST' && route === '/trailer') {
      const body = JSON.parse((await readBody(req)) || '{}')
      const job = String(body.job || '').trim().slice(0, 80)
      let jd = String(body.jd || '').trim().slice(0, 6000)
      let jobPage = {}
      let research = null
      if (jd) {
        try { ({ jdText: jd, jobPage, research } = await preview(jd, ['en', 'es', 'hi', 'ar', 'vi'].includes(body.lang) ? body.lang : 'en')) } catch (e) { return send(res, 422, { error: `${e.message} Paste the job description text instead.` }) }
      }
      if (!job && jd.length < 40) return send(res, 400, { error: 'Tell us which job, or paste a job description.' })
      const lang = ['en', 'es', 'hi', 'ar', 'vi'].includes(body.lang) ? body.lang : 'en'
      const id = randomUUID()
      trailers.set(id, { status: 'running', job, jdText: jd, lang, total: 6, scenes: [], credits: null })
      produce(id, { job, lang, jd, research, genre: ['action', 'documentary', 'comedy', 'feelgood'].includes(body.genre) ? body.genre : '', guest: String(body.guest || ''), jobPage: { company: jobPage.company, title: jobPage.title, url: jobPage.url, orgUrl: jobPage.orgUrl }, profile: String(body.profile || '').slice(0, 280) })
      return send(res, 202, { id, status: 'running', jdText: jd })
    }
    const m = route.match(/^\/trailer\/([\w-]+)$/)
    if (req.method === 'GET' && m) {
      const t = trailers.get(m[1])
      if (!t) return send(res, 404, { error: 'Trailer not found. It may have expired.' })
      return send(res, 200, { ...t, source: 'local' })
    }
    const a = route.match(/^\/audio\/([\w-]+)\.mp3$/)
    if (req.method === 'GET' && a) {
      const bytes = audio.get(a[1])
      return bytes ? send(res, 200, bytes, 'audio/mpeg') : send(res, 404, { error: 'No audio' })
    }
    if (req.method === 'POST' && route === '/speak') {
      const { text = '', lang = 'en' } = JSON.parse((await readBody(req)) || '{}')
      if (!voiceEnabled()) return send(res, 503, { error: 'No ElevenLabs key' })
      const k = createHash('sha1').update(lang + '|' + text).digest('hex')
      if (!spoken.has(k)) spoken.set(k, await voice(String(text).slice(0, 600)))
      return send(res, 200, spoken.get(k))
    }
    if (req.method === 'POST' && route === '/sign') {
      const { text = '', lang = 'en', simple = false, gloss = null } = JSON.parse((await readBody(req)) || '{}')
      return send(res, 200, await signFor(text, lang, Array.isArray(gloss) && gloss.length ? gloss : null, null, !!simple))
    }
    // Local testing: play a given gloss list as Bolt motion, skipping the AI steps.
    if (req.method === 'POST' && route === '/sign-gloss') {
      const { gloss = [] } = JSON.parse((await readBody(req)) || '{}')
      const lib = signLibrary(SIGN_DIR)
      const { clips, missing } = resolveSigns(gloss.map((g) => String(g).toUpperCase()), lib)
      const motion = chainMotion(clips, SIGN_DIR)
      return send(res, 200, { gloss, missing, motion: motion.frames.length ? { frames: motion.frames } : null, motionMissing: motion.missing })
    }
    const sv = route.match(/^\/sign-video\/([a-f0-9]+)\.mp4$/)
    if (req.method === 'GET' && sv) {
      const file = path.join(SIGN_OUT, `${sv[1]}.mp4`)
      return fs.existsSync(file) ? send(res, 200, fs.readFileSync(file), 'video/mp4') : send(res, 404, { error: 'No video' })
    }
    if (req.method === 'GET' && route === '/now-showing') return send(res, 200, [])
    if (req.method === 'POST' && (route.startsWith('/interview/') || route.startsWith('/session/'))) {
      const out = await interview({ rawPath: route, body: await readBody(req) })
      return send(res, out.statusCode, JSON.parse(out.body))
    }
    // Lobby: the live company card for a pasted posting or link.
    if (req.method === 'POST' && route === '/company/preview') {
      const { jd = '', lang = 'en' } = JSON.parse((await readBody(req)) || '{}')
      const input = String(jd).trim().slice(0, 6000)
      if (!looksLikeUrl(input) && input.length < 40) return send(res, 400, { error: 'Paste a job link or description.' })
      try {
        const p = await preview(input, lang)
        return send(res, 200, { research: p.research, title: p.jobPage.title || '', company: p.research?.company || p.jobPage.company || '' })
      } catch (e) { return send(res, 422, { error: `${e.message} Paste the job description text instead.` }) }
    }
    // Returning visitor: Bolt's welcome-back line from what Supermemory recalls.
    if (req.method === 'POST' && route === '/memory/greeting') {
      const out = await memoryApi({ rawPath: route, body: await readBody(req) })
      return send(res, out.statusCode, JSON.parse(out.body))
    }
    if (req.method === 'POST' && route.startsWith('/screentest/')) {
      const out = await screenTest({ rawPath: route, body: await readBody(req) })
      return send(res, out.statusCode, JSON.parse(out.body))
    }
    if (req.method === 'GET' && route === '/health') return send(res, 200, { ok: true, gemini: !!process.env.GEMINI_API_KEY, voice: voiceEnabled() })
    send(res, 404, { error: `No route ${req.method} ${route}` })
  } catch (e) {
    console.error(e)
    send(res, 500, { error: e.message })
  }
})

server.listen(PORT, () => console.log(`Day One local API on http://localhost:${PORT} (Gemini ${process.env.GEMINI_API_KEY ? 'on' : 'off'}, voice ${voiceEnabled() ? 'ElevenLabs' : 'off'})`))
