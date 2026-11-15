// ElevenLabs narration: one multilingual voice for every language, with per-character timings
// that we group into words for the karaoke captions ({ time: ms, value: word }).
// Docs: POST /v1/text-to-speech/{voice_id}/with-timestamps -> { audio_base64, alignment }.
const VOICE = process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb'
const MODEL = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2'

export const voiceEnabled = () => !!process.env.ELEVENLABS_API_KEY

export function wordsFromAlignment(a) {
  const marks = []
  if (!a?.characters) return marks
  let word = ''
  let start = 0
  a.characters.forEach((ch, i) => {
    if (/\s/.test(ch)) {
      if (word) marks.push({ time: Math.round(start * 1000), value: word })
      word = ''
      return
    }
    if (!word) start = a.character_start_times_seconds[i]
    word += ch
  })
  if (word) marks.push({ time: Math.round(start * 1000), value: word })
  return marks
}

// The plan allows only 2 requests at once, so queue them and retry when ElevenLabs says it is busy.
const MAX_AT_ONCE = Number(process.env.ELEVENLABS_CONCURRENCY || 2)
let running = 0
const waiting = []
async function slot(fn) {
  if (running >= MAX_AT_ONCE) await new Promise((r) => waiting.push(r))
  running++
  try { return await fn() } finally { running--; waiting.shift()?.() }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export async function speakEleven(text) {
  const key = process.env.ELEVENLABS_API_KEY
  if (!key) throw new Error('ELEVENLABS_API_KEY is not set')
  for (let attempt = 0; ; attempt++) {
    const res = await slot(() => fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}/with-timestamps`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model_id: MODEL, voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.35 } }),
      signal: AbortSignal.timeout(45000),
    }).then(async (r) => ({ ok: r.ok, status: r.status, body: r.ok ? await r.json() : await r.text() })))
    if (res.ok) return { bytes: Buffer.from(res.body.audio_base64, 'base64'), marks: wordsFromAlignment(res.body.alignment) }
    if (res.status === 429 && attempt < 4) { await sleep(800 * (attempt + 1)); continue }
    throw new Error(`ElevenLabs ${res.status}: ${String(res.body).slice(0, 200)}`)
  }
}
