// Signing for Bolt's own host lines. Each sign is a list of keyframes: where the wrists go, the handshape, how long to hold.
// IMPORTANT: these are hand-authored and have not been reviewed by a Deaf signer or interpreter. They are a good-faith
// attempt, covered by captions, and should be reviewed before the demo. See README, "Sign language".
const F = (rw, rs, rr, ms, extra = {}) => ({ rw, rs, rr, ms, ...extra })

export const SIGNS = {
  // flat hand salutes outward from the forehead
  HELLO: [F([196, 66], 'FLAT', 24, 380), F([252, 54], 'FLAT', 42, 420)],
  // flat hand starts at the chin and moves forward and down
  THANK_YOU: [F([168, 200], 'FLAT', -14, 420), F([212, 238], 'FLAT', 28, 460)],
  // flat hand from the chin lands on the other flat hand
  GOOD: [F([168, 200], 'FLAT', -14, 380), F([140, 240], 'FLAT', 80, 480, { lw: [112, 250], ls: 'FLAT', lr: -80 })],
  // a fist nods
  YES: [F([214, 204], 'FIST', 0, 260), F([214, 230], 'FIST', 0, 220), F([214, 204], 'FIST', 0, 220), F([214, 230], 'FIST', 0, 320)],
  // index finger points to the signer's own chest (I / me)
  'IX-1': [F([168, 212], 'POINT', 200, 520)],
  // index finger points out at the viewer (you)
  'IX-2': [F([214, 178], 'POINT', 0, 520)],
  // right fist taps on the left fist
  WORK: [F([140, 190], 'FIST', 0, 300, { lw: [118, 226], ls: 'FIST', lr: 0 }), F([130, 214], 'FIST', 0, 200, { lw: [118, 226], ls: 'FIST', lr: 0 }), F([140, 190], 'FIST', 0, 220, { lw: [118, 226], ls: 'FIST', lr: 0 }), F([130, 214], 'FIST', 0, 320, { lw: [118, 226], ls: 'FIST', lr: 0 })],
}

const SPELL_AT = [216, 150]
export function fingerspell(word) {
  const frames = []
  let prev = ''
  for (const ch of word.toUpperCase().replace(/[^A-Z]/g, '')) {
    const nudge = ch === prev ? 12 : 0 // repeat letters shift slightly so the double reads
    frames.push(F([SPELL_AT[0] + nudge, SPELL_AT[1]], ch, 0, ch === 'J' || ch === 'Z' ? 560 : 520))
    if (ch === 'J') frames.push(F([SPELL_AT[0], SPELL_AT[1] + 12], 'J', -24, 260))
    if (ch === 'Z') { frames.push(F([SPELL_AT[0] + 14, SPELL_AT[1]], 'Z', 0, 160)); frames.push(F([SPELL_AT[0] - 6, SPELL_AT[1] + 14], 'Z', 0, 160)); frames.push(F([SPELL_AT[0] + 14, SPELL_AT[1] + 14], 'Z', 0, 220)) }
    prev = ch
  }
  return frames
}

// ASL gloss (from the sign pipeline) -> Bolt's keyframes. Bolt only knows a few signs, so he signs those,
// fingerspells FS: names up to 8 letters, and reports which glosses he could not sign.
const SAME = { HI: 'HELLO', THANKS: 'THANK_YOU', ME: 'IX-1', I: 'IX-1', YOU: 'IX-2', 'IX-1P': 'IX-1', 'IX-2P': 'IX-2', FINE: 'GOOD' }
export function glossFrames(gloss) {
  const frames = []
  const signed = []
  gloss.forEach((g, gi) => {
    const key = SAME[g] || g.replace(/-/g, '_')
    const word = g.startsWith('FS:') ? g.slice(3) : ''
    const token = SIGNS[key] ? key : SIGNS[g] ? g : word && /^[A-Z]{1,8}$/.test(word) ? { spell: word } : null
    if (!token) return
    signed.push(gi)
    frames.push(...framesFor([token]).map((f) => ({ ...f, gloss: gi })))
  })
  return { frames, signed }
}

// tokens: 'HELLO' | { spell: 'LINEWORKER' }
export function framesFor(tokens) {
  const out = []
  for (const t of tokens) {
    const f = typeof t === 'string' ? SIGNS[t] : fingerspell(t.spell)
    const name = typeof t === 'string' ? t.replace('_', ' ') : null
    if (f) out.push(...f.map((fr) => ({ ...fr, label: fr.label || name || fr.rs })), { pause: 140 })
  }
  return out
}

// Bolt's host lines: the words come from i18n (any language); the signs are ASL.
// Fingerspelling only works for Latin letters, so non-Latin job names get the WORK sign instead.
const latin = (w) => /^[A-Za-z\s-]+$/.test(w)
export const HOST = {
  intro: (t, job) => ({ text: t.hostIntro(job), tokens: ['HELLO', latin(job) ? { spell: job.split(/\s+/).slice(-1)[0] } : 'WORK'] }),
  ready: (t) => ({ text: t.hostReady, tokens: ['GOOD', 'WORK', { spell: 'READY' }] }),
  good: (t) => ({ text: t.hostThanks, tokens: ['GOOD', 'WORK', 'THANK_YOU'] }),
}
