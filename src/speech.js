// Speaking a line in the viewer's language.
// 1. With an API (local or AWS), ElevenLabs speaks it natively and returns word timings.
// 2. Otherwise the browser voice is used, but only if one exists for that language. Using an English
//    voice for Hindi text is what produced the "wrong accent" problem, so with no match we stay
//    silent and let the captions carry the line.
import { langInfo } from './i18n.js'

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const cache = new Map()

let voices = {}
function pickVoice(tag) {
  if (!('speechSynthesis' in window)) return null
  if (voices[tag] !== undefined) return voices[tag]
  const base = tag.slice(0, 2)
  const match = speechSynthesis.getVoices().filter((v) => v.lang === tag || v.lang.replace('_', '-').startsWith(base))
  const score = (v) => (/natural|neural|online|premium|enhanced/i.test(v.name) ? 4 : 0) + (/google/i.test(v.name) ? 3 : 0) + (v.lang === tag ? 1 : 0)
  voices[tag] = match.sort((a, b) => score(b) - score(a))[0] || null
  return voices[tag]
}
if (typeof window !== 'undefined' && 'speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => { voices = {} }

async function fetchLine(text, lang) {
  const k = lang + '|' + text
  if (!cache.has(k)) {
    cache.set(k, fetch(`${BASE}/speak`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, lang }) })
      .then((r) => (r.ok ? r.json() : null)).catch(() => null))
  }
  return cache.get(k)
}

// Start fetching a line before it is needed, so it plays without a gap.
export const preload = (text, lang) => (BASE ? fetchLine(text, lang) : null)

// Returns a stop function. onEnd always fires once. onWord(i) gets the index of the word being spoken.
export function speak(text, lang, { onStart, onEnd, onWord } = {}) {
  let finished = false
  let stopped = false
  let audio = null
  let timers = []
  const end = () => { if (!finished) { finished = true; onEnd?.() } }
  const words = text.split(/\s+/)
  const timed = (ms) => {
    // No voice: move the caption along at reading speed.
    onStart?.()
    words.forEach((_, i) => timers.push(setTimeout(() => onWord?.(i), i * ms)))
    timers.push(setTimeout(end, words.length * ms + 600))
  }

  if (BASE) {
    fetchLine(text, lang).then((line) => {
      if (stopped) return
      if (!line?.audioUrl) return browser()
      audio = new Audio(line.audioUrl)
      audio.onplay = () => onStart?.()
      audio.onended = end
      audio.onerror = end
      audio.ontimeupdate = () => {
        const ms = audio.currentTime * 1000
        let idx = -1
        ;(line.marks || []).forEach((m, k) => { if (m.time <= ms) idx = k })
        onWord?.(Math.min(idx, words.length - 1))
      }
      audio.play().catch(() => timed(380))
    })
  } else browser()

  function browser() {
    const tag = langInfo(lang).voice
    const v = pickVoice(tag)
    if (!v || !('speechSynthesis' in window)) return timed(380)
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = tag; u.voice = v; u.rate = 0.97; u.pitch = 1.04
    u.onstart = () => onStart?.()
    u.onend = end
    u.onerror = end
    u.onboundary = (e) => { if (e.name === 'word') onWord?.(text.slice(0, e.charIndex).split(/\s+/).length - 1) }
    speechSynthesis.speak(u)
    timers.push(setTimeout(end, Math.max(4000, text.length * 120) + 3000))
  }

  return () => {
    stopped = true
    finished = true
    timers.forEach(clearTimeout)
    audio?.pause()
    if ('speechSynthesis' in window) speechSynthesis.cancel()
  }
}
