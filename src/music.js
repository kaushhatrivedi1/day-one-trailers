// Trailer music made in the browser with WebAudio: a small step sequencer whose tempo, scale,
// instrument and drums follow the genre the viewer picked. Nothing is downloaded.
const MUSIC = {
  action: { bpm: 140, root: 45, scale: [0, 3, 7, 10], wave: 'sawtooth', kick: 'x.x.x.x.', snare: '..x...x.', hat: 'xxxxxxxx', bass: [0, 0, 3, 0, 5, 0, 3, 7], lead: 0.05, len: 0.9 },
  documentary: { bpm: 78, root: 50, scale: [0, 4, 7, 11], wave: 'sine', kick: 'x.......', snare: '........', hat: '..x...x.', bass: [0, , , , 5, , , ], pad: true },
  comedy: { bpm: 124, root: 53, scale: [0, 4, 7, 12], wave: 'square', kick: 'x...x...', snare: '..x...x.', hat: '.x.x.x.x', bass: [0, , 7, , 5, , 7, ], lead: 0.06, len: 0.3 },
  feelgood: { bpm: 96, root: 48, scale: [0, 4, 7, 9], wave: 'triangle', kick: 'x.....x.', snare: '....x...', hat: 'x.x.x.x.', bass: [0, , , 4, , , 5, ], lead: 0.08, len: 0.9 },
}
export const GENRES = Object.keys(MUSIC)
// The mini game while the trailer is made: a bright, bouncy chiptune loop.
const EXTRA = {
  game: { bpm: 152, root: 57, scale: [0, 4, 7, 12], wave: 'square', kick: 'x...x...', snare: '....x...', hat: 'x.x.x.x.', bass: [0, , 7, , 0, , 7, 5], lead: 0.035, len: 0.35 },
}

let ctx, master, noiseBuf, loop, step = 0, next = 0, genre = 'feelgood', volume = 0.35

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12)
const env = (g, t, a, d, v) => { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d) }
const tone = (f, t, d, type, v) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f; env(g, t, 0.01, d, v); o.connect(g).connect(master); o.start(t); o.stop(t + d + 0.05) }
const kick = (t) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15); env(g, t, 0.002, 0.25, 0.8); o.connect(g).connect(master); o.start(t); o.stop(t + 0.3) }
const noise = (t, d, hp, v) => { const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = hp; env(g, t, 0.001, d, v); s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + d + 0.05) }

function schedule() {
  const m = MUSIC[genre] || EXTRA[genre] || MUSIC.feelgood, dur = 60 / m.bpm / 2
  while (next < ctx.currentTime + 0.15) {
    const i = step % 8, bar = Math.floor(step / 8) % 4, chord = [0, 5, 3, 4][bar]
    if (m.kick[i] === 'x') kick(next)
    if (m.snare[i] === 'x') noise(next, 0.18, 1500, 0.3)
    if (m.hat[i] === 'x') noise(next, 0.04, 7000, 0.1)
    if (m.bass[i] !== undefined) tone(midi(m.root - 12 + m.bass[i] + chord), next, dur * 1.6, m.wave === 'sine' ? 'sine' : 'triangle', 0.28)
    if (m.pad) { if (i === 0) m.scale.forEach((n) => tone(midi(m.root + n + chord), next, dur * 7, 'sine', 0.06)) }
    else tone(midi(m.root + 12 + m.scale[(step + bar) % 4] + chord), next, dur * m.len, m.wave, m.lead)
    next += dur; step++
  }
}

function init() {
  if (typeof window === 'undefined' || !window.AudioContext) return false
  if (!ctx) {
    ctx = new AudioContext(); master = ctx.createGain(); master.connect(ctx.destination)
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  return true
}

export function startMusic(g, vol) {
  if (!init()) return
  if (g) genre = g
  volume = vol ?? 0.35
  master.gain.setTargetAtTime(volume, ctx.currentTime, 0.3)
  ctx.resume()
  if (!loop) { next = ctx.currentTime + 0.05; loop = setInterval(schedule, 50) }
}
export function setGenre(g) { if (MUSIC[g]) genre = g }
// Quieter under narration, louder between lines.
export function duck(on) { volume = on ? 0.12 : 0.35; if (ctx) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.25) }
export function stopMusic() {
  if (!ctx || !loop) return
  master.gain.setTargetAtTime(0, ctx.currentTime, 0.3)
  clearInterval(loop); loop = null
}

// Short game sounds: a jump blip, a coin ping, a bump.
export function sfx(kind) {
  if (!init() || ctx.state !== 'running') return
  const t = ctx.currentTime, out = ctx.destination
  const blip = (f1, f2, at, d, type, v) => {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type
    o.frequency.setValueAtTime(f1, t + at); o.frequency.exponentialRampToValueAtTime(f2, t + at + d)
    g.gain.setValueAtTime(v, t + at); g.gain.exponentialRampToValueAtTime(0.0001, t + at + d)
    o.connect(g).connect(out); o.start(t + at); o.stop(t + at + d + 0.02)
  }
  if (kind === 'jump') blip(330, 660, 0, 0.14, 'square', 0.06)
  if (kind === 'coin') { blip(988, 988, 0, 0.07, 'square', 0.05); blip(1319, 1319, 0.07, 0.16, 'square', 0.05) }
  if (kind === 'hit') blip(180, 60, 0, 0.22, 'sawtooth', 0.08)
}
