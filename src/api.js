import { mockTrailer, NOW_SHOWING, SCREEN_TEST, mockScore, FIGURES, jobKey } from './mock.js'
import { sceneArt } from './art.js'

// The API base: VITE_API_URL if set (AWS or /api), otherwise the local API if it answers at /api.
// Detected once before the app renders (see main.jsx), so `npm run dev` gets every feature
// whenever `npm run api` is running, and falls back to demo data when it isn't.
export let BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
export let usingDemoData = !BASE
export async function detectApi() {
  if (BASE) return BASE
  try {
    const r = await fetch('/api/health', { signal: AbortSignal.timeout(1500) })
    const ok = r.ok && (r.headers.get('content-type') || '').includes('json') && (await r.json()).ok
    if (ok) { BASE = '/api'; usingDemoData = false }
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
export async function createTrailer({ job, jd, lang, profile, guest }, onScene, onStage) {
  if (BASE) {
    const { id, jdText } = await post('/trailer', { job, jd, lang, profile, guest })
    if (jdText) jd = jdText
    let seen = 0
    const started = Date.now()
    for (;;) {
      await wait(1200)
      const res = await fetch(`${BASE}/trailer/${id}`)
      if (!res.ok) throw new Error('The trailer was lost on the way. Try again.')
      const data = await res.json()
      onStage?.(data.stage, data.job)
      // A frame that failed the safety check has no image; draw a stand-in so the reel keeps playing.
      const scenes = data.scenes.map((s, i) => ({ ...s, image: s.image || sceneArt((data.job || job || 'job').toLowerCase(), i) }))
      for (; seen < scenes.length; seen++) onScene?.(seen, scenes[seen])
      if (data.status === 'failed') throw new Error('The studio could not finish this one.')
      if (data.status === 'done') {
        // Featured jobs carry official BLS figures; they beat anything the model wrote.
        const figures = FIGURES[jobKey(data.job || job)]
        const credits = { ...data.credits, ...(figures ? { figures, pay: undefined, outlook: undefined, source: undefined } : {}) }
        return { ...data, scenes, credits, kit: figures?.kit || data.kit || 'general', job: data.job || job, jd, lang, translated: true }
      }
      if (Date.now() - started > 150000) throw new Error('This is taking too long.')
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
export function signText(text, lang) {
  if (!BASE || !text) return Promise.resolve(null)
  const k = lang + '|' + text
  if (!signCache.has(k)) signCache.set(k, post('/sign', { text, lang }).catch(() => null))
  return signCache.get(k)
}

// Bolt's welcome-back line for a returning visitor (Supermemory). null for a first visit.
export async function memoryGreeting({ guest, lang }) {
  if (!BASE || !guest) return null
  return post('/memory/greeting', { guest, lang }).catch(() => null)
}
