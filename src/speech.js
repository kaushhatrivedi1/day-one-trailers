// Pick the most natural-sounding browser voice available for a language. Live mode uses Amazon Polly instead.
let cache = {}
export function pickVoice(lang) {
  if (!('speechSynthesis' in window)) return null
  if (cache[lang]) return cache[lang]
  const all = speechSynthesis.getVoices()
  const base = lang.slice(0, 2)
  const match = all.filter((v) => v.lang === lang || v.lang.startsWith(base))
  const score = (v) => (/natural|neural|online/i.test(v.name) ? 4 : 0) + (/google/i.test(v.name) ? 3 : 0) + (/samantha|aria|jenny|ava|allison|karen|moira/i.test(v.name) ? 2 : 0) + (v.lang === lang ? 1 : 0) + (v.localService ? 0 : 1)
  const best = match.sort((a, b) => score(b) - score(a))[0] || null
  if (best) cache[lang] = best
  return best
}
if (typeof window !== 'undefined' && 'speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => { cache = {} }

// Speak a line in a natural rhythm. Returns a stop function. onEnd always fires, even without a voice.
export function speak(text, lang, { onStart, onEnd } = {}) {
  let finished = false
  const end = () => { if (!finished) { finished = true; onEnd?.() } }
  if (!('speechSynthesis' in window)) { const t = setTimeout(end, Math.max(1800, text.length * 55)); return () => clearTimeout(t) }
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = lang
  const v = pickVoice(lang); if (v) u.voice = v
  u.rate = 0.97; u.pitch = 1.04
  u.onstart = () => onStart?.()
  u.onend = end
  u.onerror = end
  speechSynthesis.speak(u)
  const safety = setTimeout(end, Math.max(4000, text.length * 120) + 3000)
  return () => { clearTimeout(safety); finished = true; speechSynthesis.cancel() }
}
