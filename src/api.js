import { mockTrailer, NOW_SHOWING, SCREEN_TEST, mockScore, FIGURES, jobKey } from './mock.js'
import { sceneArt } from './art.js'

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
export const usingDemoData = !BASE

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function post(path, body) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${path} failed (${res.status})`)
  return res.json()
}

// Calls onScene(index, scene) as each scene becomes ready so the UI can show progress.
export async function createTrailer({ job, lang, profile }, onScene) {
  if (BASE) {
    const { id } = await post('/trailer', { job, lang, profile })
    let seen = 0
    const started = Date.now()
    for (;;) {
      await wait(1200)
      const res = await fetch(`${BASE}/trailer/${id}`)
      if (!res.ok) throw new Error('The trailer was lost on the way. Try again.')
      const data = await res.json()
      // A frame that failed the safety check has no image; draw a stand-in so the reel keeps playing.
      const scenes = data.scenes.map((s, i) => ({ ...s, image: s.image || sceneArt(job.toLowerCase(), i) }))
      for (; seen < scenes.length; seen++) onScene?.(seen, scenes[seen])
      if (data.status === 'failed') throw new Error('The studio could not finish this one.')
      if (data.status === 'done') {
        // Featured jobs carry official BLS figures; they beat anything the model wrote.
        const figures = FIGURES[jobKey(job)]
        const credits = { ...data.credits, ...(figures ? { figures, pay: undefined, outlook: undefined, source: undefined } : {}) }
        return { ...data, scenes, credits, kit: figures?.kit || data.kit || 'general', job: data.job || job, lang, translated: true }
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
export async function interviewNext({ job, lang, resume, history }) {
  return post('/interview/next', { job, lang, resume, history })
}
export async function interviewFeedback({ job, lang, resume, history }) {
  return post('/interview/feedback', { job, lang, resume, history })
}
