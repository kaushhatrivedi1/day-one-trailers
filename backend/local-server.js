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
const SIGN_DIR = path.join(here, 'signs')
process.env.SIGN_DIR ||= SIGN_DIR
const SIGN_OUT = path.join(here, 'signs', '.out')
const signed = new Map() // lang|text -> result (persisted, so restarts don't spend model requests again)
const SIGN_CACHE = path.join(here, 'signs', '.cache.json')
const savedSigns = fs.existsSync(SIGN_CACHE) ? JSON.parse(fs.readFileSync(SIGN_CACHE, 'utf8')) : {}
for (const [k, v] of Object.entries(savedSigns)) if (v.motion || v.status === 'failed-check' || v.status === 'low-coverage') signed.set(k, Promise.resolve(v))
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
async function produce(id, { job, lang, profile, jd, jobPage }) {
  const t = trailers.get(id)
  try {
    t.stage = jd ? 'research' : 'script'
    const script = await writeScript({ jobId: id, job, lang, profile, jd, jobPage })
    t.stage = 'voice'
    Object.assign(t, { research: script.research, job: script.job, company: script.company, kit: script.kit, credits: script.credits, total: script.scenes.length })
    // ASL gloss for every scene, in parallel with the voice, so the sign window is ready on play.
    // Check every scene's signing in one blind back-translation batch, then build the videos.
    const withGloss = script.scenes.filter((s) => s.asl?.length)
    const signing = verifyGlosses(withGloss.map((s) => ({ text: s.narration, gloss: s.asl })))
      .catch(() => withGloss.map(() => ({ pass: false, score: 0, back: '' })))
      .then((checks) => Promise.all(script.scenes.map((s) => {
        const i = withGloss.indexOf(s)
        return signFor(s.narration, lang, s.asl, i >= 0 ? checks[i] : null).catch((e) => console.warn('sign failed', e.message))
      })))
      .then((rs) => console.log('signing:', rs.map((r) => r ? `${r.status}${r.check ? ' ' + r.check.score : ''}` : 'error').join(', ')))
    const voiced = await Promise.all(script.scenes.map(async (s) => {
      let v = { audioUrl: null, marks: null }
      if (voiceEnabled()) {
        try { v = await voice(s.narration) } catch (e) { console.warn('voice failed', e.message) }
      }
      return { title: s.title, narration: s.narration, screen: s.screen || '', index: s.index, ...v }
    }))
    await signing
    t.scenes = voiced.sort((a, b) => a.index - b.index)
    t.status = 'done'
    console.log(`trailer ${t.job} (${lang}) ready: ${t.scenes.length} scenes, voice ${voiceEnabled() ? 'on' : 'off'}`)
  } catch (e) {
    console.error('trailer failed', e)
    t.status = 'failed'
    t.error = e.message
  }
}

async function signFor(text, lang, gloss = null, check = null) {
  const k = lang + '|' + text
  if (!signed.has(k)) {
    signed.set(k, signLine(String(text).slice(0, 400), lang, SIGN_DIR, SIGN_OUT, gloss, check)
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
      if (looksLikeUrl(jd)) {
        try { jobPage = await readJobPage(jd); jd = jobPage.text } catch (e) { return send(res, 422, { error: `${e.message} Paste the job description text instead.` }) }
      }
      if (!job && jd.length < 40) return send(res, 400, { error: 'Tell us which job, or paste a job description.' })
      const lang = ['en', 'es', 'hi', 'ar', 'vi'].includes(body.lang) ? body.lang : 'en'
      const id = randomUUID()
      trailers.set(id, { status: 'running', job, jdText: jd, lang, total: 6, scenes: [], credits: null })
      produce(id, { job, lang, jd, jobPage: { company: jobPage.company, title: jobPage.title, url: jobPage.url, orgUrl: jobPage.orgUrl }, profile: String(body.profile || '').slice(0, 280) })
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
      const { text = '', lang = 'en' } = JSON.parse((await readBody(req)) || '{}')
      return send(res, 200, await signFor(text, lang))
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
    if (req.method === 'POST' && route.startsWith('/interview/')) {
      const out = await interview({ rawPath: route, body: await readBody(req) })
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
