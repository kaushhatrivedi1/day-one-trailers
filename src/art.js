// Procedural poster-style frames used when no image backend is connected.
// Each scene gets a deterministic illustration so the demo never looks empty.
const PALETTES = [
  ['#26102B', '#FF6B9A', '#FFD25A', '#2FD3C0'],
  ['#102A3B', '#2FD3C0', '#F6F3FF', '#FFD25A'],
  ['#2B1A10', '#FFD25A', '#FF6B9A', '#F6F3FF'],
  ['#1B1040', '#8E7BFF', '#FFD25A', '#FF6B9A'],
  ['#0F2B22', '#7DF0B5', '#FFD25A', '#F6F3FF'],
  ['#3A1030', '#FF6B9A', '#2FD3C0', '#FFD25A'],
]

function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
function rng(seed) {
  let s = seed || 1
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

export function sceneArt(seedText, index) {
  const seed = hash(seedText + ':' + index)
  const r = rng(seed)
  const [bg, a, b, c] = PALETTES[(hash(seedText) + index) % PALETTES.length]
  const W = 1280, H = 720
  const shapes = []

  // sun / spotlight
  const sx = 200 + r() * 880, sy = 120 + r() * 160, sr = 90 + r() * 120
  shapes.push(`<circle cx="${sx}" cy="${sy}" r="${sr}" fill="${b}" opacity="0.95"/>`)
  shapes.push(`<circle cx="${sx}" cy="${sy}" r="${sr * 1.6}" fill="${b}" opacity="0.12"/>`)

  // layered ridges
  const layers = [a, c, bg]
  layers.forEach((col, li) => {
    const base = 360 + li * 90
    let d = `M0 ${H} L0 ${base}`
    const steps = 9
    for (let i = 1; i <= steps; i++) {
      const x = (W / steps) * i
      const y = base + (r() - 0.5) * (120 - li * 25)
      d += ` Q ${x - W / steps / 2} ${y - 60 * r()} ${x} ${y}`
    }
    d += ` L${W} ${H} Z`
    shapes.push(`<path d="${d}" fill="${col}" opacity="${li === 2 ? 1 : 0.92}"/>`)
  })

  // figure silhouette
  const fx = 220 + r() * 840, fy = 470 + r() * 60
  shapes.push(`<g fill="${bg}"><circle cx="${fx}" cy="${fy - 70}" r="20"/><path d="M${fx - 26} ${fy + 60} Q${fx} ${fy - 60} ${fx + 26} ${fy + 60} Z"/></g>`)

  // stars / dust
  for (let i = 0; i < 26; i++) {
    shapes.push(`<circle cx="${r() * W}" cy="${r() * 300}" r="${0.8 + r() * 2}" fill="#F6F3FF" opacity="${0.3 + r() * 0.6}"/>`)
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice"><rect width="${W}" height="${H}" fill="${bg}"/>${shapes.join('')}</svg>`
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}
