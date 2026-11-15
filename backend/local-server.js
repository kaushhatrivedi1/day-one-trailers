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
async function produce(id, { job, lang, profile }) {
  const t = trailers.get(id)
  try {
    const script = await writeScript({ jobId: id, job, lang, profile })
    Object.assign(t, { kit: script.kit, credits: script.credits, total: script.scenes.length })
    const voiced = await Promise.all(script.scenes.map(async (s) => {
      let v = { audioUrl: null, marks: null }
      if (voiceEnabled()) {
        try { v = await voice(s.narration) } catch (e) { console.warn('voice failed', e.message) }
      }
      return { title: s.title, narration: s.narration, screen: s.screen || '', index: s.index, ...v }
    }))
    t.scenes = voiced.sort((a, b) => a.index - b.index)
    t.status = 'done'
    console.log(`trailer ${job} (${lang}) ready: ${t.scenes.length} scenes, voice ${voiceEnabled() ? 'on' : 'off'}`)
  } catch (e) {
    console.error('trailer failed', e)
    t.status = 'failed'
    t.error = e.message
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const route = url.pathname.replace(/^\/api/, '')
  try {
    if (req.method === 'POST' && route === '/trailer') {
      const body = JSON.parse((await readBody(req)) || '{}')
      const job = String(body.job || '').trim().slice(0, 80)
      if (!job) return send(res, 400, { error: 'Tell us which job.' })
      const lang = ['en', 'es', 'hi', 'ar', 'vi'].includes(body.lang) ? body.lang : 'en'
      const id = randomUUID()
      trailers.set(id, { status: 'running', job, lang, total: 6, scenes: [], credits: null })
      produce(id, { job, lang, profile: String(body.profile || '').slice(0, 280) })
      return send(res, 202, { id, status: 'running' })
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
