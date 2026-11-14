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

// Bolt's host lines: what he says, and what he signs while saying it.
export const HOST = {
  intro: (job) => ({ text: `Hi! Here’s a day as a ${job}.`, tokens: ['HELLO', { spell: job.split(/\s+/).slice(-1)[0] }] }),
  ready: () => ({ text: 'Good job. Ready for your Screen Test?', tokens: ['GOOD', 'WORK', { spell: 'READY' }] }),
  good: () => ({ text: 'Good job. Thank you!', tokens: ['GOOD', 'WORK', 'THANK_YOU'] }),
  yes: () => ({ text: 'Yes! Let’s go.', tokens: ['YES'] }),
  thanks: () => ({ text: 'Thank you.', tokens: ['THANK_YOU'] }),
}
