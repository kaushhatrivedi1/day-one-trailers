import { mockTrailer, NOW_SHOWING, SCREEN_TEST, mockScore, FIGURES, jobKey } from './mock.js'
import { strings } from './i18n.js'
import { sceneArt } from './art.js'

// The API base: VITE_API_URL if set (AWS or /api), otherwise the local API if it answers at /api.
// Detected once before the app renders (see main.jsx), so `npm run dev` gets every feature
// whenever `npm run api` is running, and falls back to demo data when it isn't.
export let BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
export let usingDemoData = !BASE
// Sign language needs an API with the sign service: the local API, or the hosted one (POST /sign on AWS).
// Demo mode (no API) has no sign service.
export let canSign = !!BASE
// The local API narrates with ElevenLabs; the hosted one uses Amazon Polly (credits line).
export let localApi = false
export async function detectApi() {
  if (BASE) return BASE
  try {
    const r = await fetch('/api/health', { signal: AbortSignal.timeout(1500) })
    const ok = r.ok && (r.headers.get('content-type') || '').includes('json') && (await r.json()).ok
    if (ok) { BASE = '/api'; usingDemoData = false; canSign = true; localApi = true }
  } catch { /* no local API: demo mode */ }
  return BASE
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function post(path, body) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const msg = await res.json().then((d) => d.error).catch(() => null)
    throw new Error(msg || `${path} failed (${res.status})`)
  }
  return res.json()
}

// Calls onScene(index, scene) as each scene becomes ready so the UI can show progress.
export async function createTrailer({ job, jd, lang, profile, guest, genre }, onScene, onStage) {
  if (BASE) {
    const { id, jdText } = await post('/trailer', { job, jd, lang, profile, guest, genre })
    if (jdText) jd = jdText
    let seen = 0
    const started = Date.now()
    for (;;) {
      await wait(1200)
      const res = await fetch(`${BASE}/trailer/${id}`)
      if (!res.ok) throw new Error(strings(lang).errLost)
      const data = await res.json()
      onStage?.(data)
      // A frame that failed the safety check has no image; draw a stand-in so the reel keeps playing.
      const scenes = data.scenes.map((s, i) => ({ ...s, image: s.image || sceneArt((data.job || job || 'job').toLowerCase(), i) }))
      for (; seen < scenes.length; seen++) onScene?.(seen, scenes[seen])
      if (data.status === 'failed') throw new Error(strings(lang).errFailed)
      if (data.status === 'done') {
        // Featured jobs carry official BLS figures; they beat anything the model wrote.
        const figures = FIGURES[jobKey(data.job || job)]
        const credits = { ...data.credits, ...(figures ? { figures, pay: undefined, outlook: undefined, source: undefined } : {}) }
        return { ...data, scenes, credits, kit: figures?.kit || data.kit || 'general', job: data.job || job, jd, lang, translated: true }
      }
      if (Date.now() - started > 150000) throw new Error(strings(lang).errSlow)
    }
  }
  const data = mockTrailer(job, lang)
  for (let i = 0; i < data.scenes.length; i++) {
    await wait(650 + Math.random() * 400)
    onScene?.(i, data.scenes[i])
  }
  await wait(400)
  return data
}

export async function getNowShowing() {
  if (BASE) {
    try {
      const res = await fetch(BASE + '/now-showing')
      if (res.ok) {
        const list = await res.json()
        if (list.length) return list
      }
    } catch { /* fall through to demo data */ }
  }
  return NOW_SHOWING
}

export async function getScreenTest({ job, lang }) {
  if (BASE) return post('/screentest/start', { job, lang })
  return { questions: SCREEN_TEST(job) }
}

export async function scoreScreenTest({ job, lang, answers }) {
  if (BASE) return post('/screentest/score', { job, lang, answers })
  await wait(900)
  return mockScore(answers)
}

// Adaptive interview (needs the API: local or AWS).
export async function interviewNext({ job, jd, lang, resume, history, guest }) {
  return post('/interview/next', { job, jd, lang, resume, history, guest })
}
export async function interviewFeedback({ job, jd, lang, resume, history, guest }) {
  return post('/interview/feedback', { job, jd, lang, resume, history, guest })
}

// Text -> ASL: gloss always; a stitched video when the sign library covers the sentence.
const signCache = new Map()
export function signText(text, lang, simple = false) {
  if (!BASE || !text) return Promise.resolve(null)
  const k = lang + '|' + text
  if (!signCache.has(k)) signCache.set(k, post('/sign', { text, lang, simple }).catch(() => null))
  return signCache.get(k)
}

// Bolt's welcome-back line for a returning visitor (Supermemory). null for a first visit.
export async function memoryGreeting({ guest, lang }) {
  if (!BASE || !guest) return null
  return post('/memory/greeting', { guest, lang }).catch(() => null)
}

// Lobby company card: research for a pasted posting or link (cached on the server for the trailer).
export async function companyPreview({ jd, lang }) {
  if (!BASE || !jd) return null
  return post('/company/preview', { jd, lang })
}
